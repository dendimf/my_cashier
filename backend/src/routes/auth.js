const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const supabase = require('../config/supabase')
const auth = require('../middleware/auth')

const router = express.Router()

// Generate JWT token
const generateToken = (user) => {
    const secret = process.env.JWT_SECRET
    if (!secret) {
        console.error('❌ CRITICAL ERROR: JWT_SECRET is missing from environment variables!')
    }
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        secret || 'kasirku-temporary-secret-key-32-chars-at-least',
        { expiresIn: process.env.JWT_EXPIRY || '24h' }
    )
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, full_name, phone } = req.body
        if (!email || !password || !full_name) {
            return res.status(400).json({ success: false, error: 'Email, password, and full name are required' })
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' })
        }

        // Check if email exists
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single()

        if (existing) {
            return res.status(409).json({ success: false, error: 'Email already registered' })
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10)

        // Create user
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert({ email: email.toLowerCase(), full_name, phone: phone || null, role: 'owner' })
            .select()
            .single()

        if (userError) throw userError

        // Store password
        const { error: passErr } = await supabase
            .from('auth_passwords')
            .insert({ user_id: user.id, password_hash: passwordHash })
        if (passErr) throw passErr

        // Create free subscription
        const { error: subErr } = await supabase
            .from('subscriptions')
            .insert({
                user_id: user.id,
                plan: 'free',
                status: 'active',
                transaction_limit: 50,
                outlet_limit: 1,
                staff_limit: 1
            })
        if (subErr) throw subErr

        const token = generateToken(user)
        return res.status(201).json({
            success: true,
            data: { access_token: token, expires_in: 86400, user }
        })
    } catch (err) {
        console.error('Register error:', err)
        // If it's a supabase error, it might have more details in the message or details property
        const errorMessage = err.message || (typeof err === 'string' ? err : 'Failed to register')
        res.status(500).json({ success: false, error: errorMessage })
    }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' })
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('*, auth_passwords(password_hash)')
            .eq('email', email.toLowerCase())
            .single()

        console.log('🔍 Login attempt for:', email.toLowerCase())
        if (error) {
            console.error('❌ Supabase error during login:', error)
            const isConnectionError = error.code === 'ENOTFOUND' ||
                error.message?.includes('ENOTFOUND') ||
                error.message?.includes('fetch')

            if (isConnectionError) {
                return res.status(503).json({
                    success: false,
                    error: 'Database connection failed. Please check your internet connection and DNS settings.'
                })
            }
            return res.status(401).json({ success: false, error: 'Invalid email or password' })
        }

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' })
        }

        if (!user.is_active) {
            return res.status(403).json({ success: false, error: 'Account is disabled' })
        }

        // Handle both possible structures of joined data
        let passwordHash = ''
        if (Array.isArray(user.auth_passwords)) {
            passwordHash = user.auth_passwords[0]?.password_hash || ''
        } else if (user.auth_passwords) {
            passwordHash = user.auth_passwords.password_hash || ''
        }

        if (!passwordHash) {
            console.error('❌ Password hash not found for user!')
            return res.status(401).json({ success: false, error: 'Invalid email or password' })
        }

        const valid = await bcrypt.compare(password, passwordHash)
        console.log('🔐 Password check:', valid ? '✅ Valid' : '❌ Invalid')
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' })
        }

        // Clean user object
        delete user.auth_passwords
        const token = generateToken(user)

        return res.json({
            success: true,
            data: { access_token: token, expires_in: 86400, user }
        })
    } catch (err) {
        console.error('Login error:', err)
        res.status(500).json({ success: false, error: 'Login failed' })
    }
})

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', req.user.id)
            .single()

        if (error || !user) {
            return res.status(404).json({ success: false, error: 'User not found' })
        }

        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', req.user.id)
            .single()

        return res.json({ success: true, data: { user, subscription } })
    } catch (err) {
        console.error('GetMe error:', err)
        res.status(500).json({ success: false, error: 'Failed to fetch profile' })
    }
})

