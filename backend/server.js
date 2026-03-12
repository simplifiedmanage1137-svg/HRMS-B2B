const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const db = require('./config/database');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const app = express();
dotenv.config();

// ============== MIDDLEWARE ==============
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create upload directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const profilesDir = path.join(uploadsDir, 'profiles');
const documentsDir = path.join(uploadsDir, 'documents');

[uploadsDir, profilesDir, documentsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    }
});

// ============== MULTER CONFIGURATION FOR DOCUMENT UPLOADS ==============
const documentStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, documentsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        // Sanitize fieldname to remove any special characters
        const fieldname = file.fieldname.replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, fieldname + '-' + uniqueSuffix + ext);
    }
});

const uploadDocuments = multer({ 
    storage: documentStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and documents are allowed'));
        }
    }
});

// ============== HELPER FUNCTIONS ==============
const generateSessionId = () => {
    return uuidv4();
};

const parseShiftStart = (shiftTiming) => {
    if (!shiftTiming) return null;

    const parts = shiftTiming.split('-');
    if (parts.length === 0) return null;

    const part = parts[0].trim();
    const ampmMatch = part.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (ampmMatch) {
        let hour = parseInt(ampmMatch[1], 10);
        const minute = parseInt(ampmMatch[2], 10);
        const ampm = ampmMatch[3].toUpperCase();
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        return { hour, minute };
    }

    const militaryMatch = part.match(/(\d{1,2}):(\d{2})/);
    if (militaryMatch) {
        return {
            hour: parseInt(militaryMatch[1], 10),
            minute: parseInt(militaryMatch[2], 10)
        };
    }

    return null;
};

// ============== MIDDLEWARE FUNCTIONS ==============
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// ============== TEST ROUTES ==============
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Backend is working!',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/test-db', async (req, res) => {
    try {
        const [result] = await db.query('SELECT 1 + 1 as result');
        res.json({
            success: true,
            message: 'Database connected successfully!',
            result: result[0].result,
            database: process.env.DB_NAME || 'ems_db'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: error.message
        });
    }
});

// ============== AUTH ROUTES ==============
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('🔐 Login attempt for email:', email);

        // Hardcoded admin for testing
        if (email === 'admin@ems.com' && password === 'admin123') {
            const token = jwt.sign(
                {
                    id: 1,
                    email,
                    role: 'admin',
                    employeeId: 'ADMIN001'
                },
                process.env.JWT_SECRET || 'your_jwt_secret_key_here',
                { expiresIn: '7d' }
            );

            return res.json({
                success: true,
                token,
                user: {
                    id: 1,
                    email,
                    role: 'admin',
                    employeeId: 'ADMIN001',
                    firstName: 'Admin',
                    lastName: 'User'
                }
            });
        }

        // Employee login from email format: emp_B2B250201@ems.com
        if (email.startsWith('emp_') && email.endsWith('@ems.com')) {
            const employeeId = email.replace('emp_', '').replace('@ems.com', '');

            // Check if employee exists
            const [employees] = await db.query(
                'SELECT * FROM employees WHERE employee_id = ?',
                [employeeId]
            );

            if (employees.length > 0) {
                const employee = employees[0];

                // Accept default password or employee ID as password
                if (password === 'Welcome@123' || password === employeeId) {
                    const token = jwt.sign(
                        {
                            id: employee.id,
                            email: employee.email,
                            role: 'employee',
                            employeeId: employee.employee_id
                        },
                        process.env.JWT_SECRET || 'your_jwt_secret_key_here',
                        { expiresIn: '7d' }
                    );

                    return res.json({
                        success: true,
                        token,
                        user: {
                            id: employee.id,
                            email: employee.email,
                            role: 'employee',
                            employeeId: employee.employee_id,
                            firstName: employee.first_name,
                            lastName: employee.last_name
                        }
                    });
                }
            }
        }

        return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// ============== TODAY'S EVENTS ROUTE ==============
