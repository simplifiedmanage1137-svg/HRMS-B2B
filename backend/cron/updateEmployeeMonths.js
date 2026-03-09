const cron = require('node-cron');
const EmployeeService = require('../services/employeeService');

// Run every day at midnight to update employee months
cron.schedule('0 0 * * *', async () => {
    console.log('Running daily employee months update...');
    try {
        const results = await EmployeeService.updateAllEmployeesMonths();
        console.log('Employee months updated:', results);
    } catch (error) {
        console.error('Error updating employee months:', error);
    }
});

// Manual trigger endpoint
const manualUpdate = async () => {
    return await EmployeeService.updateAllEmployeesMonths();
};

module.exports = { manualUpdate };