const express = require('express')
const supabase = require('../config/supabase')
const auth = require('../middleware/auth')

const router = express.Router()

// GET /api/stores/:storeId/reports/dashboard
router.get('/:storeId/reports/dashboard', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const today = new Date().toISOString().slice(0, 10)

        // Today's sales
        const { data: todaySales } = await supabase
            .from('transactions')
            .select('total, discount_amount')
            .eq('store_id', storeId)
            .eq('status', 'completed')
            .gte('created_at', today)

        const todayRevenue = todaySales?.reduce((sum, t) => sum + (t.total || 0), 0) || 0
        const todayCount = todaySales?.length || 0

        // This month
        const monthStart = new Date().toISOString().slice(0, 7) + '-01'
        const { data: monthSales } = await supabase
            .from('transactions')
            .select('total')
            .eq('store_id', storeId)
            .eq('status', 'completed')
            .gte('created_at', monthStart)

        const monthRevenue = monthSales?.reduce((sum, t) => sum + (t.total || 0), 0) || 0
        const monthCount = monthSales?.length || 0

        // Total products
        const { count: totalProducts } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .eq('is_active', true)

        // Low stock
        const { data: allProducts } = await supabase
            .from('products')
            .select('stock, min_stock')
            .eq('store_id', storeId)
            .eq('is_active', true)
            .eq('track_stock', true)

        const lowStockCount = (allProducts || []).filter(p => p.stock <= p.min_stock).length

        // Total customers
        const { count: totalCustomers } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .eq('is_active', true)

        // Top selling products
        const { data: topProductsData } = await supabase
            .from('transaction_items')
            .select('product_id, quantity, subtotal, transactions!inner(store_id, status)')
            .eq('transactions.store_id', storeId)
            .eq('transactions.status', 'completed')

        const productSales = {}
        topProductsData?.forEach(item => {
            if (!productSales[item.product_id]) {
                productSales[item.product_id] = { id: item.product_id, total_sold: 0, total_revenue: 0 }
            }
            productSales[item.product_id].total_sold += item.quantity
            productSales[item.product_id].total_revenue += item.subtotal
        })

        const topProductIds = Object.values(productSales)
            .sort((a, b) => b.total_revenue - a.total_revenue)
            .slice(0, 5)
            .map(p => p.id)

        const { data: productsInfo } = await supabase
            .from('products')
            .select('id, name, image_url')
            .in('id', topProductIds)

        const topProducts = topProductIds.map(id => {
            const info = productsInfo?.find(p => p.id === id)
            const sales = productSales[id]
            return {
                ...info,
                total_sold: sales.total_sold,
                total_revenue: sales.total_revenue
            }
        }).filter(p => p.name)

        // Recent transactions
        const { data: recentTransactions } = await supabase
            .from('transactions')
            .select('*, customers(name)')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(5)

        return res.json({
            success: true,
            data: {
                today: { revenue: todayRevenue, transactions: todayCount },
                month: { revenue: monthRevenue, transactions: monthCount },
                total_products: totalProducts || 0,
                low_stock_count: lowStockCount,
                total_customers: totalCustomers || 0,
                recent_transactions: (recentTransactions || []).map(t => ({
                    ...t, customer_name: t.customers?.name || null, customers: undefined
                })),
                top_products: topProducts
            }
        })
    } catch (err) {
        console.error('Dashboard error:', err)
        res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' })
    }
})

// GET /api/stores/:storeId/reports/daily
router.get('/:storeId/reports/daily', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { date } = req.query
        const targetDate = date || new Date().toISOString().slice(0, 10)

        const { data, error } = await supabase
            .from('transactions')
            .select('*, transaction_items(cost, quantity, subtotal)')
            .eq('store_id', storeId)
            .eq('status', 'completed')
            .gte('created_at', targetDate)
            .lte('created_at', targetDate + 'T23:59:59')

        if (error) throw error

        const totalSales = data.reduce((sum, t) => sum + t.total, 0)
        const totalDiscounts = data.reduce((sum, t) => sum + (t.discount_amount || 0), 0)
        const totalCost = data.reduce((sum, t) => sum + t.transaction_items.reduce((s, i) => s + (i.cost * i.quantity), 0), 0)
        const grossProfit = totalSales - totalCost

        return res.json({
            success: true,
            data: {
                date: targetDate,
                total_transactions: data.length,
                total_sales: totalSales,
                total_discounts: totalDiscounts,
                gross_profit: grossProfit,
                average_transaction: data.length > 0 ? totalSales / data.length : 0,
                transactions: data.map(t => ({ ...t, transaction_items: undefined }))
            }
        })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch daily report' })
    }
})

