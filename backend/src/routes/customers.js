const express = require('express')
const supabase = require('../config/supabase')
const auth = require('../middleware/auth')

const router = express.Router()

// GET /api/stores/:storeId/customers
router.get('/:storeId/customers', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { search, page = 1, per_page = 20 } = req.query

        let query = supabase
            .from('customers')
            .select('*', { count: 'exact' })
            .eq('store_id', storeId)
            .eq('is_active', true)
            .order('name', { ascending: true })

        if (search) {
            query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
        }

        const from = (page - 1) * per_page
        query = query.range(from, from + per_page - 1)

        const { data, error, count } = await query
        if (error) throw error

        return res.json({ success: true, data, total: count, page: parseInt(page), per_page: parseInt(per_page), total_pages: Math.ceil(count / per_page) })
    } catch (err) {
        console.error('ListCustomers error:', err)
        res.status(500).json({ success: false, error: 'Failed to fetch customers' })
    }
})

// GET /api/stores/:storeId/customers/:id
router.get('/:storeId/customers/:id', auth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', req.params.id)
            .eq('store_id', req.params.storeId)
            .single()

        if (error || !data) return res.status(404).json({ success: false, error: 'Customer not found' })
        return res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch customer' })
    }
})

// POST /api/stores/:storeId/customers
router.post('/:storeId/customers', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { name, phone, email, address, notes } = req.body
        if (!name) return res.status(400).json({ success: false, error: 'Customer name is required' })

        const { data, error } = await supabase
            .from('customers')
            .insert({ store_id: storeId, name, phone: phone || null, email: email || null, address: address || null, notes: notes || null })
            .select()
            .single()

        if (error) throw error
        return res.status(201).json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to create customer' })
    }
})

// PUT /api/stores/:storeId/customers/:id
router.put('/:storeId/customers/:id', auth, async (req, res) => {
    try {
        const { storeId, id } = req.params
        const updates = { updated_at: new Date().toISOString() }
        const fields = ['name', 'phone', 'email', 'address', 'notes', 'is_active']
        fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })

        const { data, error } = await supabase
            .from('customers')
            .update(updates)
            .eq('id', id)
            .eq('store_id', storeId)
            .select()
            .single()

        if (error) throw error
        return res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to update customer' })
    }
})

// DELETE /api/stores/:storeId/customers/:id
router.delete('/:storeId/customers/:id', auth, async (req, res) => {
    try {
        const { error } = await supabase
            .from('customers')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .eq('store_id', req.params.storeId)

        if (error) throw error
        return res.json({ success: true, message: 'Customer deleted' })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to delete customer' })
    }
})

// POST /api/stores/:storeId/customers/find-or-create
router.post('/:storeId/customers/find-or-create', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { name, phone, email } = req.body

        if (phone) {
            const { data: existing } = await supabase
                .from('customers')
                .select('*')
                .eq('store_id', storeId)
                .eq('phone', phone)
                .single()
            if (existing) return res.json({ success: true, data: existing })
        }

        const { data, error } = await supabase
            .from('customers')
            .insert({ store_id: storeId, name: name || 'Guest', phone: phone || null, email: email || null })
            .select()
            .single()

        if (error) throw error
        return res.status(201).json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to find or create customer' })
    }
})

module.exports = router
