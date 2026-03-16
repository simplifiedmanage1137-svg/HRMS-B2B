const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Get all employees for admin
router.get('/employees', verifyToken, isAdmin, async (req, res) => {
    try {
        console.log('📋 Fetching employees for admin...');

        const { data: employees, error } = await supabase
            .from('employees')
            .select('id, employee_id, first_name, last_name, email, designation, department, phone')
            .order('first_name', { ascending: true });

        if (error) throw error;

        console.log(`✅ Found ${employees?.length || 0} employees`);
        res.json(employees || []);

    } catch (error) {
        console.error('❌ Error fetching employees:', error);
        res.json([]);
    }
});

// Get pending requests count
router.get('/pending-count', verifyToken, isAdmin, async (req, res) => {
    try {
        const { count, error } = await supabase
            .from('update_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed'); // ✅ Completed by employee, waiting for admin

        if (error) throw error;

        res.json({ count: count || 0 });

    } catch (error) {
        console.error('❌ Error fetching pending count:', error);
        res.json({ count: 0 });
    }
});


// Get all pending requests
router.get('/pending-requests', verifyToken, isAdmin, async (req, res) => {
    try {
        const { data: requests, error } = await supabase
            .from('update_requests')
            .select(`
                *,
                employees!inner(first_name, last_name, email, designation, department)
            `)
            .in('status', ['pending', 'in_progress'])
            .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedRequests = (requests || []).map(req => ({
            ...req,
            requested_fields: req.requested_fields || [],
            employee_data: req.employee_data || null,
            first_name: req.employees?.first_name,
            last_name: req.employees?.last_name,
            email: req.employees?.email,
            designation: req.employees?.designation,
            department: req.employees?.department,
            employees: undefined
        }));

        res.json(formattedRequests);

    } catch (error) {
        console.error('❌ Error fetching pending requests:', error);
        res.json([]);
    }
});

// Send update request to employee
router.post('/send-request', verifyToken, isAdmin, async (req, res) => {
    try {
        const { employee_id, requested_fields, notes } = req.body;

        console.log('='.repeat(50));
        console.log('📝 SENDING UPDATE REQUEST');
        console.log('Employee ID:', employee_id);
        console.log('Requested fields:', requested_fields);
        console.log('='.repeat(50));

        const insertData = {
            employee_id,
            admin_id: req.userId,
            requested_fields: requested_fields || [],
            notes: notes || null,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('update_requests')
            .insert([insertData])
            .select();

        if (error) throw error;

        // Create notification for employee
        await supabase
            .from('notifications')
            .insert([{
                employee_id: employee_id,
                title: 'Information Update Request',
                message: `Admin has requested you to update your ${requested_fields.join(', ')} information.`,
                type: 'update_request',
                reference_id: data[0].id,
                is_read: false,
                created_at: new Date().toISOString()
            }]);

        res.status(201).json({
            success: true,
            message: 'Update request sent successfully',
            request_id: data[0].id
        });

    } catch (error) {
        console.error('❌ Error sending update request:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending request',
            error: error.message
        });
    }
});

// routes/adminUpdateRoutes.js - Fixed completed-requests endpoint

