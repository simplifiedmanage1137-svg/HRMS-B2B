const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('Login attempt for email:', email);
        console.log('Request body:', req.body);

        // Check if database connection works
        try {
            await db.query('SELECT 1');
            console.log('Database connection OK');
        } catch (dbError) {
            console.error('Database connection error:', dbError);
            return res.status(500).json({ message: 'Database connection error' });
        }

        // Get user from database
        const [users] = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        console.log('Users found:', users.length);

        if (users.length === 0) {
            console.log('User not found:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = users[0];
        console.log('User found:', user.email, 'Role:', user.role);
        
        // Simple password check for testing
        if (password === 'admin123' || password === 'Welcome@123') {
            
            // Get employee details if user is an employee
            let employeeData = null;
            if (user.role === 'employee') {
                const [employees] = await db.query(
                    'SELECT * FROM employees WHERE employee_id = ?',
                    [user.employee_id]
                );
                if (employees.length > 0) {
                    employeeData = employees[0];
                }
            }

            // Generate JWT token
            const token = jwt.sign(
                { 
                    id: user.id, 
                    email: user.email,
                    role: user.role,
                    employeeId: user.employee_id 
                },
                process.env.JWT_SECRET || 'your_secret_key',
                { expiresIn: '24h' }
            );

            console.log('Login successful for:', email);

            return res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    employeeId: user.employee_id,
                    employeeData: employeeData
                }
            });
        } else {
            console.log('Invalid password for user:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.register = async (req, res) => {
    try {
        const { email, password, employeeId, role = 'employee' } = req.body;
        
        // Check if user already exists
        const [existing] = await db.query(
            'SELECT * FROM users WHERE email = ? OR employee_id = ?',
            [email, employeeId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Insert user
        const [result] = await db.query(
            'INSERT INTO users (employee_id, email, password, role) VALUES (?, ?, ?, ?)',
            [employeeId, email, hashedPassword, role]
        );

        res.status(201).json({ 
            success: true,
            message: 'User created successfully',
            userId: result.insertId 
        });
        
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Verify token and return user data
exports.verifyToken = async (req, res) => {
    try {
        // Get token from header
        const token = req.headers['authorization']?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
        
        // Get user from database
        const [users] = await db.query(
            'SELECT id, employee_id, email, role FROM users WHERE id = ?',
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        const user = users[0];

        // Get employee details if user is an employee
        let employeeData = null;
        if (user.role === 'employee') {
            const [employees] = await db.query(
                'SELECT * FROM employees WHERE employee_id = ?',
                [user.employee_id]
            );
            if (employees.length > 0) {
                employeeData = employees[0];
            }
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                employeeId: user.employee_id,
                employeeData: employeeData
            }
        });

    } catch (error) {
        console.error('Token verification error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token' 
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token expired' 
            });
        }

        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
};