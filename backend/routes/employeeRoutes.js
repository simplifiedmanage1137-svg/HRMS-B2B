// routes/employeeRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/documents');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
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

// ============== TODAY'S EVENTS ROUTE (BIRTHDAYS & ANNIVERSARIES) ==============
// Get today's birthdays and work anniversaries
router.get('/today-events', async (req, res) => {
    try {
        const today = new Date();
        const todayMonth = today.getMonth() + 1;
        const todayDay = today.getDate();
        
        console.log('📅 Fetching events for date:', `${todayMonth}-${todayDay}`);
        
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

// ============== EMPLOYEE CRUD OPERATIONS ==============

// Create new employee
router.post('/', async (req, res) => {
    try {
        const {
            first_name, middle_name, last_name, employee_id, email,
            joining_date, designation, department, reporting_manager,
            employment_type, shift_timing,
            in_hand_salary, gross_salary,
            bank_account_name, account_number, ifsc_code, branch_name,
            pan_number, aadhar_number, dob, address, blood_group,
            emergency_contact, contract_policy
        } = req.body;

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
            first_name, middle_name || null, last_name, employee_id, email,
            joining_date, designation, department, reporting_manager || null,
            employment_type || 'Full Time', shift_timing || '9:00 AM - 6:00 PM',
            in_hand_salary, gross_salary,
            bank_account_name, account_number, ifsc_code, branch_name,
            pan_number, aadhar_number, dob, address, blood_group || null,
            emergency_contact, contract_policy || null
        ];

        const [result] = await db.query(query, values);

        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            employee: {
                id: result.insertId,
                employee_id
            }
        });

    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create employee',
            error: error.message
        });
    }
});

// Update employee
router.put('/:id', async (req, res) => {
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
            updates.first_name, updates.middle_name || null, updates.last_name, updates.email,
            updates.joining_date, updates.designation, updates.department,
            updates.reporting_manager || null, updates.employment_type, updates.shift_timing,
            updates.in_hand_salary, updates.gross_salary,
            updates.bank_account_name, updates.account_number, updates.ifsc_code,
            updates.branch_name, updates.pan_number, updates.aadhar_number,
            updates.dob, updates.address, updates.blood_group || null, updates.emergency_contact,
            updates.contract_policy || null,
            id
        ];

        await db.query(query, values);

        res.json({
            success: true,
            message: 'Employee updated successfully'
        });

    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update employee',
            error: error.message
        });
    }
});

// Get employee by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM employees WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employee',
            error: error.message
        });
    }
});

// Get employee by employee_id (for profile)
router.get('/profile/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const [rows] = await db.query('SELECT * FROM employees WHERE employee_id = ?', [employeeId]);
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error('Error fetching employee profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employee profile',
            error: error.message
        });
    }
});

// Get all employees
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM employees ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employees',
            error: error.message
        });
    }
});

// Delete employee
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM employees WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Employee deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete employee',
            error: error.message
        });
    }
});

// ============== DOCUMENT MANAGEMENT ==============

// Upload documents
router.post('/:employeeId/documents', upload.any(), async (req, res) => {
    try {
        const { employeeId } = req.params;
        const files = req.files;
        
        const documentUpdates = {};
        
        files.forEach(file => {
            const fieldName = file.fieldname;
            documentUpdates[fieldName] = file.filename;
        });

        // Update employee record with document names
        if (Object.keys(documentUpdates).length > 0) {
            const setClause = Object.keys(documentUpdates)
                .map(key => `${key} = ?`)
                .join(', ');
            const values = [...Object.values(documentUpdates), employeeId];
            
            await db.query(
                `UPDATE employees SET ${setClause} WHERE employee_id = ?`,
                values
            );
        }

        res.json({
            success: true,
            message: 'Documents uploaded successfully',
            documents: documentUpdates
        });

    } catch (error) {
        console.error('Error uploading documents:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload documents',
            error: error.message
        });
    }
});

// Get employee documents
router.get('/:employeeId/documents', async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        const [rows] = await db.query(
            `SELECT 
                profile_image, appointment_letter, offer_letter, 
                contract_document, aadhar_card, pan_card, 
                bank_proof, education_certificates, experience_certificates
            FROM employees WHERE employee_id = ?`,
            [employeeId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch documents',
            error: error.message
        });
    }
});

// Download specific document
router.get('/:employeeId/documents/:documentType', async (req, res) => {
    try {
        const { employeeId, documentType } = req.params;
        
        const [rows] = await db.query(
            `SELECT ${documentType} FROM employees WHERE employee_id = ?`,
            [employeeId]
        );

        if (rows.length === 0 || !rows[0][documentType]) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        const filename = rows[0][documentType];
        const filePath = path.join(__dirname, '../uploads/documents', filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }

        res.download(filePath, filename);

    } catch (error) {
        console.error('Error downloading document:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download document',
            error: error.message
        });
    }
});

// Delete specific document
router.delete('/:employeeId/documents/:documentType', async (req, res) => {
    try {
        const { employeeId, documentType } = req.params;
        
        // Get filename first
        const [rows] = await db.query(
            `SELECT ${documentType} FROM employees WHERE employee_id = ?`,
            [employeeId]
        );

        if (rows.length > 0 && rows[0][documentType]) {
            const filename = rows[0][documentType];
            const filePath = path.join(__dirname, '../uploads/documents', filename);
            
            // Delete file from filesystem
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Update database
        await db.query(
            `UPDATE employees SET ${documentType} = NULL WHERE employee_id = ?`,
            [employeeId]
        );

        res.json({
            success: true,
            message: 'Document deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete document',
            error: error.message
        });
    }
});

// routes/employeeRoutes.js
router.get('/api/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // IMPORTANT: Select ALL columns
        const [rows] = await db.query(
            `SELECT 
                id, employee_id, first_name, middle_name, last_name,
                email, phone, designation, department, joining_date,
                employment_type, shift_timing, reporting_manager,
                in_hand_salary, gross_salary,
                bank_account_name, account_number, ifsc_code, branch_name,
                pan_number, aadhar_number, dob, address, 
                city, state, pincode, blood_group,
                emergency_contact, contract_policy,
                profile_image, appointment_letter, offer_letter,
                contract_document, aadhar_card, pan_card,
                bank_proof, education_certificates, experience_certificates,
                created_at, updated_at
             FROM employees 
             WHERE id = ?`,
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        
        console.log('📤 Sending employee data:', Object.keys(rows[0])); // Debug: kaunse columns aa rahe hain
        res.json(rows[0]);
        
    } catch (error) {
        console.error('❌ Error fetching employee:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;