// PUT /api/auth/profile
router.put('/profile', auth, async (req, res) => {
    try {
        const { full_name, phone, avatar_url } = req.body
        const updates = {}
        if (full_name !== undefined) updates.full_name = full_name
        if (phone !== undefined) updates.phone = phone
        if (avatar_url !== undefined) updates.avatar_url = avatar_url
        updates.updated_at = new Date().toISOString()

        const { data: user, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', req.user.id)
            .select()
            .single()

        if (error) throw error
        return res.json({ success: true, data: user })
    } catch (err) {
        console.error('UpdateProfile error:', err)
        res.status(500).json({ success: false, error: 'Failed to update profile' })
    }
})

// POST /api/auth/change-password
router.post('/change-password', auth, async (req, res) => {
    try {
        const { current_password, new_password } = req.body
        if (!current_password || !new_password) {
            return res.status(400).json({ success: false, error: 'Both passwords are required' })
        }
        if (new_password.length < 8) {
            return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' })
        }

        const { data: authPass } = await supabase
            .from('auth_passwords')
            .select('password_hash')
            .eq('user_id', req.user.id)
            .single()

        if (!authPass) {
            return res.status(404).json({ success: false, error: 'User auth data not found' })
        }

        const valid = await bcrypt.compare(current_password, authPass.password_hash)
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Current password is incorrect' })
        }

        const newHash = await bcrypt.hash(new_password, 10)
        await supabase
            .from('auth_passwords')
            .update({ password_hash: newHash, updated_at: new Date().toISOString() })
            .eq('user_id', req.user.id)

        return res.json({ success: true, message: 'Password changed successfully' })
    } catch (err) {
        console.error('ChangePassword error:', err)
        res.status(500).json({ success: false, error: 'Failed to change password' })
    }
})

// GET /api/stores/:storeId/staff
router.get('/:storeId/staff', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { data, error } = await supabase
            .from('staff')
            .select('*, users!staff_user_id_fkey(*)')
            .eq('store_id', storeId)
            .eq('is_active', true)

        if (error) throw error
        const staffList = data.map(s => ({
            ...s.users,
            staff_role: s.role,
            staff_id: s.id
        }))
        return res.json({ success: true, data: staffList })
    } catch (err) {
        console.error('ListStaff error:', err)
        res.status(500).json({ success: false, error: 'Failed to fetch staff' })
    }
})

// POST /api/stores/:storeId/staff
router.post('/:storeId/staff', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { email, password, full_name, role } = req.body

        if (!email || !password || !full_name || !role) {
            return res.status(400).json({ success: false, error: 'All fields required' })
        }

        // Check staff limit
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('staff_limit')
            .eq('user_id', req.user.id)
            .single()

        const { count: staffCount } = await supabase
            .from('staff')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', req.user.id)
            .eq('is_active', true)

        // Give a bit more room or handle missing limit
        const limit = sub?.staff_limit || 2
        if (staffCount >= limit && limit > 0) {
            return res.status(403).json({ success: false, error: `Staff limit reached (${limit}). Please upgrade your plan.` })
        }

        // Check email exists
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single()

        if (existing) {
            return res.status(409).json({ success: false, error: 'Email already registered' })
        }

        const passwordHash = await bcrypt.hash(password, 10)

        // Create user with base role 'staff'
        const { data: staffUser, error: userErr } = await supabase
            .from('users')
            .insert({ email: email.toLowerCase(), full_name, role: 'staff' })
            .select()
            .single()

        if (userErr) throw userErr

        await supabase.from('auth_passwords').insert({ user_id: staffUser.id, password_hash: passwordHash })
        await supabase.from('staff').insert({
            user_id: staffUser.id,
            store_id: storeId,
            owner_id: req.user.id,
            role
        })

        return res.status(201).json({ success: true, data: staffUser })
    } catch (err) {
        console.error('CreateStaff error:', err)
        res.status(500).json({ success: false, error: 'Failed to create staff' })
    }
})

module.exports = router
