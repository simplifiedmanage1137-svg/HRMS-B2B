const db = require('../config/database');

async function verifyLeaveBalance(employeeId) {
    try {
        console.log(`\n=== VERIFYING LEAVE BALANCE FOR ${employeeId} ===\n`);
        
        // Get employee details
        const [employee] = await db.query(
            'SELECT employee_id, first_name, last_name, joining_date FROM employees WHERE employee_id = ?',
            [employeeId]
        );

        if (employee.length === 0) {
            console.log('Employee not found');
            return;
        }

        const emp = employee[0];
        const joiningDate = new Date(emp.joining_date);
        const today = new Date();
        
        // Calculate months
        const yearsDiff = today.getFullYear() - joiningDate.getFullYear();
        let totalMonths = (yearsDiff * 12) + (today.getMonth() - joiningDate.getMonth());
        
        if (today.getDate() < joiningDate.getDate()) {
            totalMonths--;
        }

        // Add current month if past joining date
        if (today.getDate() >= joiningDate.getDate()) {
            totalMonths++;
        }

        // Calculate expected leaves (accrued from month 1)
        const expectedAccrued = totalMonths * 1.5;
        const isEligibleToApply = totalMonths >= 6;

        // Get used leaves
        const [usedLeaves] = await db.query(
            'SELECT SUM(days_count) as total FROM leaves WHERE employee_id = ? AND status = "approved"',
            [employeeId]
        );
        
        const [pendingLeaves] = await db.query(
            'SELECT SUM(days_count) as total FROM leaves WHERE employee_id = ? AND status = "pending"',
            [employeeId]
        );

        const used = usedLeaves[0]?.total || 0;
        const pending = pendingLeaves[0]?.total || 0;
        const expectedAvailable = expectedAccrued - used - pending;

        // Get database balance
        const [balance] = await db.query(
            'SELECT * FROM leave_balance WHERE employee_id = ?',
            [employeeId]
        );

        console.log('EMPLOYEE DETAILS:');
        console.log(`Name: ${emp.first_name} ${emp.last_name}`);
        console.log(`Employee ID: ${emp.employee_id}`);
        console.log(`Joining Date: ${emp.joining_date}`);
        console.log(`Today: ${today.toISOString().split('T')[0]}`);
        
        console.log('\nCALCULATION (Accrual from Month 1):');
        console.log(`Total months since joining: ${totalMonths}`);
        console.log(`Expected accrued leaves: ${expectedAccrued.toFixed(1)} (${totalMonths} × 1.5)`);
        console.log(`Used leaves: ${used}`);
        console.log(`Pending leaves: ${pending}`);
        console.log(`Expected available: ${expectedAvailable.toFixed(1)}`);
        console.log(`Eligible to apply: ${isEligibleToApply ? 'YES' : 'NO (need 6 months)'}`);
        
        console.log('\nDATABASE RECORD:');
        if (balance.length > 0) {
            console.log(`Total accrued: ${balance[0].total_accrued}`);
            console.log(`Total used: ${balance[0].total_used}`);
            console.log(`Total pending: ${balance[0].total_pending}`);
            console.log(`Current balance: ${balance[0].current_balance}`);
            
            console.log('\nVERIFICATION:');
            console.log(`Accrued matches: ${Math.abs(parseFloat(balance[0].total_accrued) - expectedAccrued) < 0.1 ? '✓' : '✗'}`);
            console.log(`Available matches: ${Math.abs(parseFloat(balance[0].current_balance) - expectedAvailable) < 0.1 ? '✓' : '✗'}`);
        } else {
            console.log('No database record found');
        }
        
        console.log('\n=====================================\n');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

// Get employee ID from command line
const employeeId = process.argv[2];
if (!employeeId) {
    console.log('Please provide employee ID');
    console.log('Usage: node verifyLeaveBalance.js B2B260203');
    process.exit(1);
}

verifyLeaveBalance(employeeId);