/**
 * Vercel Cron — runs every Sunday at 02:00 IST (20:30 UTC Saturday).
 * Deletes old closed attendance sessions (>30 days) and resolved
 * regularization requests (>90 days).
 *
 * Schedule in vercel.json: "30 20 * * 0"
 */

const supabase = require('../../backend/config/supabase');

module.exports = async (req, res) => {
    const auth = req.headers['authorization'] || '';
    const secret = process.env.CRON_SECRET;

    if (secret && auth !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const t = Date.now();
    try {
        const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const ninetyAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

        const [{ error: sessErr }, { error: regErr }] = await Promise.all([
            supabase
                .from('attendance_sessions')
                .delete()
                .eq('is_active', false)
                .lt('clock_out_time', thirtyAgo),
            supabase
                .from('regularization_requests')
                .delete()
                .in('status', ['approved', 'rejected'])
                .lt('created_at', ninetyAgo),
        ]);

        if (sessErr) console.warn('⚠️ [CRON weekly-cleanup] sessions error:', sessErr.message);
        if (regErr)  console.warn('⚠️ [CRON weekly-cleanup] reg error:', regErr.message);

        const ms = Date.now() - t;
        console.log(`✅ [CRON weekly-cleanup] done in ${ms}ms`);
        return res.json({ success: true, ms });
    } catch (err) {
        console.error('❌ [CRON weekly-cleanup] error:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
};
