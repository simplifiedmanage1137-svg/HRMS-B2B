const db = require('../config/database');

class EmployeeService {
    
    // Calculate months between two dates
    static calculateMonthsBetween(joiningDate, currentDate = new Date()) {
        const join = new Date(joiningDate);
        const current = new Date(currentDate);
        
        let months = (current.getFullYear() - join.getFullYear()) * 12;
        months -= join.getMonth();
        months += current.getMonth();
        
        // Adjust for day of month
        if (current.getDate() < join.getDate()) {
            months--;
        }
        
        return Math.max(0, months);
    }

    // Update joining_month_count for a single employee
    static async updateEmployeeMonths(employeeId) {
        try {
            // Get employee joining date
            const [employee] = await db.query(
                'SELECT joining_date FROM employees WHERE employee_id = ?',
                [employeeId]
            );

            if (employee.length === 0) {
                console.log(`Employee ${employeeId} not found`);
                return false;
            }

            const joiningDate = employee[0].joining_date;
            const monthsCompleted = this.calculateMonthsBetween(joiningDate);
            
            // Determine if employee can apply for leave (after 6 months)
            const canApplyLeave = monthsCompleted >= 6;

            // Update the employee record
            await db.query(
                `UPDATE employees 
                 SET joining_month_count = ?, 
                     can_apply_leave = ? 
                 WHERE employee_id = ?`,
                [monthsCompleted, canApplyLeave, employeeId]
            );

            console.log(`Updated ${employeeId}: months=${monthsCompleted}, canApply=${canApplyLeave}`);
            return { monthsCompleted, canApplyLeave };

        } catch (error) {
            console.error(`Error updating months for employee ${employeeId}:`, error);
            throw error;
        }
    }

    // Update all employees' joining_month_count
    static async updateAllEmployeesMonths() {
        try {
            const [employees] = await db.query('SELECT employee_id, joining_date FROM employees');
            
            console.log(`Updating months for ${employees.length} employees...`);
            
            const results = [];
            
            for (const emp of employees) {
                const monthsCompleted = this.calculateMonthsBetween(emp.joining_date);
                const canApplyLeave = monthsCompleted >= 6;
                
                await db.query(
                    `UPDATE employees 
                     SET joining_month_count = ?, 
                         can_apply_leave = ? 
                     WHERE employee_id = ?`,
                    [monthsCompleted, canApplyLeave, emp.employee_id]
                );
                
                results.push({
                    employee_id: emp.employee_id,
                    months: monthsCompleted,
                    canApply: canApplyLeave
                });
            }
            
            console.log('All employees updated successfully');
            return results;

        } catch (error) {
            console.error('Error updating all employees:', error);
            throw error;
        }
    }

    // Initialize for new employee
    static async initializeNewEmployee(employeeId, joiningDate) {
        try {
            const monthsCompleted = this.calculateMonthsBetween(joiningDate);
            const canApplyLeave = monthsCompleted >= 6;
            
            await db.query(
                `UPDATE employees 
                 SET joining_month_count = ?, 
                     can_apply_leave = ? 
                 WHERE employee_id = ?`,
                [monthsCompleted, canApplyLeave, employeeId]
            );
            
            console.log(`Initialized new employee ${employeeId}: months=${monthsCompleted}`);
            return { monthsCompleted, canApplyLeave };

        } catch (error) {
            console.error(`Error initializing employee ${employeeId}:`, error);
            throw error;
        }
    }
}

module.exports = EmployeeService;