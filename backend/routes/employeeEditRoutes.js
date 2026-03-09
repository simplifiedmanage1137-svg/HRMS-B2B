// routes/employeeEditRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get pending edit requests for employee
router.get('/my-requests/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        const [requests] = await db.query(
            `SELECT * FROM admin_edit_requests 
             WHERE employee_id = ? AND status = 'pending'
             ORDER BY created_at DESC`,
            [employeeId]
        );
        
        res.json({
            success: true,
            requests
        });
        
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch requests',
            error: error.message
        });
    }
});

// Get employee's current data for editing
router.get('/my-data/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        const [employee] = await db.query(
            `SELECT * FROM employees WHERE employee_id = ?`,
            [employeeId]
        );
        
        if (employee.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Define editable fields
        const editableFields = [
            'phone', 'address', 'emergency_contact', 'blood_group',
            'pan_number', 'aadhar_number', 'bank_account_name', 
            'account_number', 'ifsc_code', 'branch_name', 'email'
        ];

        const employeeData = {};
        editableFields.forEach(field => {
            employeeData[field] = employee[0][field] || '';
        });

        res.json({
            success: true,
            employee: {
                employee_id: employee[0].employee_id,
                first_name: employee[0].first_name,
                last_name: employee[0].last_name,
                ...employeeData
            }
        });
        
    } catch (error) {
        console.error('Error fetching employee data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employee data',
            error: error.message
        });
    }
});

// Submit updates for approval
router.post('/submit-updates', async (req, res) => {
    try {
        const { employee_id, request_id, updates } = req.body;
        
        if (!employee_id || !updates || updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID and updates are required'
            });
        }

        // Get current employee data
        const [currentData] = await db.query(
            'SELECT * FROM employees WHERE employee_id = ?',
            [employee_id]
        );

        if (currentData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Insert each update submission
            for (const update of updates) {
                await connection.query(
                    `INSERT INTO employee_update_submissions 
                     (employee_id, request_id, field_name, old_value, new_value) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [employee_id, request_id || null, update.field, 
                     currentData[0][update.field] || '', update.value]
                );
            }

            // Mark the request as completed
            if (request_id) {
                await connection.query(
                    `UPDATE admin_edit_requests 
                     SET status = 'completed', completed_at = NOW()
                     WHERE id = ?`,
                    [request_id]
                );
            }

            // Notify admin
            await connection.query(
                `INSERT INTO notifications 
                 (user_id, user_role, title, message, type, related_type) 
                 VALUES ('ADMIN', 'admin', ?, ?, 'warning', 'updates_submitted')`,
                ['Employee Updates Submitted', 
                 `Employee ${currentData[0].first_name} ${currentData[0].last_name} has submitted ${updates.length} update(s) for approval.`]
            );

            await connection.commit();
            connection.release();

            res.json({
                success: true,
                message: 'Updates submitted for admin approval',
                update_count: updates.length
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Error submitting updates:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit updates',
            error: error.message
        });
    }
});

// Get employee's submission history
router.get('/my-submissions/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        const [submissions] = await db.query(
            `SELECT * FROM employee_update_submissions 
             WHERE employee_id = ? 
             ORDER BY submitted_at DESC`,
            [employeeId]
        );
        
        res.json({
            success: true,
            submissions
        });
        
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch submissions',
            error: error.message
        });
    }
});

module.exports = router;