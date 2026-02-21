const express = require('express')
const multer = require('multer')
const supabase = require('../config/supabase')
const auth = require('../middleware/auth')

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

// POST /api/stores/:storeId/upload-image
router.post('/:storeId/upload-image', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No image file provided' })
        }

        const { storeId } = req.params
        const file = req.file
        const fileExt = file.originalname.split('.').pop()
        const fileName = `${storeId}/${Date.now()}.${fileExt}`
        const filePath = `products/${fileName}`

        // Ensure bucket exists (ignoring error if it already exists)
        await supabase.storage.createBucket('kasirku', { public: true }).catch(() => { })

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('kasirku')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            })

        if (error) throw error

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('kasirku')
            .getPublicUrl(filePath)

        return res.json({ success: true, url: publicUrl })
    } catch (err) {
        console.error('Upload error:', err)
        res.status(500).json({ success: false, error: 'Failed to upload image' })
    }
})

// GET /api/stores/:storeId/products
router.get('/:storeId/products', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { search, category_id, is_active, page = 1, per_page = 50 } = req.query

        let query = supabase
            .from('products')
            .select('*, categories(name)', { count: 'exact' })
            .eq('store_id', storeId)
            .order('name', { ascending: true })

        if (search) query = query.ilike('name', `%${search}%`)
        if (category_id) query = query.eq('category_id', category_id)
        if (is_active !== undefined) query = query.eq('is_active', is_active === 'true')

        const from = (page - 1) * per_page
        query = query.range(from, from + per_page - 1)

        const { data, error, count } = await query
        if (error) throw error

        const products = data.map(p => ({
            ...p,
            category_name: p.categories?.name || null,
            categories: undefined
        }))

        return res.json({
            success: true,
            data: products,
            page: parseInt(page),
            per_page: parseInt(per_page),
            total: count,
            total_pages: Math.ceil(count / per_page)
        })
    } catch (err) {
        console.error('ListProducts error:', err)
        res.status(500).json({ success: false, error: 'Failed to fetch products' })
    }
})

// GET /api/stores/:storeId/products/barcode/:barcode
router.get('/:storeId/products/barcode/:barcode', auth, async (req, res) => {
    try {
        const { storeId, barcode } = req.params
        const { data, error } = await supabase
            .from('products')
            .select('*, categories(name)')
            .eq('store_id', storeId)
            .eq('barcode', barcode)
            .single()

        if (error || !data) return res.status(404).json({ success: false, error: 'Product not found' })
        return res.json({ success: true, data: { ...data, category_name: data.categories?.name || null, categories: undefined } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch product by barcode' })
    }
})

// POST /api/stores/:storeId/products/generate-barcode
router.post('/:storeId/products/generate-barcode', auth, async (req, res) => {
    try {
        const barcode = 'BC' + Date.now().toString().slice(-10)
        return res.json({ success: true, data: { barcode } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to generate barcode' })
    }
})

// GET /api/stores/:storeId/products/:id
router.get('/:storeId/products/:id', auth, async (req, res) => {
    try {
        const { storeId, id } = req.params
        const { data, error } = await supabase
            .from('products')
            .select('*, categories(name)')
            .eq('store_id', storeId)
            .eq('id', id)
            .single()

        if (error || !data) return res.status(404).json({ success: false, error: 'Product not found' })
        return res.json({ success: true, data: { ...data, category_name: data.categories?.name || null, categories: undefined } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch product' })
    }
})

// POST /api/stores/:storeId/products
router.post('/:storeId/products', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { name, category_id, barcode, sku, description, price, cost, stock, min_stock, unit, image_url, track_stock } = req.body

        if (!name || price === undefined) {
            return res.status(400).json({ success: false, error: 'Name and price are required' })
        }

        const { data, error } = await supabase
            .from('products')
            .insert({
                store_id: storeId,
                name, category_id: category_id || null,
                barcode: barcode || null,
                sku: sku || null,
                description: description || null,
                price: parseFloat(price) || 0,
                cost: parseFloat(cost) || 0,
                stock: parseInt(stock) || 0,
                min_stock: parseInt(min_stock) || 5,
                unit: unit || 'pcs',
                image_url: image_url || null,
                track_stock: track_stock !== false
            })
            .select()
            .single()

        if (error) throw error

        // Record initial stock movement if > 0
        if (data.stock > 0) {
            await supabase.from('stock_movements').insert({
                product_id: data.id,
                store_id: storeId,
                type: 'in',
                quantity: data.stock,
                stock_before: 0,
                stock_after: data.stock,
                notes: 'Stok awal produk',
                created_by: req.user.id
            })
        }

        return res.status(201).json({ success: true, data })
    } catch (err) {
        console.error('CreateProduct error:', err)
        res.status(500).json({ success: false, error: 'Failed to create product' })
    }
})

// PUT /api/stores/:storeId/products/:id
router.put('/:storeId/products/:id', auth, async (req, res) => {
    try {
        const { storeId, id } = req.params
        const updates = { updated_at: new Date().toISOString() }
        const fields = ['name', 'category_id', 'barcode', 'sku', 'description', 'price', 'cost', 'min_stock', 'unit', 'image_url', 'is_active', 'track_stock']
        fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })

        const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .eq('store_id', storeId)
            .select()
            .single()

        if (error) throw error
        return res.json({ success: true, data })
    } catch (err) {
        console.error('UpdateProduct error:', err)
        res.status(500).json({ success: false, error: 'Failed to update product' })
    }
})

// DELETE /api/stores/:storeId/products/:id
router.delete('/:storeId/products/:id', auth, async (req, res) => {
    try {
        const { storeId, id } = req.params
        const { error } = await supabase
            .from('products')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('store_id', storeId)

        if (error) throw error
        return res.json({ success: true, message: 'Product deleted' })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to delete product' })
    }
})

module.exports = router
