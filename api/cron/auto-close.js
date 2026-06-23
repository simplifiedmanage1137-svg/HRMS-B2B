/**
 * Vercel Cron — runs every hour (schedule defined in vercel.json).
 * Auto-closes attendance sessions that were never clocked-out.
 *
 * Vercel sends: Authorization: Bearer {CRON_SECRET}
 * Set CRON_SECRET in Vercel Environment Variables.
 */

const attendanceController = require('../../backend/controllers/attendanceController');

module.exports = async (req, res) => {
    // Only allow POST (Vercel Cron) or GET with correct secret
    const auth = req.headers['authorization'] || '';
    const secret = process.env.CRON_SECRET;

    if (secret && auth !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const t = Date.now();
    try {
        const result = await attendanceController.autoCloseStaleSessions();
        const ms = Date.now() - t;
        console.log(`✅ [CRON auto-close] ${result.closedCount ?? 0} sessions closed in ${ms}ms`);
        return res.json({ success: true, closedCount: result.closedCount ?? 0, ms });
    } catch (err) {
        console.error('❌ [CRON auto-close] error:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
};
