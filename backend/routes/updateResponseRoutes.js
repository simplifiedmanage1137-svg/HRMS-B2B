// routes/updateResponseRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Get pending responses for employee
router.get('/my-pending/:employeeId', verifyToken, async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        const [responses] = await db.query(
            `SELECT * FROM update_responses 
             WHERE employee_id = ? AND status = 'pending'
             ORDER BY created_at DESC`,
            [employeeId]
        );

        res.json(responses);
    } catch (error) {
        console.error('Error fetching pending responses:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching responses',
            error: error.message 
        });
    }
});

// Submit response
router.post('/respond', verifyToken, async (req, res) => {
    try {
        const { request_id, response_data } = req.body;
        
        const [result] = await db.query(
            `INSERT INTO update_responses (request_id, employee_id, response_data, status)
             VALUES (?, ?, ?, 'submitted')`,
            [request_id, req.employeeId, JSON.stringify(response_data)]
        );

        res.status(201).json({
            success: true,
            message: 'Response submitted successfully',
            response_id: result.insertId
        });
    } catch (error) {
        console.error('Error submitting response:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error submitting response',
            error: error.message 
        });
    }
});

module.exports = router;