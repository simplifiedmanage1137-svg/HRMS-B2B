const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    const msg = `Missing Supabase credentials — SUPABASE_URL: ${supabaseUrl ? 'OK' : 'MISSING'}, KEY: ${supabaseKey ? 'OK' : 'MISSING'}`;
    console.error('❌', msg);
    throw new Error(msg);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

console.log('✅ Supabase client initialized');

module.exports = supabase;