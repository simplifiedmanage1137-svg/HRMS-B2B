const db = require('../config/database');

// Get notifications for employee
exports.getNotifications = async (req, res) => {
    try {
        const { employee_id } = req.query;
        
        if (!employee_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Employee ID is required' 
            });
        }

        const [notifications] = await db.query(
            `SELECT * FROM notifications 
             WHERE employee_id = ? 
             ORDER BY created_at DESC 
             LIMIT 20`,
            [employee_id]
        );
        
        res.json(notifications || []);
        
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching notifications',
            error: error.message 
        });
    }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [result] = await db.query(
            'UPDATE notifications SET is_read = true WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Notification not found' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Notification marked as read' 
        });
        
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error marking notification as read' 
        });
    }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
    try {
        const { employee_id } = req.query;
        
        if (!employee_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Employee ID is required' 
            });
        }

        const [result] = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE employee_id = ? AND is_read = false',
            [employee_id]
        );

        res.json({ 
            success: true, 
            count: result[0].count 
        });
        
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error getting unread count' 
        });
    }
};

// Create notification (internal use)
exports.createNotification = async (employee_id, message, type = 'general') => {
    try {
        await db.query(
            'INSERT INTO notifications (employee_id, message, type) VALUES (?, ?, ?)',
            [employee_id, message, type]
        );
        return true;
    } catch (error) {
        console.error('Error creating notification:', error);
        return false;
    }
};