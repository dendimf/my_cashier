const express = require('express')
const supabase = require('../config/supabase')
const auth = require('../middleware/auth')

const router = express.Router()

// GET /api/stores/:storeId/stock
router.get('/:storeId/stock', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { product_id, type, page = 1, per_page = 50 } = req.query

        let query = supabase
            .from('stock_movements')
            .select('*, products(name)', { count: 'exact' })
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })

        if (product_id) query = query.eq('product_id', product_id)
        if (type) query = query.eq('type', type)

        const from = (page - 1) * per_page
        query = query.range(from, from + per_page - 1)

        const { data, error, count } = await query
        if (error) throw error

        const movements = data.map(m => ({
            ...m,
            product_name: m.products?.name || null,
            products: undefined
        }))

        return res.json({ success: true, data: movements, total: count, page: parseInt(page), per_page: parseInt(per_page) })
    } catch (err) {
        console.error('ListStock error:', err)
        res.status(500).json({ success: false, error: 'Failed to fetch stock movements' })
    }
})

// POST /api/stores/:storeId/stock/in
router.post('/:storeId/stock/in', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { product_id, quantity, notes } = req.body
        if (!product_id || !quantity) {
            return res.status(400).json({ success: false, error: 'product_id and quantity are required' })
        }

        const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', product_id)
            .single()

        if (!product) return res.status(404).json({ success: false, error: 'Product not found' })

        const qty = parseInt(quantity)
        const stockBefore = product.stock
        const stockAfter = stockBefore + qty

        // Update stock
        await supabase.from('products').update({ stock: stockAfter, updated_at: new Date().toISOString() }).eq('id', product_id)

        // Record movement
        const { data: movement, error } = await supabase
            .from('stock_movements')
            .insert({
                product_id, store_id: storeId, type: 'in', quantity: qty,
                stock_before: stockBefore, stock_after: stockAfter,
                notes: notes || null, created_by: req.user.id
            })
            .select()
            .single()

        if (error) throw error
        return res.status(201).json({ success: true, data: movement })
    } catch (err) {
        console.error('StockIn error:', err)
        res.status(500).json({ success: false, error: 'Failed to add stock' })
    }
})

// POST /api/stores/:storeId/stock/out
router.post('/:storeId/stock/out', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { product_id, quantity, notes } = req.body
        if (!product_id || !quantity) {
            return res.status(400).json({ success: false, error: 'product_id and quantity are required' })
        }

        const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', product_id)
            .single()

        if (!product) return res.status(404).json({ success: false, error: 'Product not found' })

        const qty = parseInt(quantity)
        const stockBefore = product.stock
        const stockAfter = Math.max(0, stockBefore - qty)

        await supabase.from('products').update({ stock: stockAfter, updated_at: new Date().toISOString() }).eq('id', product_id)

        const { data: movement, error } = await supabase
            .from('stock_movements')
            .insert({
                product_id, store_id: storeId, type: 'out', quantity: qty,
                stock_before: stockBefore, stock_after: stockAfter,
                notes: notes || null, created_by: req.user.id
            })
            .select()
            .single()

        if (error) throw error
        return res.status(201).json({ success: true, data: movement })
    } catch (err) {
        console.error('StockOut error:', err)
        res.status(500).json({ success: false, error: 'Failed to reduce stock' })
    }
})

// GET /api/stores/:storeId/stock/low
router.get('/:storeId/stock/low', auth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('id, name, stock, min_stock')
            .eq('store_id', req.params.storeId)
            .eq('is_active', true)
            .eq('track_stock', true)
            .order('stock', { ascending: true })

        if (error) throw error

        const lowStock = data.filter(p => p.stock <= p.min_stock)
        return res.json({ success: true, data: lowStock })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch low stock products' })
    }
})

module.exports = router
