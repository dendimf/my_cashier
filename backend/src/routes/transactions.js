const express = require('express')
const supabase = require('../config/supabase')
const auth = require('../middleware/auth')

const router = express.Router()

// Generate invoice number
const generateInvoice = async (storeId) => {
    const { data: store } = await supabase.from('stores').select('name').eq('id', storeId).single()
    const prefix = (store?.name || 'INV').substring(0, 3).toUpperCase()
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .gte('created_at', today.toISOString().slice(0, 10))
    const seq = String((count || 0) + 1).padStart(4, '0')
    return `${prefix}-${dateStr}-${seq}`
}

// GET /api/stores/:storeId/transactions
router.get('/:storeId/transactions', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { page = 1, per_page = 20, start_date, end_date, status, payment_type } = req.query

        let query = supabase
            .from('transactions')
            .select('*, customers(name), users(full_name)', { count: 'exact' })
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })

        if (status) query = query.eq('status', status)
        if (payment_type) query = query.eq('payment_type', payment_type)
        if (start_date) query = query.gte('created_at', start_date)
        if (end_date) query = query.lte('created_at', end_date + 'T23:59:59')

        const from = (page - 1) * per_page
        query = query.range(from, from + per_page - 1)

        const { data, error, count } = await query
        if (error) throw error

        const transactions = data.map(t => ({
            ...t,
            customer_name: t.customers?.name || null,
            cashier_name: t.users?.full_name || null,
            customers: undefined,
            users: undefined
        }))

        return res.json({ success: true, data: transactions, total: count, page: parseInt(page), per_page: parseInt(per_page), total_pages: Math.ceil(count / per_page) })
    } catch (err) {
        console.error('ListTransactions error:', err)
        res.status(500).json({ success: false, error: 'Failed to fetch transactions' })
    }
})

// GET /api/stores/:storeId/transactions/:id
router.get('/:storeId/transactions/:id', auth, async (req, res) => {
    try {
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select('*, customers(name), users(full_name), transaction_items(*)')
            .eq('id', req.params.id)
            .eq('store_id', req.params.storeId)
            .single()

        if (error || !transaction) return res.status(404).json({ success: false, error: 'Transaction not found' })

        return res.json({
            success: true,
            data: {
                ...transaction,
                customer_name: transaction.customers?.name || null,
                cashier_name: transaction.users?.full_name || null,
                items: transaction.transaction_items || [],
                customers: undefined, users: undefined, transaction_items: undefined
            }
        })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch transaction' })
    }
})

// POST /api/stores/:storeId/transactions
router.post('/:storeId/transactions', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { customer_id, items, discount_amount, discount_percent, payment_amount, payment_type, payment_reference, notes, send_receipt } = req.body

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, error: 'At least one item is required' })
        }

        // Get store for tax rate
        const { data: store } = await supabase.from('stores').select('tax_rate').eq('id', storeId).single()
        const taxRate = store?.tax_rate || 0

        // Calculate totals with product prices
        let subtotal = 0
        const itemsWithDetails = []

        for (const item of items) {
            const { data: product } = await supabase
                .from('products')
                .select('name, price, cost, track_stock, stock')
                .eq('id', item.product_id)
                .single()

            if (!product) {
                return res.status(404).json({ success: false, error: `Product ${item.product_id} not found` })
            }

            const itemDiscount = item.discount_amount || 0
            const itemSubtotal = (product.price * item.quantity) - itemDiscount
            subtotal += itemSubtotal

            itemsWithDetails.push({
                product_id: item.product_id,
                product_name: product.name,
                product_price: product.price,
                cost: product.cost,
                quantity: item.quantity,
                discount_amount: itemDiscount,
                discount_percent: item.discount_percent || 0,
                subtotal: itemSubtotal,
                track_stock: product.track_stock,
                current_stock: product.stock
            })
        }

        const discAmt = discount_amount || 0
        const discPct = discount_percent || 0
        const discountTotal = discAmt + (subtotal * discPct / 100)
        const taxableAmount = subtotal - discountTotal
        const taxAmount = taxableAmount * taxRate / 100
        const total = taxableAmount + taxAmount
        const changeAmount = (payment_amount || 0) - total

        const invoiceNumber = await generateInvoice(storeId)

        // Create transaction
        const { data: transaction, error: txErr } = await supabase
            .from('transactions')
            .insert({
                store_id: storeId,
                customer_id: customer_id || null,
                cashier_id: req.user.id,
                invoice_number: invoiceNumber,
                subtotal,
                discount_amount: discountTotal,
                discount_percent: discPct,
                tax_amount: taxAmount,
                total,
                payment_amount: payment_amount || 0,
                change_amount: Math.max(0, changeAmount),
                payment_type: payment_type || 'cash',
                payment_reference: payment_reference || null,
                status: 'completed',
                notes: notes || null
            })
            .select()
            .single()

        if (txErr) throw txErr

        // Insert transaction items
        const transactionItems = itemsWithDetails.map(item => ({
            transaction_id: transaction.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_price: item.product_price,
            cost: item.cost,
            quantity: item.quantity,
            discount_amount: item.discount_amount,
            discount_percent: item.discount_percent,
            subtotal: item.subtotal
        }))

        await supabase.from('transaction_items').insert(transactionItems)

        // Update stock for each item
        for (const item of itemsWithDetails) {
            if (item.track_stock) {
                const newStock = Math.max(0, item.current_stock - item.quantity)
                await supabase.from('products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', item.product_id)
                await supabase.from('stock_movements').insert({
                    product_id: item.product_id,
                    store_id: storeId,
                    type: 'sale',
                    quantity: item.quantity,
                    stock_before: item.current_stock,
                    stock_after: newStock,
                    reference_id: transaction.id,
                    reference_type: 'transaction',
                    notes: `Sale: ${item.product_name}`
                })
            }
        }

        // Update customer stats
        if (customer_id) {
            await supabase.from('customers').update({
                total_transactions: supabase.rpc('increment', { table: 'customers', id: customer_id, column: 'total_transactions' }),
                total_spent: supabase.rpc('increment', { table: 'customers', id: customer_id, column: 'total_spent', amount: total }),
                last_transaction_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }).eq('id', customer_id)
        }

        return res.status(201).json({ success: true, data: { ...transaction, items: transactionItems } })
    } catch (err) {
        console.error('CreateTransaction error:', err)
        res.status(500).json({ success: false, error: 'Failed to create transaction' })
    }
})

module.exports = router