app.get('/api/employees/today-events', async (req, res) => {
    try {
        console.log('📅 Fetching today events...');

        const today = new Date();
        const todayMonth = today.getMonth() + 1;
        const todayDay = today.getDate();

        // Get all employees
        const [employees] = await db.query('SELECT * FROM employees');

        const birthdays = [];
        const anniversaries = [];

        employees.forEach(emp => {
            // Check birthday
            if (emp.dob) {
                const dob = new Date(emp.dob);
                const dobMonth = dob.getMonth() + 1;
                const dobDay = dob.getDate();

                if (dobMonth === todayMonth && dobDay === todayDay) {
                    birthdays.push({
                        id: emp.id,
                        employee_id: emp.employee_id,
                        first_name: emp.first_name,
                        last_name: emp.last_name,
                        department: emp.department,
                        position: emp.designation || emp.position,
                        profile_image: emp.profile_image
                    });
                }
            }

            // Check work anniversary
            if (emp.joining_date) {
                const joiningDate = new Date(emp.joining_date);
                const joiningMonth = joiningDate.getMonth() + 1;
                const joiningDay = joiningDate.getDate();

                if (joiningMonth === todayMonth && joiningDay === todayDay) {
                    const years = today.getFullYear() - joiningDate.getFullYear();
                    if (years > 0) { // Only count if at least 1 year completed
                        anniversaries.push({
                            id: emp.id,
                            employee_id: emp.employee_id,
                            first_name: emp.first_name,
                            last_name: emp.last_name,
                            department: emp.department,
                            position: emp.designation || emp.position,
                            profile_image: emp.profile_image,
                            joining_date: emp.joining_date,
                            years: years
                        });
                    }
                }
            }
        });

        console.log(`✅ Found ${birthdays.length} birthdays and ${anniversaries.length} anniversaries today`);

        res.json({
            success: true,
            date: today.toISOString().split('T')[0],
            birthdays,
            anniversaries,
            total: birthdays.length + anniversaries.length
        });

    } catch (error) {
        console.error('❌ Error fetching today events:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch events',
            error: error.message
        });
    }
});

// ============== EMPLOYEE ROUTES ==============

