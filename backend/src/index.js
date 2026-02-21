const fs = require('fs')
const path = require('path')

const envPath = fs.existsSync(path.join(__dirname, '../.env'))
    ? path.join(__dirname, '../.env')
    : path.join(__dirname, '../../.env')

console.log('📂 Loading .env from:', envPath)
require('dotenv').config({ path: envPath })

console.log('🚀 Environment Loading Status:')
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Loaded' : '❌ Missing')
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '✅ Loaded' : '❌ Missing')

const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const storeRoutes = require('./routes/stores')
const productRoutes = require('./routes/products')
const categoryRoutes = require('./routes/categories')
const stockRoutes = require('./routes/stock')
const transactionRoutes = require('./routes/transactions')
const customerRoutes = require('./routes/customers')
const reportRoutes = require('./routes/reports')
const whatsappRoutes = require('./routes/whatsapp')
const subscriptionRoutes = require('./routes/subscription')

const app = express()
const PORT = process.env.PORT || 5000

// CORS
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',')
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}))

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', async (req, res) => {
    let dbStatus = 'Checking...'
    try {
        const { error } = await require('./config/supabase').from('stores').select('id').limit(1)
        dbStatus = error ? `Error: ${error.message}` : '✅ Connected'
    } catch (err) {
        dbStatus = `Exception: ${err.message}`
    }

    res.json({
        success: true,
        message: 'KasirKu API is running',
        version: '2.0.0',
        database: dbStatus,
        env_path: path.join(__dirname, '../../.env')
    })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/stores', storeRoutes)
app.use('/api/stores', productRoutes)
app.use('/api/stores', categoryRoutes)
app.use('/api/stores', stockRoutes)
app.use('/api/stores', transactionRoutes)
app.use('/api/stores', customerRoutes)
app.use('/api/stores', reportRoutes)
app.use('/api/stores', whatsappRoutes)
app.use('/api/subscription', subscriptionRoutes)

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' })
})

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({ success: false, error: 'Internal server error' })
})

app.listen(PORT, () => {
    console.log(`✅ KasirKu API running on http://localhost:${PORT}`)
})

module.exports = app
