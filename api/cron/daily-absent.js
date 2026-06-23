/**
 * Vercel Cron — runs daily at 23:59 IST (18:29 UTC).
 * Marks employees with no attendance record as absent and creates
 * an auto-approved unpaid leave entry.
 *
 * Schedule in vercel.json: "29 18 * * *"
 */

const { markAbsentEmployeesAsLeave } = require('../../backend/cron/absentEmployeeCheck');

module.exports = async (req, res) => {
    const auth = req.headers['authorization'] || '';
    const secret = process.env.CRON_SECRET;

    if (secret && auth !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const t = Date.now();
    try {
        const result = await markAbsentEmployeesAsLeave();
        const ms = Date.now() - t;
        console.log(`✅ [CRON daily-absent] done in ${ms}ms —`, result.message);
        return res.json({ success: true, result, ms });
    } catch (err) {
        console.error('❌ [CRON daily-absent] error:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
};
