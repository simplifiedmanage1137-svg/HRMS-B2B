const cron = require('node-cron');
const db = require('../config/database');

// Run at 00:01 on the 1st of every month
cron.schedule('1 0 1 * *', async () => {
    console.log('Running month-end leave accrual job for previous month...');
    
    try {
        const today = new Date();
        const previousMonth = today.getMonth(); // 0-11
        const year = today.getFullYear();
        
        // Get all employees who have completed 6 months
        const [employees] = await db.query(`
            SELECT employee_id, joining_date 
            FROM employees 
            WHERE TIMESTAMPDIFF(MONTH, joining_date, CURDATE()) >= 6
        `);

        console.log(`Found ${employees.length} eligible employees`);

        for (const emp of employees) {
            // Check if already accrued for previous month
            const [existing] = await db.query(
                `SELECT * FROM leave_transactions 
                 WHERE employee_id = ? AND leave_year = ? 
                 AND transaction_type = 'accrual' 
                 AND MONTH(transaction_date) = ?`,
                [emp.employee_id, year, previousMonth + 1]
            );

            if (existing.length === 0) {
                // Add 1.5 leaves for previous month
                await db.query(
                    `UPDATE leave_balance 
                     SET total_accrued = total_accrued + 1.5, 
                         current_balance = current_balance + 1.5 
                     WHERE employee_id = ? AND leave_year = ?`,
                    [emp.employee_id, year]
                );

                // Record transaction
                const accrualDate = new Date(year, previousMonth, 1);
                await db.query(
                    `INSERT INTO leave_transactions 
                     (employee_id, leave_year, transaction_date, transaction_type, amount, description) 
                     VALUES (?, ?, ?, 'accrual', 1.5, ?)`,
                    [emp.employee_id, year, accrualDate, 
                     `Monthly leave accrual for ${accrualDate.toLocaleString('default', { month: 'long' })} ${year}`]
                );

                console.log(`Added 1.5 leaves to ${emp.employee_id} for ${accrualDate.toLocaleString('default', { month: 'long' })}`);
            }
        }

        console.log('Month-end leave accrual completed');
        
    } catch (error) {
        console.error('Month-end accrual failed:', error);
    }
});

console.log('Month-end accrual cron job scheduled');