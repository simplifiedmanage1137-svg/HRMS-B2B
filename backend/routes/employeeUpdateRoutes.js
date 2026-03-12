// routes/employeeUpdateRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// routes/employeeUpdateRoutes.js
// routes/employeeUpdateRoutes.js
router.get('/pending-requests', verifyToken, async (req, res) => {
    try {
        console.log('='.repeat(50));
        console.log('📋 PENDING REQUESTS API CALLED');
        console.log('👤 User from token:', req.user);
        console.log('👤 Employee ID:', req.employeeId);
        console.log('='.repeat(50));

        if (!req.employeeId) {
            console.log('❌ No employee ID in token');
            return res.status(400).json({ 
                success: false, 
                message: 'Employee ID not found in token' 
            });
        }

        // Check if table exists
        const [tables] = await db.query("SHOW TABLES LIKE 'update_requests'");
        console.log('📊 Table exists:', tables.length > 0);
        
        if (tables.length === 0) {
            return res.json([]);
        }

        const [requests] = await db.query(
            `SELECT * FROM update_requests 
             WHERE employee_id = ? AND status IN ('pending', 'in_progress')
             ORDER BY created_at DESC`,
            [req.employeeId]
        );

        console.log(`📊 Found ${requests.length} requests for employee ${req.employeeId}`);
        
        if (requests.length > 0) {
            console.log('📊 First request:', requests[0]);
        }

        // Parse JSON fields
        const formattedRequests = requests.map(req => {
            try {
                return {
                    ...req,
                    requested_fields: req.requested_fields ? JSON.parse(req.requested_fields) : [],
                    employee_data: req.employee_data ? JSON.parse(req.employee_data) : null
                };
            } catch (e) {
                console.error('Error parsing JSON for request:', req.id, e);
                return {
                    ...req,
                    requested_fields: [],
                    employee_data: null
                };
            }
        });

        console.log(`✅ Sending ${formattedRequests.length} formatted requests`);
        res.json(formattedRequests);

    } catch (error) {
        console.error('❌ Error fetching pending requests:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching requests',
            error: error.message 
        });
    }
});

// Get specific request details
router.get('/request/:requestId', verifyToken, async (req, res) => {
    try {
        const { requestId } = req.params;

        const [requests] = await db.query(
            `SELECT * FROM update_requests WHERE id = ?`,
            [requestId]
        );

        if (requests.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Request not found' 
            });
        }

        const request = requests[0];

        // Verify ownership
        if (request.employee_id !== req.employeeId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied' 
            });
        }

        // Parse JSON fields
        request.requested_fields = JSON.parse(request.requested_fields || '[]');
        request.employee_data = request.employee_data ? JSON.parse(request.employee_data) : null;

        res.json(request);

    } catch (error) {
        console.error('❌ Error fetching request:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching request',
            error: error.message 
        });
    }
});

// routes/employeeUpdateRoutes.js - Accept request endpoint
// routes/employeeUpdateRoutes.js - Fix the accept-request endpoint
router.post('/accept-request/:requestId', verifyToken, async (req, res) => {
    try {
        const { requestId } = req.params;
        
        console.log('📝 Accepting request:', requestId);
        console.log('👤 Employee ID from token:', req.employeeId);
        console.log('👤 User from token:', req.user);

        // Check if request exists and belongs to this employee
        const [requests] = await db.query(
            'SELECT * FROM update_requests WHERE id = ? AND employee_id = ?',
            [requestId, req.employeeId]
        );

        if (requests.length === 0) {
            console.log('❌ Request not found or does not belong to employee');
            return res.status(404).json({ 
                success: false, 
                message: 'Request not found or does not belong to you' 
            });
        }

        const request = requests[0];
        console.log('✅ Found request:', request);

        // Check if request is in pending state
        if (request.status !== 'pending') {
            console.log('❌ Request is not in pending state:', request.status);
            return res.status(400).json({ 
                success: false, 
                message: `Request is already ${request.status}` 
            });
        }

        // Update status to in_progress
        const [updateResult] = await db.query(
            'UPDATE update_requests SET status = ? WHERE id = ?',
            ['in_progress', requestId]
        );

        console.log('✅ Request updated:', updateResult);

        res.json({ 
            success: true, 
            message: 'Request accepted successfully' 
        });

    } catch (error) {
        console.error('❌ Error accepting request:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message 
        });
    }
});

