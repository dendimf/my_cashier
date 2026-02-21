const express = require('express')
const supabase = require('../config/supabase')
const auth = require('../middleware/auth')

const router = express.Router()

// GET /api/stores/:storeId/categories
router.get('/:storeId/categories', auth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('store_id', req.params.storeId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })

        if (error) throw error
        return res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch categories' })
    }
})

// POST /api/stores/:storeId/categories
router.post('/:storeId/categories', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { name, color, icon, sort_order } = req.body
        if (!name) return res.status(400).json({ success: false, error: 'Category name is required' })

        const { data, error } = await supabase
            .from('categories')
            .insert({ store_id: storeId, name, color: color || '#3B82F6', icon: icon || null, sort_order: sort_order || 0 })
            .select()
            .single()

        if (error) throw error
        return res.status(201).json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to create category' })
    }
})

module.exports = router
