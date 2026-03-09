const db = require('../config/database');

async function resetAllBalances() {
    try {
        console.log('Resetting all leave balances...');
        
        const currentYear = new Date().getFullYear();
        
        // Delete all existing balances
        await db.query('DELETE FROM leave_transactions');
        await db.query('DELETE FROM leave_balance');
        
        console.log('Deleted all existing records');
        
        // Get all employees
        const [employees] = await db.query('SELECT employee_id, joining_date FROM employees');
        
        console.log(`Creating balances for ${employees.length} employees in ${currentYear}`);
        
        for (const emp of employees) {
            // Calculate completed months in current year
            const joiningDate = new Date(emp.joining_date);
            const joinYear = joiningDate.getFullYear();
            const joinMonth = joiningDate.getMonth() + 1;
            
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentDay = today.getDate();
            
            let completedMonths = 0;
            
            if (currentYear > joinYear) {
                // Joined in previous year
                for (let m = 1; m <= currentMonth; m++) {
                    if (m < currentMonth) {
                        completedMonths++;
                    } else if (m === currentMonth) {
                        const lastDay = new Date(currentYear, m, 0).getDate();
                        if (currentDay > lastDay) {
                            completedMonths++;
                        }
                    }
                }
            } else if (currentYear === joinYear) {
                // Joined in current year
                for (let m = joinMonth; m <= currentMonth; m++) {
                    if (m < currentMonth) {
                        completedMonths++;
                    } else if (m === currentMonth) {
                        const lastDay = new Date(currentYear, m, 0).getDate();
                        if (currentDay > lastDay) {
                            completedMonths++;
                        }
                    }
                }
            }
            
            const accrued = completedMonths * 1.5;
            
            await db.query(
                `INSERT INTO leave_balance 
                 (employee_id, leave_year, total_accrued, current_balance) 
                 VALUES (?, ?, ?, ?)`,
                [emp.employee_id, currentYear, accrued, accrued]
            );
            
            console.log(`Employee ${emp.employee_id}: ${completedMonths} months, ${accrued} leaves`);
        }
        
        console.log('All balances reset successfully!');
        
    } catch (error) {
        console.error('Error resetting balances:', error);
    } finally {
        process.exit();
    }
}

resetAllBalances();