// Employee submits updated data
router.post('/submit-update', verifyToken, async (req, res) => {
    let connection;
    try {
        const { requestId, updatedData } = req.body;

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get request
        const [requests] = await connection.query(
            `SELECT * FROM update_requests WHERE id = ?`,
            [requestId]
        );

        if (requests.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'Request not found' 
            });
        }

        const request = requests[0];

        // Verify ownership
        if (request.employee_id !== req.employeeId) {
            await connection.rollback();
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied' 
            });
        }

        // Check status
        if (request.status !== 'in_progress') {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Request is not in progress' 
            });
        }

        // Update request with employee data
        await connection.query(
            `UPDATE update_requests 
             SET status = 'completed', employee_data = ?, updated_at = NOW() 
             WHERE id = ?`,
            [JSON.stringify(updatedData), requestId]
        );

        // Create notification for admin
        const [admins] = await connection.query(
            `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
        );

        if (admins.length > 0) {
            await connection.query(
                `INSERT INTO admin_notifications 
                 (admin_id, title, message, type, reference_id, created_at) 
                 VALUES (?, ?, ?, 'update_completed', ?, NOW())`,
                [
                    admins[0].id,
                    'Employee Update Submitted',
                    `Employee ${req.employeeId} has submitted their information update for approval.`,
                    requestId
                ]
            );
        }

        await connection.commit();

        res.json({ 
            success: true,
            message: 'Update submitted successfully. Waiting for admin approval.'
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Error submitting update:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error submitting update',
            error: error.message 
        });
    } finally {
        if (connection) connection.release();
    }
});

// Get completed requests for employee (history)
router.get('/completed-requests', verifyToken, async (req, res) => {
    try {
        const [requests] = await db.query(
            `SELECT * FROM update_requests 
             WHERE employee_id = ? AND status IN ('approved', 'rejected')
             ORDER BY updated_at DESC`,
            [req.employeeId]
        );

        // Parse JSON fields
        const formattedRequests = requests.map(req => ({
            ...req,
            requested_fields: JSON.parse(req.requested_fields || '[]'),
            employee_data: req.employee_data ? JSON.parse(req.employee_data) : null
        }));

        res.json(formattedRequests);

    } catch (error) {
        console.error('❌ Error fetching completed requests:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching requests',
            error: error.message 
        });
    }
});

// Get count of pending notifications for employee
router.get('/notification-count', verifyToken, async (req, res) => {
    try {
        const [result] = await db.query(
            `SELECT COUNT(*) as count FROM update_requests 
             WHERE employee_id = ? AND status = 'pending'`,
            [req.employeeId]
        );

        res.json({ 
            success: true,
            count: result[0].count 
        });

    } catch (error) {
        console.error('❌ Error fetching notification count:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching count',
            error: error.message 
        });
    }
});

// Get current employee data for editing
router.get('/current-data', verifyToken, async (req, res) => {
    try {
        const [employees] = await db.query(
            `SELECT * FROM employees WHERE employee_id = ?`,
            [req.employeeId]
        );

        if (employees.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Employee not found' 
            });
        }

        res.json(employees[0]);

    } catch (error) {
        console.error('❌ Error fetching employee data:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching data',
            error: error.message 
        });
    }
});

// routes/employeeUpdateRoutes.js mein yeh add karein

// Get admin notifications for employee
router.get('/admin-notifications', verifyToken, async (req, res) => {
    try {
        console.log('📋 Fetching admin notifications for employee:', req.employeeId);
        
        const [notifications] = await db.query(
            `SELECT * FROM notifications 
             WHERE employee_id = ? 
             ORDER BY created_at DESC 
             LIMIT 10`,
            [req.employeeId]
        );

        res.json({
            success: true,
            notifications
        });

    } catch (error) {
        console.error('❌ Error fetching admin notifications:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching notifications',
            error: error.message 
        });
    }
});

module.exports = router;