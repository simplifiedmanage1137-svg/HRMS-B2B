const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Get notifications
router.get('/', notificationController.getNotifications);

// Get unread count
router.get('/unread', notificationController.getUnreadCount);

// Mark notification as read
router.put('/:id/read', notificationController.markAsRead);

module.exports = router;