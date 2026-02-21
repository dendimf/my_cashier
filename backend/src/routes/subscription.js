const express = require('express')
const supabase = require('../config/supabase')
const auth = require('../middleware/auth')

const router = express.Router()

const PLANS = [
    { id: 'free', name: 'Free', price_idr: 0, transaction_limit: 50, outlet_limit: 1, staff_limit: 1, features: ['50 transaksi/bulan', '100 produk', '50 pelanggan', 'Laporan dasar'] },
    { id: 'basic', name: 'Basic', price_idr: 59000, transaction_limit: -1, outlet_limit: 1, staff_limit: 2, features: ['Transaksi unlimited', 'Produk unlimited', 'Pelanggan unlimited', 'Kirim struk WhatsApp', 'Alert stok rendah', 'Export laporan'] },
    { id: 'pro', name: 'Pro', price_idr: 149000, transaction_limit: -1, outlet_limit: 5, staff_limit: 10, features: ['Semua fitur Basic', 'Multi outlet (5)', 'Multi kasir (10)', 'Broadcast promo WA', 'Laporan lanjutan', 'Priority support'] },
    { id: 'agency', name: 'Agency', price_idr: 299000, transaction_limit: -1, outlet_limit: -1, staff_limit: -1, features: ['Semua fitur Pro', 'Outlet unlimited', 'Staff unlimited', 'White label', 'API access', 'Dedicated support'] }
]

// GET /api/subscription
router.get('/', auth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', req.user.id)
            .single()

        if (error) return res.status(404).json({ success: false, error: 'Subscription not found' })
        return res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch subscription' })
    }
})

// GET /api/subscription/plans
router.get('/plans', (req, res) => {
    return res.json({ success: true, data: PLANS })
})

// POST /api/subscription/upgrade
router.post('/upgrade', auth, async (req, res) => {
    try {
        const { plan } = req.body
        const planData = PLANS.find(p => p.id === plan)
        if (!planData) return res.status(400).json({ success: false, error: 'Invalid plan' })

        const { data, error } = await supabase
            .from('subscriptions')
            .update({
                plan: planData.id,
                status: 'active',
                transaction_limit: planData.transaction_limit,
                outlet_limit: planData.outlet_limit,
                staff_limit: planData.staff_limit,
                price_idr: planData.price_idr,
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('user_id', req.user.id)
            .select()
            .single()

        if (error) throw error
        return res.json({ success: true, data, message: `Upgraded to ${planData.name} plan successfully` })
    } catch (err) {
        console.error('Upgrade error:', err)
        res.status(500).json({ success: false, error: 'Failed to upgrade subscription' })
    }
})

// GET /api/subscription/check-limit
router.get('/check-limit', auth, async (req, res) => {
    try {
        const { type } = req.query
        const { data: sub } = await supabase.from('subscriptions').select('*').eq('user_id', req.user.id).single()

        if (!sub) return res.status(404).json({ success: false, error: 'Subscription not found' })

        let canProceed = true
        let message = 'OK'

        if (type === 'transaction' && sub.plan === 'free') {
            canProceed = sub.transaction_used < sub.transaction_limit
            message = canProceed ? 'OK' : 'Transaction limit reached'
        }

        return res.json({ success: true, data: { can_proceed: canProceed, subscription: sub, message } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to check limit' })
    }
})

module.exports = router
