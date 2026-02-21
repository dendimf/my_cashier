const jwt = require('jsonwebtoken')

const auth = (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('⚠️ No token provided for:', req.originalUrl)
        return res.status(401).json({ success: false, error: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]
    const secret = process.env.JWT_SECRET

    try {
        if (!secret) throw new Error('JWT_SECRET is not defined in backend process!')
        const decoded = jwt.verify(token, secret)
        req.user = decoded
        next()
    } catch (err) {
        console.error('❌ JWT Verification failed!')
        console.error('- URL:', req.originalUrl)
        console.error('- Error:', err.message)
        console.error('- Secret present:', !!secret)
        console.error('- Token preview:', token?.substring(0, 15) + '...')
        return res.status(401).json({ success: false, error: 'Invalid or expired token' })
    }
}

module.exports = auth
