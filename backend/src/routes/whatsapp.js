const express = require('express')
const axios = require('axios')
const supabase = require('../config/supabase')
const auth = require('../middleware/auth')

const router = express.Router()

const sendFonnte = async (phone, message) => {
    const response = await axios.post(process.env.FONNTE_API_URL || 'https://api.fonnte.com/send',
        { target: phone, message },
        { headers: { Authorization: process.env.FONNTE_API_KEY } }
    )
    return response.data
}

// POST /api/stores/:storeId/whatsapp/send-receipt
router.post('/:storeId/whatsapp/send-receipt', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { phone, transaction_id, message } = req.body

        let msg = message
        if (!msg && transaction_id) {
            const { data: tx } = await supabase
                .from('transactions')
                .select('*, transaction_items(*)')
                .eq('id', transaction_id)
                .single()
            if (tx) {
                msg = `*Struk Pembelian*\nNo: ${tx.invoice_number}\nTotal: Rp ${tx.total?.toLocaleString('id-ID')}\nPembayaran: ${tx.payment_type?.toUpperCase()}\n\nTerima kasih!`
            }
        }

        if (!phone || !msg) {
            return res.status(400).json({ success: false, error: 'Phone and message are required' })
        }

        let status = 'pending'
        let errorMsg = null
        try {
            await sendFonnte(phone, msg)
            status = 'sent'
        } catch (e) {
            status = 'failed'
            errorMsg = e.message
        }

        await supabase.from('whatsapp_logs').insert({
            store_id: storeId, phone, message_type: 'receipt',
            content: msg, status, provider: 'fonnte',
            reference_id: transaction_id || null,
            reference_type: transaction_id ? 'transaction' : null,
            error_message: errorMsg
        })

        return res.json({ success: status === 'sent', message: status === 'sent' ? 'Receipt sent' : 'Failed to send receipt' })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to send receipt' })
    }
})

// POST /api/stores/:storeId/whatsapp/send-stock-alert
router.post('/:storeId/whatsapp/send-stock-alert', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { phone, product_name, current_stock, min_stock } = req.body

        if (!phone) return res.status(400).json({ success: false, error: 'Phone is required' })

        const msg = `⚠️ *Alert Stok Rendah*\nProduk: ${product_name}\nStok saat ini: ${current_stock}\nStok minimum: ${min_stock}\n\nSegera lakukan restock!`

        let status = 'pending'
        let errorMsg = null
        try {
            await sendFonnte(phone, msg)
            status = 'sent'
        } catch (e) {
            status = 'failed'
            errorMsg = e.message
        }

        await supabase.from('whatsapp_logs').insert({
            store_id: storeId, phone, message_type: 'stock_alert',
            content: msg, status, provider: 'fonnte', error_message: errorMsg
        })

        return res.json({ success: status === 'sent' })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to send stock alert' })
    }
})

// POST /api/stores/:storeId/whatsapp/broadcast
router.post('/:storeId/whatsapp/broadcast', auth, async (req, res) => {
    try {
        const { storeId } = req.params
        const { customer_ids, message, send_to_all } = req.body

        if (!message) return res.status(400).json({ success: false, error: 'Message is required' })

        let customers = []
        if (send_to_all) {
            const { data } = await supabase.from('customers').select('id, name, phone').eq('store_id', storeId).eq('is_active', true).not('phone', 'is', null)
            customers = data || []
        } else if (customer_ids?.length) {
            const { data } = await supabase.from('customers').select('id, name, phone').in('id', customer_ids).not('phone', 'is', null)
            customers = data || []
        }

        let sent = 0, failed = 0
        for (const customer of customers) {
            if (!customer.phone) continue
            try {
                await sendFonnte(customer.phone, message)
                sent++
                await supabase.from('whatsapp_logs').insert({
                    store_id: storeId, phone: customer.phone, message_type: 'broadcast',
                    content: message, status: 'sent', provider: 'fonnte'
                })
            } catch {
                failed++
            }
        }

        return res.json({ success: true, data: { sent, failed, total: customers.length } })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to broadcast' })
    }
})

// GET /api/stores/:storeId/whatsapp/logs
router.get('/:storeId/whatsapp/logs', auth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('whatsapp_logs')
            .select('*')
            .eq('store_id', req.params.storeId)
            .order('created_at', { ascending: false })
            .limit(100)

        if (error) throw error
        return res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch WhatsApp logs' })
    }
})

module.exports = router
