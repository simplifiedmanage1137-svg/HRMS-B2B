const cron = require('node-cron');
const LeaveYearlyService = require('../services/leaveYearlyService');
const db = require('../config/database');

// Run monthly accrual on 1st of every month at 00:01
cron.schedule('1 0 1 * *', async () => {
    console.log('Running monthly leave accrual job for previous month...');
    
    try {
        // Get all employees
        const [employees] = await db.query('SELECT employee_id FROM employees');
        
        for (const emp of employees) {
            try {
                await LeaveYearlyService.addMonthlyAccrual(emp.employee_id);
            } catch (empError) {
                console.error(`Error adding accrual for ${emp.employee_id}:`, empError);
            }
        }
        
        console.log('Monthly leave accrual completed for all employees');
    } catch (error) {
        console.error('Monthly accrual job failed:', error);
    }
});

// Run yearly reset on January 1st at 00:00
cron.schedule('0 0 1 1 *', async () => {
    console.log('Running yearly leave reset job...');
    try {
        const result = await LeaveYearlyService.resetForNewYear();
        console.log('Yearly reset result:', result);
    } catch (error) {
        console.error('Yearly reset failed:', error);
    }
});

// Manual trigger endpoints
const manualMonthlyAccrual = async (employee_id) => {
    return await LeaveYearlyService.addMonthlyAccrual(employee_id);
};

const manualYearlyReset = async () => {
    return await LeaveYearlyService.resetForNewYear();
};

module.exports = { manualMonthlyAccrual, manualYearlyReset };