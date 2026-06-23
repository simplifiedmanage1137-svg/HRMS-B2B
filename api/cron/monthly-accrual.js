/**
 * Vercel Cron — runs on the 1st of every month at 01:00 IST (19:30 UTC).
 * Runs the monthly leave accrual job for all eligible employees.
 *
 * Schedule in vercel.json: "30 19 1 * *"
 */

const { runMonthlyAccrual } = require('../../backend/cron/leaveAccrualJob');

module.exports = async (req, res) => {
    const auth = req.headers['authorization'] || '';
    const secret = process.env.CRON_SECRET;

    if (secret && auth !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const t = Date.now();
    try {
        await runMonthlyAccrual();
        const ms = Date.now() - t;
        console.log(`✅ [CRON monthly-accrual] done in ${ms}ms`);
        return res.json({ success: true, ms });
    } catch (err) {
        console.error('❌ [CRON monthly-accrual] error:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
};
