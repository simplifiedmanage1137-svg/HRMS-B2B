const db = require('../config/database');

class LeaveYearlyService {
    
    // Get current year
    static getCurrentYear() {
        return new Date().getFullYear();
    }

    // Check if a month is completed (current date is past month end)
    static isMonthCompleted(year, month) {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();
        
        // Get last day of the month
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        
        // Month is completed if:
        // 1. We're in a future year, OR
        // 2. We're in a future month, OR
        // 3. We're in the same month but past the last day (next month)
        if (year < currentYear) return true; // Previous years are fully completed
        if (year > currentYear) return false; // Future years not started
        
        // Current year
        if (month < currentMonth) return true; // Previous months completed
        if (month > currentMonth) return false; // Future months not started
        
        // Current month - check if we're past the last day
        return currentDay > lastDayOfMonth; // True on 1st of next month
    }

    // Get completed months for a specific year
    static getCompletedMonthsInYear(year) {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();
        
        if (year < currentYear) return 12; // Previous years - all months completed
        if (year > currentYear) return 0; // Future years - no months completed
        
        // Current year - count completed months
        let completedMonths = 0;
        for (let month = 1; month <= 12; month++) {
            if (this.isMonthCompleted(year, month)) {
                completedMonths++;
            }
        }
        return completedMonths;
    }

    // Initialize leave balance for new employee
    static async initializeEmployeeBalance(employee_id, joiningDate) {
        try {
            const currentYear = this.getCurrentYear();
            
            // Create zero balance for current year
            await db.query(
                `INSERT INTO leave_balance 
                 (employee_id, leave_year, total_accrued, total_used, total_pending, current_balance) 
                 VALUES (?, ?, 0, 0, 0, 0)`,
                [employee_id, currentYear]
            );
            
            console.log(`Initialized zero balance for ${employee_id} for year ${currentYear}`);
            
            return {
                employee_id,
                leave_year: currentYear,
                total_accrued: 0,
                current_balance: 0
            };

        } catch (error) {
            console.error('Error initializing employee balance:', error);
            throw error;
        }
    }

