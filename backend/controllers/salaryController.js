const db = require('../config/database');


// Generate salary slip for an employee
exports.generateSalarySlip = async (req, res) => {
    try {
        const { employee_id, month, year } = req.body;

        if (!employee_id || !month || !year) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID, month and year are required'
            });
        }

        // Get employee details with joining date
        const [employee] = await db.query(
            'SELECT * FROM employees WHERE employee_id = ?',
            [employee_id]
        );

        if (employee.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const emp = employee[0];
        
        // Validate joining date
        const joiningDate = new Date(emp.joining_date);
        const requestedDate = new Date(year, month - 1, 1);
        
        joiningDate.setDate(1);
        joiningDate.setHours(0, 0, 0, 0);
        requestedDate.setHours(0, 0, 0, 0);

        if (requestedDate < joiningDate) {
            const joiningMonth = joiningDate.toLocaleString('default', { month: 'long' });
            const joiningYear = joiningDate.getFullYear();
            
            return res.status(400).json({
                success: false,
                message: `You cannot generate salary slip for months before your joining date. You joined in ${joiningMonth} ${joiningYear}.`
            });
        }

        // Check if salary slip already exists
        const [existing] = await db.query(
            'SELECT * FROM salary_slips WHERE employee_id = ? AND month = ? AND year = ?',
            [employee_id, month, year]
        );

        if (existing.length > 0) {
            return res.json({
                success: true,
                message: 'Salary slip already exists',
                salarySlip: existing[0]
            });
        }

        // Get basic salary (prefer gross_salary if available)
        const rawSalary = String(emp.gross_salary || emp.salary || '0').replace(/[^0-9.]/g, '');
        const basicSalary = parseFloat(rawSalary) || 0;

        // Fixed deduction amount
        const dt = 200;
        
        // Calculate net salary
        const netSalary = basicSalary - dt;

        // Insert salary slip with correct calculation
        const [result] = await db.query(
            `INSERT INTO salary_slips 
            (employee_id, month, year, basic_salary, dt, total_deductions, net_salary, generated_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                employee_id, 
                month, 
                year, 
                basicSalary, 
                dt, 
                dt, 
                netSalary
            ]
        );

        // Get the inserted salary slip
        const [newSlip] = await db.query(
            'SELECT * FROM salary_slips WHERE id = ?',
            [result.insertId]
        );

        // Create notification
        try {
            await db.query(
                'INSERT INTO notifications (employee_id, message, type, created_at) VALUES (?, ?, ?, NOW())',
                [employee_id, `Salary slip for ${getMonthName(month)} ${year} has been generated.`, 'salary']
            );
        } catch (notifError) {
            console.log('Notification error:', notifError);
        }

        res.status(201).json({
            success: true,
            message: 'Salary slip generated successfully',
            salarySlip: newSlip[0]
        });

    } catch (error) {
        console.error('Error generating salary slip:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate salary slip',
            error: error.message
        });
    }
};


// Get all salary slips for an employee
exports.getEmployeeSalarySlips = async (req, res) => {
    try {
        const { employee_id } = req.params;

        // Get employee joining date
        const [employee] = await db.query(
            'SELECT joining_date FROM employees WHERE employee_id = ?',
            [employee_id]
        );

        if (employee.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const joiningDate = new Date(employee[0].joining_date);
        const joiningMonth = joiningDate.getMonth() + 1;
        const joiningYear = joiningDate.getFullYear();

        // Get all salary slips for this employee
        const [slips] = await db.query(
            `SELECT * FROM salary_slips 
             WHERE employee_id = ? 
             ORDER BY year DESC, month DESC`,
            [employee_id]
        );

        // Add validation info to response
        res.json({
            success: true,
            salarySlips: slips,
            joiningInfo: {
                month: joiningMonth,
                year: joiningYear,
                date: employee[0].joining_date,
                formattedDate: joiningDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
            }
        });

    } catch (error) {
        console.error('Error fetching salary slips:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch salary slips',
            error: error.message
        });
    }
};

// Helper function to get month name
function getMonthName(monthNumber) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthNumber - 1] || 'Unknown';
}

exports.getSalarySlipById = async (req, res) => {
    try {
        const { id } = req.params;

        const [slips] = await db.query(
            `SELECT s.*, e.first_name, e.last_name, e.employee_id, e.department, e.position, e.joining_date
             FROM salary_slips s
             JOIN employees e ON s.employee_id = e.employee_id
             WHERE s.id = ?`,
            [id]
        );

        if (slips.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Salary slip not found'
            });
        }

        const slip = slips[0];
        const joiningDate = new Date(slip.joining_date);
        const slipDate = new Date(slip.year, slip.month - 1, 1);

        // Validate that slip is not before joining date
        if (slipDate < joiningDate) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: This salary slip is from before your joining date'
            });
        }

        res.json({
            success: true,
            salarySlip: slip
        });

    } catch (error) {
        console.error('Error fetching salary slip:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch salary slip',
            error: error.message
        });
    }
};

exports.getSalarySlipByMonth = async (req, res) => {
    try {
        const { employee_id, month, year } = req.params;

        // First check if employee exists and get joining date
        const [employee] = await db.query(
            'SELECT joining_date FROM employees WHERE employee_id = ?',
            [employee_id]
        );

        if (employee.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const joiningDate = new Date(employee[0].joining_date);
        const requestedDate = new Date(year, month - 1, 1);

        // Validate that requested month is not before joining date
        if (requestedDate < joiningDate) {
            return res.status(403).json({
                success: false,
                message: 'Cannot access salary slips from before your joining date'
            });
        }

        const [slips] = await db.query(
            `SELECT s.*, e.first_name, e.last_name, e.employee_id, e.department, e.position 
             FROM salary_slips s
             JOIN employees e ON s.employee_id = e.employee_id
             WHERE s.employee_id = ? AND s.month = ? AND s.year = ?`,
            [employee_id, month, year]
        );

        if (slips.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Salary slip not found for this month'
            });
        }

        res.json({
            success: true,
            salarySlip: slips[0]
        });

    } catch (error) {
        console.error('Error fetching salary slip:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch salary slip',
            error: error.message
        });
    }
};

// Get specific salary slip
exports.getSalarySlipById = async (req, res) => {
    try {
        const { id } = req.params;

        const [slips] = await db.query(
            `SELECT s.*, e.first_name, e.last_name, e.employee_id, e.department, e.position 
             FROM salary_slips s
             JOIN employees e ON s.employee_id = e.employee_id
             WHERE s.id = ?`,
            [id]
        );

        if (slips.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Salary slip not found'
            });
        }

        res.json({
            success: true,
            salarySlip: slips[0]
        });

    } catch (error) {
        console.error('Error fetching salary slip:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch salary slip',
            error: error.message
        });
    }
};

// Get salary slip by month and year
exports.getSalarySlipByMonth = async (req, res) => {
    try {
        const { employee_id, month, year } = req.params;

        const [slips] = await db.query(
            `SELECT s.*, e.first_name, e.last_name, e.employee_id, e.department, e.position 
             FROM salary_slips s
             JOIN employees e ON s.employee_id = e.employee_id
             WHERE s.employee_id = ? AND s.month = ? AND s.year = ?`,
            [employee_id, month, year]
        );

        if (slips.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Salary slip not found for this month'
            });
        }

        res.json({
            success: true,
            salarySlip: slips[0]
        });

    } catch (error) {
        console.error('Error fetching salary slip:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch salary slip',
            error: error.message
        });
    }
};

// Generate salary slips for all employees for a specific month (Admin only)
exports.generateBulkSalarySlips = async (req, res) => {
    try {
        const { month, year } = req.body;

        // Get all active employees
        const [employees] = await db.query('SELECT employee_id, salary FROM employees');

        const results = [];

        for (const emp of employees) {
            try {
                // Check if slip already exists
                const [existing] = await db.query(
                    'SELECT * FROM salary_slips WHERE employee_id = ? AND month = ? AND year = ?',
                    [emp.employee_id, month, year]
                );

                if (existing.length === 0) {
                    // Generate salary slip for this employee
                    const basicSalary = parseFloat(emp.salary);
                    
                    // SIMPLIFIED CALCULATIONS
                    const grossEarnings = basicSalary;
                    const dt = 200;
                    const totalDeductions = dt;
                    const netSalary = basicSalary - dt;

                    await db.query(
                        `INSERT INTO salary_slips 
                        (employee_id, month, year, basic_salary, hra, conveyance, medical, special, 
                        gross_earnings, pf, esi, tds, pt, dt, total_deductions, net_salary, generated_date) 
                        VALUES (?, ?, ?, ?, 0, 0, 0, 0, ?, 0, 0, 0, 0, ?, ?, ?, NOW())`,
                        [
                            emp.employee_id, month, year, basicSalary,
                            grossEarnings, dt, totalDeductions, netSalary
                        ]
                    );

                    results.push({
                        employee_id: emp.employee_id,
                        status: 'success'
                    });
                } else {
                    results.push({
                        employee_id: emp.employee_id,
                        status: 'already_exists'
                    });
                }
            } catch (empError) {
                results.push({
                    employee_id: emp.employee_id,
                    status: 'failed',
                    error: empError.message
                });
            }
        }

        res.json({
            success: true,
            message: 'Bulk salary slip generation completed',
            results
        });

    } catch (error) {
        console.error('Error generating bulk salary slips:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate bulk salary slips',
            error: error.message
        });
    }
};

// Mark salary as paid (Admin only)
exports.markAsPaid = async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_mode, notes } = req.body;

        await db.query(
            `UPDATE salary_slips 
             SET is_paid = TRUE, payment_date = CURDATE(), payment_mode = ?, notes = ? 
             WHERE id = ?`,
            [payment_mode, notes, id]
        );

        res.json({
            success: true,
            message: 'Salary marked as paid'
        });

    } catch (error) {
        console.error('Error marking salary as paid:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark salary as paid'
        });
    }
};

// Delete salary slip (Admin only)
exports.deleteSalarySlip = async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('DELETE FROM salary_slips WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Salary slip deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting salary slip:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete salary slip'
        });
    }
};