const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL?.trim()
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY?.trim()

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables')
}

// Admin client - bypasses RLS, used for all backend operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

module.exports = supabase
