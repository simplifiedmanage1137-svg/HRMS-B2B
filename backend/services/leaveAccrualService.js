const db = require('../config/database');

class LeaveAccrualService {
    
    // Add monthly leave accrual for all eligible employees
    static async addMonthlyAccrual() {
        try {
            console.log('Running monthly leave accrual...');
            
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth() + 1;
            
            // Check if accrual already done for this month
            const [existingAccrual] = await db.query(
                'SELECT * FROM leave_transactions WHERE transaction_type = "accrual" AND MONTH(transaction_date) = ? AND YEAR(transaction_date) = ?',
                [currentMonth, currentYear]
            );
            
            if (existingAccrual.length > 0) {
                console.log('Monthly accrual already done for this month');
                return { success: false, message: 'Already accrued this month' };
            }

            // Get all employees who have completed 6 months
            const [employees] = await db.query(`
                SELECT employee_id, joining_date 
                FROM employees 
                WHERE TIMESTAMPDIFF(MONTH, joining_date, CURDATE()) >= 6
            `);

            console.log(`Found ${employees.length} eligible employees`);

            const results = [];

            for (const emp of employees) {
                try {
                    // Add 1.5 leaves to balance
                    await db.query(
                        `UPDATE leave_balance 
                         SET total_accrued = total_accrued + 1.5, 
                             current_balance = current_balance + 1.5 
                         WHERE employee_id = ?`,
                        [emp.employee_id]
                    );

                    // Record transaction
                    await db.query(
                        `INSERT INTO leave_transactions 
                         (employee_id, transaction_date, transaction_type, amount, description) 
                         VALUES (?, ?, 'accrual', 1.5, ?)`,
                        [emp.employee_id, today, `Monthly leave accrual for ${today.toLocaleString('default', { month: 'long' })}`]
                    );

                    results.push({
                        employee_id: emp.employee_id,
                        status: 'success',
                        amount: 1.5
                    });

                    console.log(`Added 1.5 leaves to ${emp.employee_id}`);
                } catch (empError) {
                    console.error(`Error adding accrual for ${emp.employee_id}:`, empError);
                    results.push({
                        employee_id: emp.employee_id,
                        status: 'failed',
                        error: empError.message
                    });
                }
            }

            console.log('Monthly leave accrual completed');
            return { 
                success: true, 
                message: 'Monthly accrual completed',
                results 
            };

        } catch (error) {
            console.error('Error in monthly accrual:', error);
            throw error;
        }
    }

    // Initialize leave balance for new employee
    static async initializeEmployeeBalance(employee_id, joiningDate) {
        try {
            const today = new Date();
            const joinDate = new Date(joiningDate);
            
            // Calculate months passed
            const monthsPassed = (today.getFullYear() - joinDate.getFullYear()) * 12 + 
                                (today.getMonth() - joinDate.getMonth());
            
            // Calculate accrued leaves (only after 6 months)
            let accruedLeaves = 0;
            if (monthsPassed >= 6) {
                const eligibleMonths = monthsPassed - 5;
                accruedLeaves = eligibleMonths * 1.5;
            }

            // Create balance record
            await db.query(
                `INSERT INTO leave_balance 
                 (employee_id, total_accrued, current_balance) 
                 VALUES (?, ?, ?)`,
                [employee_id, accruedLeaves, accruedLeaves]
            );

            // Add transaction records for past accruals
            if (accruedLeaves > 0) {
                for (let i = 0; i < eligibleMonths; i++) {
                    const accrualDate = new Date(joinDate);
                    accrualDate.setMonth(joinDate.getMonth() + 6 + i);
                    
                    await db.query(
                        `INSERT INTO leave_transactions 
                         (employee_id, transaction_date, transaction_type, amount, description) 
                         VALUES (?, ?, 'accrual', 1.5, ?)`,
                        [employee_id, accrualDate, `Monthly leave accrual for ${accrualDate.toLocaleString('default', { month: 'long' })}`]
                    );
                }
            }

            console.log(`Initialized leave balance for employee ${employee_id} with ${accruedLeaves} leaves`);
            return {
                employee_id,
                total_accrued: accruedLeaves,
                available: accruedLeaves
            };

        } catch (error) {
            console.error('Error initializing employee balance:', error);
            throw error;
        }
    }
}

module.exports = LeaveAccrualService;