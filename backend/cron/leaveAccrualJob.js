const cron = require('node-cron');
const LeaveAccrualService = require('../services/leaveAccrualService');

// Run at 00:00 on the first day of every month
cron.schedule('0 0 1 * *', async () => {
    console.log('Running monthly leave accrual job...');
    try {
        const result = await LeaveAccrualService.addMonthlyAccrual();
        console.log('Monthly leave accrual result:', result);
    } catch (error) {
        console.error('Monthly leave accrual failed:', error);
    }
});

// Also can be triggered manually via API
const manualAccrual = async () => {
    return await LeaveAccrualService.addMonthlyAccrual();
};

module.exports = { manualAccrual };