// Get all employees
app.get('/api/employees', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM employees ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('❌ Error fetching employees:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get employee by ID
app.get('/api/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('📤 Fetching employee with ID:', id);

        // Check if id is number or string
        let query;
        let value;

        if (!isNaN(id)) {
            // If id is number, search by id
            query = 'SELECT * FROM employees WHERE id = ?';
            value = parseInt(id);
        } else {
            // If id is string, search by employee_id
            query = 'SELECT * FROM employees WHERE employee_id = ?';
            value = id;
        }

        const [rows] = await db.query(query, [value]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('❌ Error fetching employee:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get employee by employee_id (for profile)
app.get('/api/employees/profile/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const [rows] = await db.query('SELECT * FROM employees WHERE employee_id = ?', [employeeId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('❌ Error fetching employee profile:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new employee
app.post('/api/employees', async (req, res) => {
    try {
        const employeeData = req.body;

        console.log('📝 Creating new employee:', employeeData.email);
        console.log('Employee ID to create:', employeeData.employee_id);

        // Check if employee_id already exists
        const [existing] = await db.query(
            'SELECT employee_id FROM employees WHERE employee_id = ?',
            [employeeData.employee_id]
        );

        if (existing.length > 0) {
            console.log('❌ Employee ID already exists:', employeeData.employee_id);
            return res.status(400).json({
                success: false,
                message: 'Employee ID already exists. Please try again.',
                error: `Duplicate employee_id: ${employeeData.employee_id}`
            });
        }

        // Check if email already exists
        const [existingEmail] = await db.query(
            'SELECT email FROM employees WHERE email = ?',
            [employeeData.email]
        );

        if (existingEmail.length > 0) {
            console.log('❌ Email already exists:', employeeData.email);
            return res.status(400).json({
                success: false,
                message: 'Email already exists. Please use a different email.',
                error: `Duplicate email: ${employeeData.email}`
            });
        }

        const query = `
            INSERT INTO employees (
                first_name, middle_name, last_name, employee_id, email,
                joining_date, designation, department, reporting_manager,
                employment_type, shift_timing,
                in_hand_salary, gross_salary,
                bank_account_name, account_number, ifsc_code, branch_name,
                pan_number, aadhar_number, dob, address, blood_group,
                emergency_contact, contract_policy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            employeeData.first_name,
            employeeData.middle_name || null,
            employeeData.last_name,
            employeeData.employee_id,
            employeeData.email,
            employeeData.joining_date,
            employeeData.designation,
            employeeData.department,
            employeeData.reporting_manager || null,
            employeeData.employment_type || 'Full Time',
            employeeData.shift_timing || '9:00 AM - 6:00 PM',
            employeeData.in_hand_salary || 0,
            employeeData.gross_salary || 0,
            employeeData.bank_account_name,
            employeeData.account_number,
            employeeData.ifsc_code,
            employeeData.branch_name,
            employeeData.pan_number,
            employeeData.aadhar_number,
            employeeData.dob,
            employeeData.address,
            employeeData.blood_group || null,
            employeeData.emergency_contact,
            employeeData.contract_policy || null
        ];

        console.log('Executing INSERT query...');
        const [result] = await db.query(query, values);
        console.log('✅ Employee inserted with ID:', result.insertId);

        // Create leave balance for employee
        try {
            await db.query(
                `INSERT INTO leave_balances (employee_id, total_accrued, used, pending, available) 
                 VALUES (?, 12, 0, 0, 12)`,
                [employeeData.employee_id]
            );
            console.log('✅ Leave balance created for employee:', employeeData.employee_id);
        } catch (leaveError) {
            console.error('⚠️ Error creating leave balance:', leaveError);
            // Don't fail the whole request if leave balance creation fails
        }

        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            employee: {
                id: result.insertId,
                employee_id: employeeData.employee_id
            }
        });

    } catch (error) {
        console.error('❌ Error creating employee:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // Handle duplicate entry error specifically
        if (error.code === 'ER_DUP_ENTRY') {
            const match = error.message.match(/'([^']+)'/g);
            const duplicateField = match ? match[0] : 'unknown';
            
            return res.status(400).json({
                success: false,
                message: 'Duplicate entry detected. Please check your data.',
                error: error.message,
                duplicate_field: duplicateField
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to create employee',
            error: error.message
        });
    }
});

// Update employee
app.put('/api/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const query = `
            UPDATE employees SET
                first_name = ?, middle_name = ?, last_name = ?, email = ?,
                joining_date = ?, designation = ?, department = ?, 
                reporting_manager = ?, employment_type = ?, shift_timing = ?,
                in_hand_salary = ?, gross_salary = ?,
                bank_account_name = ?, account_number = ?, ifsc_code = ?, 
                branch_name = ?, pan_number = ?, aadhar_number = ?, 
                dob = ?, address = ?, blood_group = ?, emergency_contact = ?,
                contract_policy = ?
            WHERE id = ?
        `;

        const values = [
            updates.first_name,
            updates.middle_name || null,
            updates.last_name,
            updates.email,
            updates.joining_date,
            updates.designation,
            updates.department,
            updates.reporting_manager || null,
            updates.employment_type,
            updates.shift_timing,
            updates.in_hand_salary,
            updates.gross_salary,
            updates.bank_account_name,
            updates.account_number,
            updates.ifsc_code,
            updates.branch_name,
            updates.pan_number,
            updates.aadhar_number,
            updates.dob,
            updates.address,
            updates.blood_group || null,
            updates.emergency_contact,
            updates.contract_policy || null,
            id
        ];

        await db.query(query, values);

        res.json({
            success: true,
            message: 'Employee updated successfully'
        });

    } catch (error) {
        console.error('❌ Error updating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update employee',
            error: error.message
        });
    }
});

// Delete employee
app.delete('/api/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // First get employee_id to delete related records
        const [employee] = await db.query('SELECT employee_id FROM employees WHERE id = ?', [id]);

        if (employee.length > 0) {
            // Delete leave balances
            await db.query('DELETE FROM leave_balances WHERE employee_id = ?', [employee[0].employee_id]);

            // Delete leaves
            await db.query('DELETE FROM leaves WHERE employee_id = ?', [employee[0].employee_id]);

            // Delete attendance
            await db.query('DELETE FROM attendance WHERE employee_id = ?', [employee[0].employee_id]);
        }

        // Delete employee
        await db.query('DELETE FROM employees WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Employee deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete employee',
            error: error.message
        });
    }
});

// ============== DOCUMENT UPLOAD ROUTE ==============

// Upload documents endpoint - IMPROVED VERSION
app.post('/api/employees/:employeeId/documents', uploadDocuments.any(), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const files = req.files;
    
    console.log('='.repeat(50));
    console.log('📄 UPLOAD DOCUMENTS REQUEST');
    console.log('Employee ID:', employeeId);
    console.log('Files received:', files ? files.length : 0);
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const documentUpdates = {};
    
    files.forEach(file => {
      const fieldName = file.fieldname;
      documentUpdates[fieldName] = file.filename;
      console.log(`✅ File uploaded for ${fieldName}:`, file.filename);
    });

    // First check if employee exists
    const [employeeCheck] = await db.query(
      'SELECT employee_id FROM employees WHERE employee_id = ?',
      [employeeId]
    );

    if (employeeCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Update employee record with document names
    if (Object.keys(documentUpdates).length > 0) {
      // Build dynamic SET clause
      const setClause = Object.keys(documentUpdates)
        .map(key => `${key} = ?`)
        .join(', ');
      
      // Build values array (document values + employeeId at the end)
      const values = [...Object.values(documentUpdates), employeeId];
      
      const query = `UPDATE employees SET ${setClause} WHERE employee_id = ?`;
      console.log('Executing query:', query);
      console.log('With values:', values);
      
      const [result] = await db.query(query, values);
      
      console.log('📊 Database update result:', {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows
      });
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found or no changes made'
        });
      }
    }

    res.json({
      success: true,
      message: 'Documents uploaded successfully',
      documents: documentUpdates
    });

  } catch (error) {
    console.error('❌ Error uploading documents:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to upload documents',
      error: error.message,
      sqlMessage: error.sqlMessage
    });
  }
});

// Get employee documents - IMPROVED VERSION
app.get('/api/employees/:employeeId/documents', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    console.log(`📄 Fetching documents for employee: ${employeeId}`);
    
    // Try to find employee by employee_id first (string)
    let query = 'SELECT * FROM employees WHERE employee_id = ?';
    let value = employeeId;
    
    let [employees] = await db.query(query, [value]);
    
    // If not found, try by id (number)
    if (employees.length === 0 && !isNaN(employeeId)) {
      console.log('Employee not found by employee_id, trying by id...');
      query = 'SELECT * FROM employees WHERE id = ?';
      value = parseInt(employeeId);
      [employees] = await db.query(query, [value]);
    }
    
    if (employees.length === 0) {
      console.log('❌ Employee not found with identifier:', employeeId);
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    const employee = employees[0];
    console.log('✅ Employee found:', employee.employee_id);
    
    // Return all document fields
    const documents = {
      profile_image: employee.profile_image || null,
      appointment_letter: employee.appointment_letter || null,
      offer_letter: employee.offer_letter || null,
      contract_document: employee.contract_document || null,
      aadhar_card: employee.aadhar_card || null,
      pan_card: employee.pan_card || null,
      resume: employee.resume || null,
      salary_slip: employee.salary_slip || null,
      bank_proof: employee.bank_proof || null,
      education_certificates: employee.education_certificates || null,
      experience_certificates: employee.experience_certificates || null,
      relieving_letter: employee.relieving_letter || null
    };
    
    console.log('✅ Documents fetched successfully');
    res.json(documents);

  } catch (error) {
    console.error('❌ Error fetching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents',
      error: error.message
    });
  }
});

// Get specific document - IMPROVED VERSION
app.get('/api/employees/:employeeId/documents/:documentType', async (req, res) => {
  try {
    const { employeeId, documentType } = req.params;
    const { inline } = req.query; // For viewing in browser vs downloading
    
    console.log(`📄 Fetching document ${documentType} for employee: ${employeeId}`);
    
    // Try to find employee by employee_id first
    let query = 'SELECT * FROM employees WHERE employee_id = ?';
    let value = employeeId;
    
    let [employees] = await db.query(query, [value]);
    
    // If not found, try by id
    if (employees.length === 0 && !isNaN(employeeId)) {
      console.log('Employee not found by employee_id, trying by id...');
      query = 'SELECT * FROM employees WHERE id = ?';
      value = parseInt(employeeId);
      [employees] = await db.query(query, [value]);
    }
    
    if (employees.length === 0) {
      console.log('❌ Employee not found');
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    const employee = employees[0];
    
    // Check if document exists
    if (!employee[documentType]) {
      console.log('❌ Document not found in database:', documentType);
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const filename = employee[documentType];
    console.log('Document filename:', filename);
    
    // Check multiple possible file paths
    const possiblePaths = [
      path.join(__dirname, 'uploads/documents', filename),
      path.join(__dirname, 'uploads', filename),
      path.join(__dirname, 'uploads/profiles', filename),
      path.join(__dirname, '../uploads/documents', filename), // Try parent directory
      path.join(__dirname, '../uploads', filename)
    ];
    
    let filePath = null;
    for (const p of possiblePaths) {
      console.log('Checking path:', p);
      if (fs.existsSync(p)) {
        filePath = p;
        console.log('✅ File found at:', p);
        break;
      }
    }

    if (!filePath) {
      console.log(`⚠️ File not found on server: ${filename}`);
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    
    // Set appropriate headers
    if (inline === 'true') {
      // For viewing in browser
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    } else {
      // For downloading
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    
    // Set content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain'
    };
    
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
    
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    console.log('Sending file:', filePath);
    
    // Send file
    res.sendFile(filePath);

  } catch (error) {
    console.error('❌ Error fetching document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document',
      error: error.message
    });
  }
});

// ============== LEAVE ROUTES ==============
const leaveRoutes = require('./routes/leaveRoutes');
app.use('/api/leaves', leaveRoutes);

// ============== ATTENDANCE ROUTES ==============
const attendanceRoutes = require('./routes/attendanceRoutes');
app.use('/api/attendance', attendanceRoutes);

// ============== NOTIFICATION ROUTES ==============

// Get notifications for employee
app.get('/api/notifications', async (req, res) => {
    try {
        const { employee_id } = req.query;

        const [rows] = await db.query(
            `SELECT * FROM notifications 
             WHERE employee_id = ? 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [employee_id]
        );

        res.json(rows);

    } catch (error) {
        console.error('❌ Error fetching notifications:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE notification
app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query('DELETE FROM notifications WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(
            'UPDATE notifications SET is_read = true WHERE id = ?',
            [id]
        );

        res.json({ success: true });

    } catch (error) {
        console.error('❌ Error marking notification as read:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============== SHIFTS ROUTES ==============
app.get('/api/shifts', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM shifts ORDER BY id');
        res.json(rows);
    } catch (error) {
        console.error('❌ Error fetching shifts:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============== SALARY ROUTES ==============
const salaryRoutes = require('./routes/salaryRoutes');
app.use('/api/salary', salaryRoutes);

// ============== ADMIN UPDATE ROUTES ==============
const adminUpdateRoutes = require('./routes/adminUpdateRoutes');
app.use('/api/admin-updates', adminUpdateRoutes);

// ============== EMPLOYEE UPDATE ROUTES ==============
const employeeUpdateRoutes = require('./routes/employeeUpdateRoutes');
app.use('/api/employee-updates', employeeUpdateRoutes);

// ============== UPDATE RESPONSE ROUTES ==============
const updateResponseRoutes = require('./routes/updateResponseRoutes');
app.use('/api/update-responses', updateResponseRoutes);

// ============== ERROR HANDLING ==============
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.url} not found`
    });
});

// ============== START SERVER ==============
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(70));
    console.log(`🚀 SERVER STARTED SUCCESSFULLY`);
    console.log('='.repeat(70));
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log('='.repeat(70));
    console.log(`📝 TEST ROUTES:`);
    console.log(`   - GET  /api/test`);
    console.log(`   - GET  /api/test-db`);
    console.log('='.repeat(70));
    console.log(`🔐 AUTH ROUTES:`);
    console.log(`   - POST /api/auth/login`);
    console.log('='.repeat(70));
    console.log(`👥 EMPLOYEE ROUTES:`);
    console.log(`   - GET    /api/employees`);
    console.log(`   - GET    /api/employees/:id`);
    console.log(`   - GET    /api/employees/profile/:employeeId`);
    console.log(`   - POST   /api/employees`);
    console.log(`   - PUT    /api/employees/:id`);
    console.log(`   - DELETE /api/employees/:id`);
    console.log(`   - GET    /api/employees/today-events`);
    console.log(`   - POST   /api/employees/:employeeId/documents (UPLOAD)`);
    console.log(`   - GET    /api/employees/:employeeId/documents`);
    console.log(`   - GET    /api/employees/:employeeId/documents/:documentType`);
    console.log('='.repeat(70));
    console.log(`📅 LEAVE ROUTES:`);
    console.log(`   - GET    /api/leaves`);
    console.log(`   - GET    /api/leaves/balance/:employeeId`);
    console.log(`   - GET    /api/leaves/balance/:employeeId/:year`);
    console.log(`   - POST   /api/leaves`);
    console.log(`   - PUT    /api/leaves/:id/status`);
    console.log('='.repeat(70));
    console.log(`⏰ ATTENDANCE ROUTES:`);
    console.log(`   - GET    /api/attendance/report`);
    console.log(`   - GET    /api/attendance/today/:employee_id`);
    console.log(`   - POST   /api/attendance/clock-in`);
    console.log(`   - POST   /api/attendance/clock-out`);
    console.log('='.repeat(70));
    console.log(`🔔 NOTIFICATION ROUTES:`);
    console.log(`   - GET    /api/notifications`);
    console.log(`   - PUT    /api/notifications/:id/read`);
    console.log('='.repeat(70));
    console.log(`💰 SALARY ROUTES:`);
    console.log(`   - GET    /api/salary/employee/:employeeId`);
    console.log(`   - POST   /api/salary/generate`);
    console.log('='.repeat(70));
    console.log(`📁 Uploads directory: ${path.join(__dirname, 'uploads')}`);
    console.log('='.repeat(70));
    console.log(`✅ Database: ${process.env.DB_NAME || 'ems_db'}`);
    console.log('='.repeat(70));
});