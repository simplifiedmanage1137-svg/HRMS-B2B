const db = require('../config/database');

async function initializeLeaveBalances() {
    try {
        console.log('Starting leave balance initialization...');
        
        // Get all employees
        const [employees] = await db.query('SELECT employee_id, joining_date FROM employees');
        
        console.log(`Found ${employees.length} employees`);

        for (const emp of employees) {
            const joiningDate = new Date(emp.joining_date);
            const today = new Date();
            
            // Calculate months difference
            const yearsDiff = today.getFullYear() - joiningDate.getFullYear();
            let monthsDiff = (yearsDiff * 12) + (today.getMonth() - joiningDate.getMonth());
            
            // Adjust for day of month
            if (today.getDate() < joiningDate.getDate()) {
                monthsDiff--;
            }

            console.log(`\nEmployee: ${emp.employee_id}`);
            console.log(`Joining Date: ${joiningDate}`);
            console.log(`Months completed: ${monthsDiff}`);

            // Calculate accrued leaves (only after 6 months)
            let totalAccrued = 0;
            if (monthsDiff >= 6) {
                const eligibleMonths = monthsDiff - 5;
                totalAccrued = eligibleMonths * 1.5;
            }

            // Get used leaves from approved leaves
            const [usedLeaves] = await db.query(
                `SELECT SUM(days_count) as total_used FROM leaves 
                 WHERE employee_id = ? AND status = 'approved'`,
                [emp.employee_id]
            );
            
            const used = parseFloat(usedLeaves[0]?.total_used || 0);

            // Get pending leaves
            const [pendingLeaves] = await db.query(
                `SELECT SUM(days_count) as total_pending FROM leaves 
                 WHERE employee_id = ? AND status = 'pending'`,
                [emp.employee_id]
            );
            
            const pending = parseFloat(pendingLeaves[0]?.total_pending || 0);
            
            const currentBalance = totalAccrued - used - pending;

            console.log(`Calculated - Accrued: ${totalAccrued}, Used: ${used}, Pending: ${pending}, Balance: ${currentBalance}`);

            // Check if balance record exists
            const [existing] = await db.query(
                'SELECT * FROM leave_balance WHERE employee_id = ?',
                [emp.employee_id]
            );

            if (existing.length > 0) {
                // Update existing record
                await db.query(
                    `UPDATE leave_balance 
                     SET total_accrued = ?, total_used = ?, total_pending = ?, current_balance = ?
                     WHERE employee_id = ?`,
                    [totalAccrued, used, pending, currentBalance, emp.employee_id]
                );
                console.log(`Updated balance for ${emp.employee_id}`);
            } else {
                // Insert new record
                await db.query(
                    `INSERT INTO leave_balance 
                     (employee_id, total_accrued, total_used, total_pending, current_balance) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [emp.employee_id, totalAccrued, used, pending, currentBalance]
                );
                console.log(`Created balance for ${emp.employee_id}`);
            }
        }

        console.log('\n✅ Leave balance initialization completed!');
        
    } catch (error) {
        console.error('Error initializing leave balances:', error);
    } finally {
        process.exit();
    }
}

// Run the function
initializeLeaveBalances();