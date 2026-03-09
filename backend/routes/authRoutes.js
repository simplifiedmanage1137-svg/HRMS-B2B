// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('Login attempt for email:', email);

        // For admin login (hardcoded for demo)
        if (email === 'admin@ems.com' && password === 'admin123') {
            const token = jwt.sign(
                { id: 1, email, role: 'admin' },
                JWT_SECRET,
                { expiresIn: '1d' }
            );
            
            return res.json({
                success: true,
                token,
                user: {
                    id: 1,
                    email,
                    role: 'admin',
                    employeeId: 'ADMIN001'
                }
            });
        }

        // For employee login - check database
        const [users] = await db.query(
            'SELECT * FROM employees WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        // For demo purposes, accept default password
        const isValidPassword = password === 'Welcome@123' || 
                               password === user.employee_id?.toLowerCase();

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: 'employee',
                employeeId: user.employee_id 
            },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                role: 'employee',
                employeeId: user.employee_id,
                firstName: user.first_name,
                lastName: user.last_name
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

module.exports = router;