    // Get current year balance
    static async getCurrentYearBalance(employee_id) {
        const currentYear = this.getCurrentYear();
        
        try {
            const [balance] = await db.query(
                'SELECT * FROM leave_balance WHERE employee_id = ? AND leave_year = ?',
                [employee_id, currentYear]
            );

            if (balance.length === 0) {
                // Create zero balance if not exists
                await this.initializeEmployeeBalance(employee_id, new Date());
                
                const [newBalance] = await db.query(
                    'SELECT * FROM leave_balance WHERE employee_id = ? AND leave_year = ?',
                    [employee_id, currentYear]
                );
                
                return {
                    ...newBalance[0],
                    total_accrued: parseFloat(newBalance[0].total_accrued) || 0,
                    total_used: parseFloat(newBalance[0].total_used) || 0,
                    total_pending: parseFloat(newBalance[0].total_pending) || 0,
                    current_balance: parseFloat(newBalance[0].current_balance) || 0
                };
            }

            return {
                ...balance[0],
                total_accrued: parseFloat(balance[0].total_accrued) || 0,
                total_used: parseFloat(balance[0].total_used) || 0,
                total_pending: parseFloat(balance[0].total_pending) || 0,
                current_balance: parseFloat(balance[0].current_balance) || 0
            };
        } catch (error) {
            console.error('Error getting current year balance:', error);
            throw error;
        }
    }

// Add monthly accrual for completed months in CURRENT YEAR ONLY
static async addMonthlyAccrual(employee_id) {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const currentYear = this.getCurrentYear();
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();
        
        // Get employee joining date
        const [employee] = await connection.query(
            'SELECT joining_date FROM employees WHERE employee_id = ?',
            [employee_id]
        );
        
        if (employee.length === 0) {
            throw new Error('Employee not found');
        }

        const joiningDate = new Date(employee[0].joining_date);
        
        // Calculate how many months in current year are COMPLETED
        let completedMonthsInYear = 0;
        
        for (let month = 1; month <= currentMonth; month++) {
            if (month < currentMonth) {
                completedMonthsInYear++;
            } else if (month === currentMonth) {
                const lastDayOfMonth = new Date(currentYear, month, 0).getDate();
                if (currentDay > lastDayOfMonth) {
                    completedMonthsInYear++;
                }
            }
        }

        console.log(`Employee ${employee_id}: ${completedMonthsInYear} completed months in ${currentYear}`);

        // Expected accrual for current year
        const expectedAccrued = completedMonthsInYear * 1.5;

        // Get current balance for current year
        let [balance] = await connection.query(
            'SELECT * FROM leave_balance WHERE employee_id = ? AND leave_year = ?',
            [employee_id, currentYear]
        );

        if (balance.length === 0) {
            // Create new balance for current year
            await connection.query(
                `INSERT INTO leave_balance 
                 (employee_id, leave_year, total_accrued, current_balance) 
                 VALUES (?, ?, ?, ?)`,
                [employee_id, currentYear, expectedAccrued, expectedAccrued]
            );
            console.log(`Created new balance for ${employee_id} in ${currentYear} with ${expectedAccrued} leaves`);
        } else {
            const currentAccrued = parseFloat(balance[0].total_accrued) || 0;
            
            // Only add if expected is greater than current
            if (expectedAccrued > currentAccrued) {
                const additional = expectedAccrued - currentAccrued;
                
                await connection.query(
                    `UPDATE leave_balance 
                     SET total_accrued = ?, 
                         current_balance = current_balance + ? 
                     WHERE employee_id = ? AND leave_year = ?`,
                    [expectedAccrued, additional, employee_id, currentYear]
                );

                // Record transaction
                await connection.query(
                    `INSERT INTO leave_transactions 
                     (employee_id, leave_year, transaction_date, transaction_type, amount, description) 
                     VALUES (?, ?, ?, 'accrual', 1.5, ?)`,
                    [employee_id, currentYear, today, 
                     `Monthly leave accrual for month ${completedMonthsInYear} in ${currentYear}`]
                );

                console.log(`Added ${additional} leaves to ${employee_id} in ${currentYear}`);
            }
        }

        await connection.commit();
        
        const updatedBalance = await this.getCurrentYearBalance(employee_id);
        return { 
            success: true, 
            balance: updatedBalance,
            completedMonths: completedMonthsInYear
        };

    } catch (error) {
        await connection.rollback();
        console.error('Error adding monthly accrual:', error);
        throw error;
    } finally {
        connection.release();
    }
}

    // Reset all employees for new year (run on Jan 1)
    static async resetForNewYear() {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            const previousYear = this.getCurrentYear() - 1;
            const currentYear = this.getCurrentYear();
            
            console.log(`Resetting leaves from ${previousYear} to ${currentYear}`);

            // Get all employees
            const [employees] = await connection.query(
                'SELECT employee_id FROM employees'
            );

            for (const emp of employees) {
                // Get previous year's balance
                const [prevBalance] = await connection.query(
                    'SELECT * FROM leave_balance WHERE employee_id = ? AND leave_year = ?',
                    [emp.employee_id, previousYear]
                );

                if (prevBalance.length > 0) {
                    const remainingLeaves = parseFloat(prevBalance[0].current_balance) || 0;
                    
                    // Record that leaves expired
                    if (remainingLeaves > 0) {
                        await connection.query(
                            `INSERT INTO leave_transactions 
                             (employee_id, leave_year, transaction_date, transaction_type, amount, description) 
                             VALUES (?, ?, CURDATE(), 'yearly_reset', ?, ?)`,
                            [emp.employee_id, previousYear, -remainingLeaves, 
                             `${remainingLeaves} leaves expired on Dec 31, ${previousYear}`]
                        );
                        console.log(`${remainingLeaves} leaves expired for ${emp.employee_id}`);
                    }
                }

                // Check if balance already exists for current year
                const [existing] = await connection.query(
                    'SELECT * FROM leave_balance WHERE employee_id = ? AND leave_year = ?',
                    [emp.employee_id, currentYear]
                );

                if (existing.length === 0) {
                    // Create new zero balance for current year
                    await connection.query(
                        `INSERT INTO leave_balance 
                         (employee_id, leave_year, total_accrued, total_used, total_pending, current_balance) 
                         VALUES (?, ?, 0, 0, 0, 0)`,
                        [emp.employee_id, currentYear]
                    );
                    
                    console.log(`Created new zero balance for ${emp.employee_id} for year ${currentYear}`);
                }
            }

            await connection.commit();
            console.log('Yearly reset completed successfully');
            
            return { 
                success: true, 
                message: `Leaves reset for year ${currentYear}` 
            };

        } catch (error) {
            await connection.rollback();
            console.error('Error resetting leaves for new year:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Deduct leaves when applying
    static async deductLeaves(employee_id, leaveId, days) {
        const connection = await db.getConnection();
        const currentYear = this.getCurrentYear();
        
        try {
            await connection.beginTransaction();

            await connection.query(
                `UPDATE leave_balance 
                 SET total_pending = total_pending + ?, 
                     current_balance = current_balance - ? 
                 WHERE employee_id = ? AND leave_year = ?`,
                [days, days, employee_id, currentYear]
            );

            await connection.query(
                `INSERT INTO leave_transactions 
                 (employee_id, leave_year, transaction_date, transaction_type, leave_id, amount, description) 
                 VALUES (?, ?, CURDATE(), 'leave_application', ?, ?, ?)`,
                [employee_id, currentYear, leaveId, -days, `Leave application for ${days} days in ${currentYear}`]
            );

            await connection.commit();
            
            return await this.getCurrentYearBalance(employee_id);

        } catch (error) {
            await connection.rollback();
            console.error('Error deducting leaves:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Update leave status
    static async updateLeaveStatus(employee_id, leaveId, days, oldStatus, newStatus) {
        const connection = await db.getConnection();
        const currentYear = this.getCurrentYear();
        
        try {
            await connection.beginTransaction();

            if (oldStatus === 'pending' && newStatus === 'approved') {
                await connection.query(
                    `UPDATE leave_balance 
                     SET total_pending = total_pending - ?, 
                         total_used = total_used + ? 
                     WHERE employee_id = ? AND leave_year = ?`,
                    [days, days, employee_id, currentYear]
                );

                await connection.query(
                    `INSERT INTO leave_transactions 
                     (employee_id, leave_year, transaction_date, transaction_type, leave_id, amount, description) 
                     VALUES (?, ?, CURDATE(), 'leave_approved', ?, ?, ?)`,
                    [employee_id, currentYear, leaveId, -days, `Leave approved - ${days} days deducted from ${currentYear}`]
                );

            } else if (oldStatus === 'pending' && newStatus === 'rejected') {
                await connection.query(
                    `UPDATE leave_balance 
                     SET total_pending = total_pending - ?, 
                         current_balance = current_balance + ? 
                     WHERE employee_id = ? AND leave_year = ?`,
                    [days, days, employee_id, currentYear]
                );

                await connection.query(
                    `INSERT INTO leave_transactions 
                     (employee_id, leave_year, transaction_date, transaction_type, leave_id, amount, description) 
                     VALUES (?, ?, CURDATE(), 'leave_rejected', ?, ?, ?)`,
                    [employee_id, currentYear, leaveId, days, `Leave rejected - ${days} days returned to ${currentYear} balance`]
                );
            }

            await connection.commit();
            
            return await this.getCurrentYearBalance(employee_id);

        } catch (error) {
            await connection.rollback();
            console.error('Error updating leave status:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = LeaveYearlyService;