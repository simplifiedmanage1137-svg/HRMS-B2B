module.exports = (req, res) => {
    res.json({
        ok: true,
        ts: new Date().toISOString(),
        env: {
            NODE_ENV: process.env.NODE_ENV || 'NOT SET',
            VERCEL: process.env.VERCEL || 'NOT SET',
            SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
            JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
        }
    });
};