router.get('/completed-requests', verifyToken, isAdmin, async (req, res) => {
    try {
        console.log('='.repeat(50));
        console.log('📋 FETCHING COMPLETED REQUESTS');
        console.log('Admin ID:', req.userId);
        console.log('='.repeat(50));

        // First, get all completed requests without join to avoid errors
        const { data: requests, error } = await supabase
            .from('update_requests')
            .select('*')
            .eq('status', 'completed')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('❌ Supabase error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Database error',
                error: error.message 
            });
        }

        console.log(`✅ Found ${requests?.length || 0} completed requests`);

        if (!requests || requests.length === 0) {
            return res.json([]);
        }

        // Now get employee details for each request
        const formattedRequests = [];

        for (const req of requests) {
            try {
                // Fetch employee details
                const { data: employee, error: empError } = await supabase
                    .from('employees')
                    .select('first_name, last_name, email, department, designation')
                    .eq('employee_id', req.employee_id)
                    .single();

                if (empError) {
                    console.warn(`⚠️ Could not fetch employee for ${req.employee_id}:`, empError);
                }

                formattedRequests.push({
                    id: req.id,
                    employee_id: req.employee_id,
                    status: req.status,
                    requested_fields: req.requested_fields || [],
                    employee_data: req.employee_data || {},
                    notes: req.notes,
                    created_at: req.created_at,
                    updated_at: req.updated_at,
                    employee_name: employee ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim() : 'Unknown',
                    employee_email: employee?.email,
                    employee_department: employee?.department,
                    employee_designation: employee?.designation
                });

            } catch (empErr) {
                console.error(`❌ Error processing request ${req.id}:`, empErr);
                // Still add the request without employee details
                formattedRequests.push({
                    id: req.id,
                    employee_id: req.employee_id,
                    status: req.status,
                    requested_fields: req.requested_fields || [],
                    employee_data: req.employee_data || {},
                    notes: req.notes,
                    created_at: req.created_at,
                    updated_at: req.updated_at,
                    employee_name: 'Unknown',
                    employee_email: null,
                    employee_department: null,
                    employee_designation: null
                });
            }
        }

        console.log(`✅ Sending ${formattedRequests.length} formatted requests`);
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

// routes/adminUpdateRoutes.js - Ultra simplified version

// routes/adminUpdateRoutes.js - Updated handle-request without admin_comments

router.post('/handle-request', verifyToken, isAdmin, async (req, res) => {
    try {
        const { request_id, action } = req.body; // Remove comments from destructuring

        console.log('='.repeat(50));
        console.log('📝 HANDLE REQUEST');
        console.log('Request ID:', request_id);
        console.log('Action:', action);
        console.log('='.repeat(50));

        // Validate input
        if (!request_id) {
            return res.status(400).json({
                success: false,
                message: 'Request ID is required'
            });
        }

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Action must be approve or reject'
            });
        }

        // Get request details
        const { data: request, error: fetchError } = await supabase
            .from('update_requests')
            .select('*')
            .eq('id', request_id)
            .single();

        if (fetchError || !request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        console.log('✅ Found request:', request);

        // Check if request is in completed status
        if (request.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: `Request is not in completed state. Current status: ${request.status}`
            });
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        // If approved, update employee data
        if (action === 'approve' && request.employee_data) {
            try {
                console.log('📝 Updating employee data for:', request.employee_id);
                console.log('Employee data:', request.employee_data);

                const { error: empUpdateError } = await supabase
                    .from('employees')
                    .update(request.employee_data)
                    .eq('employee_id', request.employee_id);

                if (empUpdateError) {
                    console.error('❌ Error updating employee:', empUpdateError);
                    throw empUpdateError;
                }
                console.log('✅ Employee data updated successfully');
            } catch (empError) {
                console.error('❌ Employee update failed:', empError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update employee data',
                    error: empError.message
                });
            }
        }

        // Update request status WITHOUT admin_comments
        const { error: updateError } = await supabase
            .from('update_requests')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString()
                // ❌ Remove admin_comments from here
            })
            .eq('id', request_id);

        if (updateError) {
            console.error('❌ Error updating request:', updateError);
            throw updateError;
        }

        console.log(`✅ Request ${action}ed successfully`);

        // Create notification for employee
        try {
            const notificationMessage = action === 'approve'
                ? 'Your information update request has been approved by admin.'
                : `Your information update request has been rejected by admin.`;

            const { error: notifError } = await supabase
                .from('notifications')
                .insert([{
                    employee_id: request.employee_id,
                    title: `Update Request ${action === 'approve' ? 'Approved' : 'Rejected'}`,
                    message: notificationMessage,
                    type: `update_${action === 'approve' ? 'approved' : 'rejected'}`,
                    reference_id: request_id,
                    created_at: new Date().toISOString()
                }]);

            if (notifError) {
                console.error('⚠️ Error creating notification:', notifError);
            } else {
                console.log('✅ Notification created for employee');
            }
        } catch (notifError) {
            console.error('⚠️ Notification error:', notifError);
        }

        res.json({
            success: true,
            message: `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`
        });

    } catch (error) {
        console.error('❌ Error handling request:', error);
        console.error('Error stack:', error.stack);
        
        res.status(500).json({
            success: false,
            message: 'Error processing request',
            error: error.message
        });
    }
});

// ✅ NEW: Mark all notifications as read for admin
router.post('/mark-notifications-read', verifyToken, isAdmin, async (req, res) => {
    try {
        console.log('📋 Marking all notifications as read for admin:', req.userId);

        // Update all admin notifications for this admin
        const { error } = await supabase
            .from('admin_notifications')
            .update({ is_read: true })
            .eq('admin_id', req.userId)
            .eq('is_read', false);

        if (error) throw error;

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });

    } catch (error) {
        console.error('❌ Error marking notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking notifications as read',
            error: error.message
        });
    }
});

module.exports = router;