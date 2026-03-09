// routes/adminUpdateRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Get all employees for admin
router.get('/employees', verifyToken, isAdmin, async (req, res) => {
    try {
        console.log('📋 Fetching employees for admin...');
        
        // First check if employees table exists
        const [tables] = await db.query("SHOW TABLES LIKE 'employees'");
        if (tables.length === 0) {
            console.error('❌ Employees table does not exist');
            return res.status(500).json({ 
                success: false, 
                message: 'Database table not found' 
            });
        }

        // Check which columns exist
        const [columns] = await db.query("SHOW COLUMNS FROM employees");
        const columnNames = columns.map(col => col.Field);
        
        // Build query based on existing columns
        let query = 'SELECT id, employee_id, first_name, last_name, email';
        
        // Add optional columns if they exist
        if (columnNames.includes('designation')) query += ', designation';
        if (columnNames.includes('department')) query += ', department';
        if (columnNames.includes('phone')) query += ', phone';
        
        query += ' FROM employees';
        
        // Add is_active filter if column exists
        if (columnNames.includes('is_active')) {
            query += ' WHERE is_active = 1 OR is_active IS NULL';
        }
        
        query += ' ORDER BY first_name ASC';

        console.log('Executing query:', query);
        
        const [employees] = await db.query(query);

        console.log(`✅ Found ${employees.length} employees`);
        res.json(employees);

    } catch (error) {
        console.error('❌ Error fetching employees:', error);
        console.error('SQL Error:', error.sqlMessage || error.message);
        
        // Return empty array instead of error to prevent frontend crash
        res.json([]);
    }
});

// Get pending requests count
router.get('/pending-count', verifyToken, isAdmin, async (req, res) => {
    try {
        // Check if table exists
        const [tables] = await db.query("SHOW TABLES LIKE 'update_requests'");
        if (tables.length === 0) {
            return res.json({ count: 0 });
        }

        const [result] = await db.query(
            `SELECT COUNT(*) as count FROM update_requests 
             WHERE status = 'completed'`
        );

        res.json({ count: result[0].count });

    } catch (error) {
        console.error('❌ Error fetching pending count:', error);
        res.json({ count: 0 });
    }
});

module.exports = router;

// Get all pending requests
router.get('/pending-requests', verifyToken, isAdmin, async (req, res) => {
    try {
        console.log('📋 Fetching pending update requests...');

        // Check if table exists
        const [tables] = await db.query("SHOW TABLES LIKE 'update_requests'");
        if (tables.length === 0) {
            return res.json([]);
        }

        const [requests] = await db.query(
            `SELECT ur.*, 
                    e.first_name, e.last_name, e.email, e.designation, e.department
             FROM update_requests ur
             LEFT JOIN employees e ON ur.employee_id = e.employee_id
             WHERE ur.status IN ('pending', 'in_progress')
             ORDER BY ur.created_at DESC`
        );

        // Parse JSON fields safely
        const formattedRequests = requests.map(req => {
            try {
                return {
                    ...req,
                    requested_fields: req.requested_fields ? JSON.parse(req.requested_fields) : [],
                    employee_data: req.employee_data ? JSON.parse(req.employee_data) : null
                };
            } catch (e) {
                return {
                    ...req,
                    requested_fields: [],
                    employee_data: null
                };
            }
        });

        res.json(formattedRequests);

    } catch (error) {
        console.error('❌ Error fetching pending requests:', error);
        res.json([]);
    }
});

