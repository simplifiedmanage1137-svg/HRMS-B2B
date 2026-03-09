const db = require('../config/database');

async function fixAllBalances() {
    try {
        console.log('Fixing all employee leave balances...');
        
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();

        // Get all employees
        const [employees] = await db.query('SELECT employee_id, joining_date FROM employees');
        
        console.log(`Found ${employees.length} employees`);
        console.log(`Current date: ${today.toISOString().split('T')[0]}`);
        console.log(`Current year: ${currentYear}, Month: ${currentMonth}, Day: ${currentDay}`);
        console.log('='.repeat(50));

        for (const emp of employees) {
            const joiningDate = new Date(emp.joining_date);
            const joinYear = joiningDate.getFullYear();
            const joinMonth = joiningDate.getMonth() + 1;

            // Calculate completed months in CURRENT YEAR
            let completedMonths = 0;
            
            if (currentYear > joinYear) {
                // Joined in previous year - count all completed months in current year
                for (let month = 1; month <= currentMonth; month++) {
                    if (month < currentMonth) {
                        completedMonths++;
                    } else if (month === currentMonth) {
                        const lastDay = new Date(currentYear, month, 0).getDate();
                        if (currentDay > lastDay) {
                            completedMonths++;
                        }
                    }
                }
            } else if (currentYear === joinYear) {
                // Joined in current year - count months from join month
                for (let month = joinMonth; month <= currentMonth; month++) {
                    if (month < currentMonth) {
                        completedMonths++;
                    } else if (month === currentMonth) {
                        const lastDay = new Date(currentYear, month, 0).getDate();
                        if (currentDay > lastDay) {
                            completedMonths++;
                        }
                    }
                }
            }

            const expectedAccrued = completedMonths * 1.5;

            // Check if balance exists for current year
            const [existing] = await db.query(
                'SELECT * FROM leave_balance WHERE employee_id = ? AND leave_year = ?',
                [emp.employee_id, currentYear]
            );

            if (existing.length === 0) {
                // Create new balance
                await db.query(
                    `INSERT INTO leave_balance 
                     (employee_id, leave_year, total_accrued, total_used, total_pending, current_balance) 
                     VALUES (?, ?, ?, 0, 0, ?)`,
                    [emp.employee_id, currentYear, expectedAccrued, expectedAccrued]
                );
                console.log(`✅ Created balance for ${emp.employee_id}: ${expectedAccrued} leaves`);
            } else {
                // Update existing balance
                const currentAccrued = parseFloat(existing[0].total_accrued) || 0;
                
                if (currentAccrued !== expectedAccrued) {
                    await db.query(
                        `UPDATE leave_balance 
                         SET total_accrued = ?, 
                             current_balance = ? - total_used - total_pending
                         WHERE employee_id = ? AND leave_year = ?`,
                        [expectedAccrued, expectedAccrued, emp.employee_id, currentYear]
                    );
                    console.log(`🔄 Updated balance for ${emp.employee_id}: ${currentAccrued} → ${expectedAccrued} leaves`);
                } else {
                    console.log(`✓ Balance correct for ${emp.employee_id}: ${expectedAccrued} leaves`);
                }
            }
        }

        console.log('='.repeat(50));
        console.log('All balances fixed successfully!');

    } catch (error) {
        console.error('Error fixing balances:', error);
    } finally {
        process.exit();
    }
}

fixAllBalances();