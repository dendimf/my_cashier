const express = require('express')
const supabase = require('../config/supabase')
const auth = require('../middleware/auth')

const router = express.Router()

// GET /api/stores
router.get('/', auth, async (req, res) => {
    try {
        // Get stores owned by user
        const { data: ownedStores, error: ownedErr } = await supabase
            .from('stores')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (ownedErr) throw ownedErr

        // Get stores where user is staff
        const { data: staffStores, error: staffErr } = await supabase
            .from('staff')
            .select('stores(*)')
            .eq('user_id', req.user.id)
            .eq('is_active', true)

        if (staffErr) throw staffErr

        const staffStoreList = (staffStores || []).map(s => s.stores).filter(Boolean)
        const allStores = [...(ownedStores || []), ...staffStoreList]

        return res.json({ success: true, data: allStores })
    } catch (err) {
        console.error('ListStores error:', err)
        res.status(500).json({ success: false, error: 'Failed to fetch stores' })
    }
})

// POST /api/stores
router.post('/', auth, async (req, res) => {
    try {
        const { name, address, phone, email } = req.body
        if (!name) return res.status(400).json({ success: false, error: 'Store name is required' })

        // Check outlet limit
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('outlet_limit')
            .eq('user_id', req.user.id)
            .single()

        const { count } = await supabase
            .from('stores')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.user.id)
            .eq('is_active', true)

        if (sub && sub.outlet_limit > 0 && count >= sub.outlet_limit) {
            return res.status(403).json({ success: false, error: 'Outlet limit reached. Please upgrade your plan.' })
        }

        const { data: store, error } = await supabase
            .from('stores')
            .insert({ user_id: req.user.id, name, address, phone, email })
            .select()
            .single()

        if (error) throw error
        return res.status(201).json({ success: true, data: store })
    } catch (err) {
        console.error('CreateStore error:', err)
        res.status(500).json({ success: false, error: 'Failed to create store' })
    }
})

// GET /api/stores/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const { data: store, error } = await supabase
            .from('stores')
            .select('*')
            .eq('id', req.params.id)
            .single()

        if (error || !store) return res.status(404).json({ success: false, error: 'Store not found' })
        return res.json({ success: true, data: store })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch store' })
    }
})

// PUT /api/stores/:id
router.put('/:id', auth, async (req, res) => {
    try {
        const { name, address, phone, email, logo_url, whatsapp_api_key, whatsapp_provider, tax_rate } = req.body
        const updates = { updated_at: new Date().toISOString() }
        if (name !== undefined) updates.name = name
        if (address !== undefined) updates.address = address
        if (phone !== undefined) updates.phone = phone
        if (email !== undefined) updates.email = email
        if (logo_url !== undefined) updates.logo_url = logo_url
        if (whatsapp_api_key !== undefined) updates.whatsapp_api_key = whatsapp_api_key
        if (whatsapp_provider !== undefined) updates.whatsapp_provider = whatsapp_provider
        if (tax_rate !== undefined) updates.tax_rate = tax_rate

        const { data: store, error } = await supabase
            .from('stores')
            .update(updates)
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .select()
            .single()

        if (error) throw error
        return res.json({ success: true, data: store })
    } catch (err) {
        console.error('UpdateStore error:', err)
        res.status(500).json({ success: false, error: 'Failed to update store' })
    }
})

// DELETE /api/stores/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const { error } = await supabase
            .from('stores')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)

        if (error) throw error
        return res.json({ success: true, message: 'Store deleted' })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to delete store' })
    }
})

// POST /api/stores/:id/reset-database
router.post('/:id/reset-database', auth, async (req, res) => {
    try {
        const storeId = req.params.id
        // Verify ownership
        const { data: store } = await supabase
            .from('stores')
            .select('id')
            .eq('id', storeId)
            .eq('user_id', req.user.id)
            .single()

        if (!store) return res.status(403).json({ success: false, error: 'Unauthorized' })

        // Delete all store data (cascades will handle children)
        await supabase.from('transactions').delete().eq('store_id', storeId)
        await supabase.from('products').delete().eq('store_id', storeId)
        await supabase.from('customers').delete().eq('store_id', storeId)
        await supabase.from('categories').delete().eq('store_id', storeId)

        return res.json({ success: true, message: 'Store data reset successfully' })
    } catch (err) {
        console.error('ResetDatabase error:', err)
        res.status(500).json({ success: false, error: 'Failed to reset database' })
    }
})

module.exports = router