// Send update request
router.post('/send-request', verifyToken, isAdmin, async (req, res) => {
    let connection;
    try {
        const { employee_id, requested_fields, notes } = req.body;
        
        console.log('📝 Sending update request to employee:', employee_id);

        // Check if update_requests table exists
        const [tables] = await db.query("SHOW TABLES LIKE 'update_requests'");
        if (tables.length === 0) {
            return res.status(500).json({ 
                success: false, 
                message: 'Database table not configured. Please contact administrator.' 
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [result] = await connection.query(
            `INSERT INTO update_requests 
             (employee_id, admin_id, requested_fields, status, created_at) 
             VALUES (?, ?, ?, 'pending', NOW())`,
            [employee_id, req.userId, JSON.stringify(requested_fields || [])]
        );

        await connection.commit();

        res.status(201).json({ 
            success: true,
            message: 'Update request sent successfully',
            request_id: result.insertId
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Error sending update request:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error sending update request',
            error: error.message 
        });
    } finally {
        if (connection) connection.release();
    }
});

// routes/adminUpdateRoutes.js
router.get('/completed-requests', verifyToken, isAdmin, async (req, res) => {
    try {
        console.log('📋 Fetching completed update requests...');

        // Check if update_requests table exists
        const [tables] = await db.query("SHOW TABLES LIKE 'update_requests'");
        if (tables.length === 0) {
            console.log('ℹ️ update_requests table does not exist');
            return res.json([]); // Return empty array if table doesn't exist
        }

        // First check which columns exist in update_requests
        const [columns] = await db.query("SHOW COLUMNS FROM update_requests");
        const columnNames = columns.map(col => col.Field);
        console.log('📊 update_requests columns:', columnNames);

        // Check employees table columns
        const [empColumns] = await db.query("SHOW COLUMNS FROM employees");
        const empColumnNames = empColumns.map(col => col.Field);
        console.log('📊 employees columns:', empColumnNames);

        // Build query based on existing columns
        let query = `
            SELECT ur.id, ur.employee_id, ur.admin_id, ur.status, 
                   ur.created_at, ur.updated_at
        `;

        // Add optional columns if they exist
        if (columnNames.includes('requested_fields')) {
            query += `, ur.requested_fields`;
        } else {
            query += `, NULL as requested_fields`;
        }

        if (columnNames.includes('employee_data')) {
            query += `, ur.employee_data`;
        } else {
            query += `, NULL as employee_data`;
        }

        if (columnNames.includes('notes')) {
            query += `, ur.notes`;
        } else {
            query += `, NULL as notes`;
        }

        // Add employee details
        query += `, e.id as emp_db_id`;

        if (empColumnNames.includes('first_name')) {
            query += `, e.first_name`;
        } else {
            query += `, NULL as first_name`;
        }

        if (empColumnNames.includes('last_name')) {
            query += `, e.last_name`;
        } else {
            query += `, NULL as last_name`;
        }

        if (empColumnNames.includes('email')) {
            query += `, e.email`;
        } else {
            query += `, NULL as email`;
        }

        if (empColumnNames.includes('designation')) {
            query += `, e.designation`;
        } else {
            query += `, NULL as designation`;
        }

        if (empColumnNames.includes('department')) {
            query += `, e.department`;
        } else {
            query += `, NULL as department`;
        }

        if (empColumnNames.includes('phone')) {
            query += `, e.phone`;
        } else {
            query += `, NULL as phone`;
        }

        query += ` FROM update_requests ur
                  LEFT JOIN employees e ON ur.employee_id = e.employee_id
                  WHERE ur.status = 'completed'
                  ORDER BY ur.updated_at DESC`;

        console.log('📝 Executing query:', query);

        const [requests] = await db.query(query);
        console.log(`✅ Found ${requests.length} completed requests`);

        // Parse JSON fields safely
        const formattedRequests = requests.map(req => {
            try {
                const formatted = { ...req };
                
                // Parse requested_fields if it exists and is a string
                if (req.requested_fields && typeof req.requested_fields === 'string') {
                    try {
                        formatted.requested_fields = JSON.parse(req.requested_fields);
                    } catch (e) {
                        console.log('⚠️ Error parsing requested_fields for request', req.id);
                        formatted.requested_fields = [];
                    }
                } else {
                    formatted.requested_fields = [];
                }

                // Parse employee_data if it exists and is a string
                if (req.employee_data && typeof req.employee_data === 'string') {
                    try {
                        formatted.employee_data = JSON.parse(req.employee_data);
                    } catch (e) {
                        console.log('⚠️ Error parsing employee_data for request', req.id);
                        formatted.employee_data = {};
                    }
                } else {
                    formatted.employee_data = {};
                }

                // Create employeeDetails object
                formatted.employeeDetails = {
                    first_name: req.first_name,
                    last_name: req.last_name,
                    email: req.email,
                    designation: req.designation,
                    department: req.department,
                    phone: req.phone
                };

                return formatted;
            } catch (e) {
                console.error('❌ Error formatting request:', req.id, e);
                return {
                    ...req,
                    requested_fields: [],
                    employee_data: {},
                    employeeDetails: {}
                };
            }
        });

        res.json(formattedRequests);

    } catch (error) {
        console.error('❌ Error fetching completed requests:', error);
        console.error('❌ SQL Error:', error.sqlMessage || error.message);
        
        // Return empty array instead of 500 error
        res.json([]);
    }
});

// routes/adminUpdateRoutes.js - Add this endpoint

// routes/adminUpdateRoutes.js - Complete fixed version
router.post('/handle-request', verifyToken, isAdmin, async (req, res) => {
    let connection;
    try {
        const { request_id, action } = req.body;
        
        console.log(`📝 ${action}ing update request: ${request_id}`);

        // Check if tables exist
        const [tables] = await db.query("SHOW TABLES LIKE 'update_requests'");
        if (tables.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Update requests table not found' 
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get request details
        const [requests] = await connection.query(
            `SELECT * FROM update_requests WHERE id = ?`,
            [request_id]
        );

        if (requests.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'Request not found' 
            });
        }

        const request = requests[0];

        // Check notifications table structure
        const [notifColumns] = await connection.query("SHOW COLUMNS FROM notifications");
        const notifColumnNames = notifColumns.map(col => col.Field);
        console.log('📊 Notifications columns:', notifColumnNames);

        if (action === 'approve') {
            // Parse employee data
            let employeeData = {};
            try {
                employeeData = JSON.parse(request.employee_data || '{}');
            } catch (e) {
                console.log('⚠️ Error parsing employee_data:', e);
                employeeData = {};
            }
            
            if (Object.keys(employeeData).length > 0) {
                // Check which columns exist in employees table
                const [empColumns] = await connection.query("SHOW COLUMNS FROM employees");
                const columnNames = empColumns.map(col => col.Field);
                
                // Build update query dynamically
                const updateFields = [];
                const updateValues = [];

                Object.keys(employeeData).forEach(key => {
                    const fieldMapping = {
                        'first_name': 'first_name',
                        'last_name': 'last_name',
                        'email': 'email',
                        'phone': 'phone',
                        'address': 'address',
                        'city': 'city',
                        'state': 'state',
                        'pincode': 'pincode',
                        'bank_name': 'bank_name',
                        'account_number': 'account_number',
                        'ifsc_code': 'ifsc_code',
                        'pan_number': 'pan_number',
                        'emergency_contact': 'emergency_contact',
                        'designation': 'designation',
                        'department': 'department',
                        'employment_type': 'employment_type',
                        'shift_timing': 'shift_timing',
                        'reporting_manager': 'reporting_manager',
                        'dob': 'dob',
                        'blood_group': 'blood_group',
                        'gross_salary': 'gross_salary',
                        'in_hand_salary': 'in_hand_salary',
                        'aadhar_number': 'aadhar_number'
                    };
                    
                    const columnName = fieldMapping[key] || key;
                    
                    if (columnNames.includes(columnName) && employeeData[key] !== null && employeeData[key] !== undefined) {
                        updateFields.push(`${columnName} = ?`);
                        updateValues.push(employeeData[key]);
                    }
                });

                if (updateFields.length > 0) {
                    updateValues.push(request.employee_id);
                    
                    const updateQuery = `UPDATE employees SET ${updateFields.join(', ')} WHERE employee_id = ?`;
                    console.log('📝 Update query:', updateQuery);
                    
                    await connection.query(updateQuery, updateValues);
                    console.log('✅ Employee data updated successfully');
                }
            }

            // Update request status
            await connection.query(
                `UPDATE update_requests SET status = 'approved', updated_at = NOW() WHERE id = ?`,
                [request_id]
            );

            // Create notification - with column checking
            if (notifColumnNames.includes('title') && notifColumnNames.includes('reference_id')) {
                // Both columns exist
                await connection.query(
                    `INSERT INTO notifications (employee_id, title, message, type, reference_id, created_at) 
                     VALUES (?, ?, ?, 'update_approved', ?, NOW())`,
                    [
                        request.employee_id,
                        'Update Request Approved',
                        'Your information update request has been approved by admin.',
                        request_id
                    ]
                );
            } else if (notifColumnNames.includes('title')) {
                // Only title exists
                await connection.query(
                    `INSERT INTO notifications (employee_id, title, message, type, created_at) 
                     VALUES (?, ?, ?, 'update_approved', NOW())`,
                    [
                        request.employee_id,
                        'Update Request Approved',
                        'Your information update request has been approved by admin.'
                    ]
                );
            } else if (notifColumnNames.includes('reference_id')) {
                // Only reference_id exists
                await connection.query(
                    `INSERT INTO notifications (employee_id, message, type, reference_id, created_at) 
                     VALUES (?, ?, 'update_approved', ?, NOW())`,
                    [
                        request.employee_id,
                        'Your information update request has been approved by admin.',
                        request_id
                    ]
                );
            } else {
                // No extra columns
                await connection.query(
                    `INSERT INTO notifications (employee_id, message, type, created_at) 
                     VALUES (?, ?, 'update_approved', NOW())`,
                    [
                        request.employee_id,
                        'Your information update request has been approved by admin.'
                    ]
                );
            }

            await connection.commit();
            console.log(`✅ Request approved successfully`);

            res.json({ 
                success: true,
                message: `Request approved successfully`
            });

        } else if (action === 'reject') {
            // Update request status
            await connection.query(
                `UPDATE update_requests SET status = 'rejected', updated_at = NOW() WHERE id = ?`,
                [request_id]
            );

            // Create notification - with column checking
            if (notifColumnNames.includes('title') && notifColumnNames.includes('reference_id')) {
                await connection.query(
                    `INSERT INTO notifications (employee_id, title, message, type, reference_id, created_at) 
                     VALUES (?, ?, ?, 'update_rejected', ?, NOW())`,
                    [
                        request.employee_id,
                        'Update Request Rejected',
                        'Your information update request has been rejected by admin.',
                        request_id
                    ]
                );
            } else if (notifColumnNames.includes('title')) {
                await connection.query(
                    `INSERT INTO notifications (employee_id, title, message, type, created_at) 
                     VALUES (?, ?, ?, 'update_rejected', NOW())`,
                    [
                        request.employee_id,
                        'Update Request Rejected',
                        'Your information update request has been rejected by admin.'
                    ]
                );
            } else if (notifColumnNames.includes('reference_id')) {
                await connection.query(
                    `INSERT INTO notifications (employee_id, message, type, reference_id, created_at) 
                     VALUES (?, ?, 'update_rejected', ?, NOW())`,
                    [
                        request.employee_id,
                        'Your information update request has been rejected by admin.',
                        request_id
                    ]
                );
            } else {
                await connection.query(
                    `INSERT INTO notifications (employee_id, message, type, created_at) 
                     VALUES (?, ?, 'update_rejected', NOW())`,
                    [
                        request.employee_id,
                        'Your information update request has been rejected by admin.'
                    ]
                );
            }

            await connection.commit();
            console.log(`✅ Request rejected successfully`);

            res.json({ 
                success: true,
                message: `Request rejected successfully`
            });

        } else {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid action. Use "approve" or "reject"' 
            });
        }

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(`❌ Error handling request:`, error);
        console.error('❌ SQL Error:', error.sqlMessage || error.message);
        
        res.status(500).json({ 
            success: false, 
            message: 'Error processing request',
            error: error.message 
        });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;