// GET /api/stores/:storeId/reports/weekly
router.get('/:storeId/reports/weekly', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { start_date } = req.query

        const start = start_date || (() => {
            const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10)
        })()
        const end = new Date().toISOString().slice(0, 10)

        const { data, error } = await supabase
            .from('transactions')
            .select('total, discount_amount, created_at')
            .eq('store_id', storeId)
            .eq('status', 'completed')
            .gte('created_at', start)
            .lte('created_at', end + 'T23:59:59')
            .order('created_at', { ascending: true })

        if (error) throw error

        // Group by day
        const byDay = {}
        for (let i = 0; i <= 6; i++) {
            const d = new Date(); d.setDate(d.getDate() - (6 - i))
            byDay[d.toISOString().slice(0, 10)] = { date: d.toISOString().slice(0, 10), total_sales: 0, total_transactions: 0 }
        }

        data.forEach(t => {
            const day = t.created_at.slice(0, 10)
            if (byDay[day]) {
                byDay[day].total_sales += t.total
                byDay[day].total_transactions += 1
            }
        })

        return res.json({ success: true, data: Object.values(byDay) })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch weekly report' })
    }
})

// GET /api/stores/:storeId/reports/monthly
router.get('/:storeId/reports/monthly', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { year } = req.query
        const targetYear = year || new Date().getFullYear()

        const { data, error } = await supabase
            .from('transactions')
            .select('total, created_at')
            .eq('store_id', storeId)
            .eq('status', 'completed')
            .gte('created_at', `${targetYear}-01-01`)
            .lte('created_at', `${targetYear}-12-31T23:59:59`)

        if (error) throw error

        const months = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            month_name: new Date(2000, i).toLocaleString('default', { month: 'long' }),
            total_sales: 0,
            total_transactions: 0
        }))

        data.forEach(t => {
            const month = new Date(t.created_at).getMonth()
            months[month].total_sales += t.total
            months[month].total_transactions += 1
        })

        return res.json({ success: true, data: months })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch monthly report' })
    }
})

// GET /api/stores/:storeId/reports/products
router.get('/:storeId/reports/products', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { start_date, end_date, limit = 10 } = req.query

        let query = supabase
            .from('transaction_items')
            .select('product_id, product_name, quantity, subtotal, cost, transactions!inner(store_id, status, created_at)')
            .eq('transactions.store_id', storeId)
            .eq('transactions.status', 'completed')

        if (start_date) query = query.gte('transactions.created_at', start_date)
        if (end_date) query = query.lte('transactions.created_at', end_date + 'T23:59:59')

        const { data, error } = await query
        if (error) throw error

        // Aggregate by product
        const productMap = {}
        data.forEach(item => {
            if (!productMap[item.product_id]) {
                productMap[item.product_id] = {
                    product_id: item.product_id,
                    product_name: item.product_name,
                    total_sold: 0, total_revenue: 0, total_profit: 0, transaction_count: 0
                }
            }
            productMap[item.product_id].total_sold += item.quantity
            productMap[item.product_id].total_revenue += item.subtotal
            productMap[item.product_id].total_profit += (item.subtotal - (item.cost * item.quantity))
            productMap[item.product_id].transaction_count += 1
        })

        const sorted = Object.values(productMap)
            .sort((a, b) => b.total_revenue - a.total_revenue)
            .slice(0, parseInt(limit))

        return res.json({ success: true, data: sorted })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch product report' })
    }
})

// GET /api/stores/:storeId/reports/profit-loss
router.get('/:storeId/reports/profit-loss', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { start_date, end_date } = req.query

        const start = start_date || (new Date().toISOString().slice(0, 7) + '-01')
        const end = end_date || new Date().toISOString().slice(0, 10)

        const { data, error } = await supabase
            .from('transactions')
            .select('total, transaction_items(cost, quantity)')
            .eq('store_id', storeId)
            .eq('status', 'completed')
            .gte('created_at', start)
            .lte('created_at', end + 'T23:59:59')

        if (error) throw error

        const totalRevenue = data.reduce((sum, t) => sum + t.total, 0)
        const totalCost = data.reduce((sum, t) => sum + t.transaction_items.reduce((s, i) => s + (i.cost * i.quantity), 0), 0)
        const grossProfit = totalRevenue - totalCost
        const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

        return res.json({
            success: true,
            data: { period: `${start} to ${end}`, total_revenue: totalRevenue, total_cost: totalCost, gross_profit: grossProfit, margin }
        })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch profit-loss report' })
    }
})

// GET /api/stores/:storeId/reports/export
router.get('/:storeId/reports/export', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { start_date, end_date, type = 'transactions' } = req.query

        let query = supabase
            .from('transactions')
            .select('invoice_number, created_at, total, payment_type, status, customers(name)')
            .eq('store_id', storeId)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })

        if (start_date) query = query.gte('created_at', start_date)
        if (end_date) query = query.lte('created_at', end_date + 'T23:59:59')

        const { data, error } = await query
        if (error) throw error

        // Build CSV
        const rows = [['Invoice', 'Date', 'Customer', 'Total', 'Payment', 'Status']]
        data.forEach(t => {
            rows.push([
                t.invoice_number,
                t.created_at?.slice(0, 10),
                t.customers?.name || 'Guest',
                t.total,
                t.payment_type,
                t.status
            ])
        })
        const csv = rows.map(r => r.join(',')).join('\n')

        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', `attachment; filename=transactions-${Date.now()}.csv`)
        return res.send(csv)
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to export data' })
    }
})

module.exports = router
