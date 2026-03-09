const db = require('../config/database');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const EmployeeService = require('../services/employeeService');


// Generate Employee ID (B2B_YY_MM_Sequence)
const generateEmployeeId = async () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2); // Last 2 digits of year
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month with leading zero

    try {
        // Get count of employees joined THIS MONTH
        const [result] = await db.query(
            `SELECT COUNT(*) as count FROM employees 
             WHERE MONTH(joining_date) = MONTH(CURRENT_DATE()) 
             AND YEAR(joining_date) = YEAR(CURRENT_DATE())`
        );

        // Get the sequence number for this month (add 1 to count)
        const sequence = (result[0].count + 1).toString().padStart(3, '0'); // 3 digits with leading zeros
        const employeeId = `B2B${year}${month}${sequence}`;

        console.log('Generated Employee ID:', {
            year,
            month,
            count: result[0].count,
            sequence,
            employeeId
        });

        return employeeId;
    } catch (error) {
        console.error('Error generating employee ID:', error);
        // Fallback with random sequence if error
        const randomSeq = Math.floor(Math.random() * 90 + 10).toString().padStart(3, '0');
        return `B2B${year}${month}${randomSeq}`;
    }
};

// Create new employee
exports.createEmployee = async (req, res) => {
    try {
        console.log('='.repeat(50));
        console.log('CREATE EMPLOYEE REQUEST RECEIVED');
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        console.log('='.repeat(50));

        const {
            first_name,
            middle_name,
            last_name,
            dob,
            position,
            joining_date,
            address,
            department,
            reporting_manager,
            employment_type,
            salary,
            emergency_contact, // New field
            shift_timing,
            contract_policy
        } = req.body;

        // Validate required fields
        const requiredFields = {
            first_name,
            last_name,
            dob,
            position,
            joining_date,
            address,
            department,
            salary
        };

        const missingFields = [];
        for (const [field, value] of Object.entries(requiredFields)) {
            if (!value) {
                missingFields.push(field);
            }
        }

        if (missingFields.length > 0) {
            console.log('Missing required fields:', missingFields);
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                missingFields: missingFields
            });
        }

        // Format dates
        const formatDateForMySQL = (dateStr) => {
            if (!dateStr) return null;
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return dateStr;
            }
            if (dateStr.includes('/')) {
                const [month, day, year] = dateStr.split('/');
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            return dateStr;
        };

        const formattedDob = formatDateForMySQL(dob);
        const formattedJoiningDate = formatDateForMySQL(joining_date);

        console.log('Formatted Dates:', {
            dob: formattedDob,
            joining_date: formattedJoiningDate
        });

        // Generate employee ID based on JOINING DATE
        const employeeId = await generateEmployeeIdBasedOnJoiningDate(formattedJoiningDate);
        console.log('Generated Employee ID:', employeeId);

        // Calculate initial joining months count (0 for new employees)
        const monthsCompleted = 0;
        const canApplyLeave = false;

        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Insert employee with emergency contact
            console.log('Inserting employee with data:', {
                employee_id: employeeId,
                first_name,
                middle_name: middle_name || null,
                last_name,
                dob: formattedDob,
                position,
                joining_date: formattedJoiningDate,
                address,
                department,
                reporting_manager: reporting_manager || null,
                employment_type: employment_type || 'Full Time',
                salary: parseFloat(salary),
                emergency_contact: emergency_contact || null,
                shift_timing: shift_timing || '9:00 AM - 6:00 PM',
                contract_policy: contract_policy || null,
                joining_month_count: monthsCompleted,
                can_apply_leave: canApplyLeave
            });

            const [employeeResult] = await connection.query(
                `INSERT INTO employees 
                (employee_id, first_name, middle_name, last_name, dob, position, 
                joining_date, address, department, reporting_manager, employment_type, 
                salary, emergency_contact, shift_timing, contract_policy, joining_month_count, can_apply_leave) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    employeeId,
                    first_name,
                    middle_name || null,
                    last_name,
                    formattedDob,
                    position,
                    formattedJoiningDate,
                    address,
                    department,
                    reporting_manager || null,
                    employment_type || 'Full Time',
                    parseFloat(salary),
                    emergency_contact || null,
                    shift_timing || '9:00 AM - 6:00 PM',
                    contract_policy || null,
                    monthsCompleted,
                    canApplyLeave
                ]
            );

            console.log('Employee inserted successfully. Insert ID:', employeeResult.insertId);

            // Create user account for employee
            const hashedPassword = await bcrypt.hash('Welcome@123', 10);
            const email = `emp_${employeeId.toLowerCase()}@ems.com`;

            console.log('Creating user account with email:', email);

            const [userResult] = await connection.query(
                'INSERT INTO users (employee_id, email, password, role) VALUES (?, ?, ?, ?)',
                [employeeId, email, hashedPassword, 'employee']
            );

            console.log('User account created successfully. User ID:', userResult.insertId);

            // Initialize leave balance for current year (0 leaves initially)
            try {
                const currentYear = new Date().getFullYear();

                const [tables] = await connection.query("SHOW TABLES LIKE 'leave_balance'");

                if (tables.length > 0) {
                    await connection.query(
                        `INSERT INTO leave_balance (employee_id, leave_year, total_accrued, total_used, total_pending, current_balance) 
                         VALUES (?, ?, 0, 0, 0, 0)`,
                        [employeeId, currentYear]
                    );
                    console.log('Leave balance initialized for year', currentYear);
                }
            } catch (balanceError) {
                console.log('Leave balance table might not exist, skipping...', balanceError.message);
            }

            // Commit transaction
            await connection.commit();
            console.log('Transaction committed successfully');

            console.log('Employee creation completed successfully');
            console.log('Login credentials:');
            console.log('Email:', email);
            console.log('Password: Welcome@123');

            res.status(201).json({
                success: true,
                message: 'Employee created successfully',
                employeeId,
                id: employeeResult.insertId,
                email: email,
                loginCredentials: {
                    email: email,
                    password: 'Welcome@123'
                }
            });

        } catch (error) {
            await connection.rollback();
            console.error('Transaction rolled back due to error');
            throw error;
        } finally {
            connection.release();
            console.log('Database connection released');
        }

    } catch (error) {
        console.error('='.repeat(50));
        console.error('ERROR CREATING EMPLOYEE:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('SQL message:', error.sqlMessage);
        console.error('SQL state:', error.sqlState);
        console.error('SQL:', error.sql);
        console.error('Stack:', error.stack);
        console.error('='.repeat(50));

        let errorMessage = 'Error creating employee';
        let statusCode = 500;

        if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'Employee ID already exists';
            statusCode = 409;
        } else if (error.code === 'ER_NO_REFERENCED_ROW') {
            errorMessage = 'Foreign key constraint failed';
            statusCode = 400;
        } else if (error.code === 'ER_BAD_NULL_ERROR') {
            errorMessage = 'Required field cannot be null';
            statusCode = 400;
        } else if (error.code === 'ER_BAD_FIELD_ERROR') {
            errorMessage = 'Database column mismatch. Please check if all columns exist.';
            statusCode = 500;
        } else if (error.sqlMessage) {
            errorMessage = `Database error: ${error.sqlMessage}`;
        }

        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message,
            sqlMessage: error.sqlMessage,
            code: error.code
        });
    }
};

// Generate Employee ID with 2-digit sequence - FIXED VERSION
const generateEmployeeIdBasedOnJoiningDate = async (joiningDate) => {
    const date = new Date(joiningDate);
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    try {
        console.log('Generating employee ID for joining date:', joiningDate);
        console.log('Year:', year, 'Month:', month);

        // First, check what's the maximum sequence number for this month
        const [result] = await db.query(
            `SELECT employee_id FROM employees 
             WHERE employee_id LIKE CONCAT('B2B', ?, ?, '%')
             ORDER BY CAST(SUBSTRING(employee_id, -2) AS UNSIGNED) DESC 
             LIMIT 1`,
            [year, month]
        );

        let nextSequence = 1;

        if (result.length > 0) {
            // Extract the last 2 digits from the existing ID
            const lastId = result[0].employee_id;
            const lastSequence = parseInt(lastId.slice(-2));
            nextSequence = lastSequence + 1;
            console.log('Last sequence found:', lastSequence, 'Next sequence:', nextSequence);
        } else {
            console.log('No existing employees for this month, starting with sequence 01');
        }

        // Ensure sequence doesn't exceed 99
        if (nextSequence > 99) {
            throw new Error('Maximum employees for this month reached (99)');
        }

        // Format sequence as 2 digits with leading zero
        const sequence = nextSequence.toString().padStart(2, '0');
        const employeeId = `B2B${year}${month}${sequence}`;

        // Double-check if this ID already exists (extra safety)
        const [existing] = await db.query(
            'SELECT employee_id FROM employees WHERE employee_id = ?',
            [employeeId]
        );

        if (existing.length > 0) {
            console.log('Generated ID already exists, trying next sequence');
            // If it exists, try the next number recursively
            return await generateEmployeeIdBasedOnJoiningDate(joiningDate);
        }

        console.log('Generated Employee ID:', {
            joiningDate,
            year,
            month,
            nextSequence,
            sequence,
            employeeId
        });

        return employeeId;
    } catch (error) {
        console.error('Error generating employee ID:', error);
        // Fallback with timestamp + random to ensure uniqueness
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.floor(Math.random() * 90 + 10).toString();
        return `B2B${year}${month}${timestamp.slice(-2)}`;
    }
};

// Get all employees (for admin)
exports.getAllEmployees = async (req, res) => {
    try {
        const [employees] = await db.query(`
            SELECT * FROM employees 
            ORDER BY created_at DESC
        `);

        console.log(`Found ${employees.length} employees`);
        res.json(employees);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ message: 'Error fetching employees' });
    }
};

// Get employee by ID
exports.getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [employees] = await db.query(
            'SELECT * FROM employees WHERE id = ?',
            [id]
        );
        
        if (employees.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.json(employees[0]);
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ message: 'Error fetching employee', error: error.message });
    }
};

// Get employee profile by employee_id
exports.getEmployeeProfile = async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        const [employees] = await db.query(
            'SELECT * FROM employees WHERE employee_id = ?',
            [employeeId]
        );
        
        if (employees.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.json(employees[0]);
    } catch (error) {
        console.error('Error fetching employee profile:', error);
        res.status(500).json({ message: 'Error fetching employee profile' });
    }
};

// Update employee
exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Remove fields that shouldn't be updated
        delete updates.id;
        delete updates.employee_id;
        delete updates.created_at;

        const [result] = await db.query(
            'UPDATE employees SET ? WHERE id = ?',
            [updates, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Fetch updated employee
        const [updatedEmployee] = await db.query(
            'SELECT * FROM employees WHERE id = ?',
            [id]
        );

        res.json({
            message: 'Employee updated successfully',
            employee: updatedEmployee[0]
        });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ message: 'Error updating employee' });
    }
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        // First get the employee to know their employee_id
        const [employee] = await db.query(
            'SELECT employee_id FROM employees WHERE id = ?',
            [id]
        );

        if (employee.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const employeeId = employee[0].employee_id;

        // Delete from users table first (due to foreign key)
        await db.query('DELETE FROM users WHERE employee_id = ?', [employeeId]);

        // Then delete from employees table
        const [result] = await db.query('DELETE FROM employees WHERE id = ?', [id]);

        res.json({
            message: 'Employee deleted successfully',
            employeeId: employeeId
        });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ message: 'Error deleting employee' });
    }
};

// Upload employee documents
exports.uploadDocuments = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const files = req.files;
        
        console.log('='.repeat(50));
        console.log('UPLOAD DOCUMENTS REQUEST');
        console.log('Employee ID:', employeeId);
        console.log('Files received:', Object.keys(files || {}));
        console.log('='.repeat(50));

        if (!files || Object.keys(files).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        const uploadedFiles = {};

        // Process each uploaded file
        Object.keys(files).forEach(fieldname => {
            if (files[fieldname] && files[fieldname][0]) {
                const file = files[fieldname][0];
                uploadedFiles[fieldname] = file.filename;
                console.log(`File uploaded for ${fieldname}:`, {
                    filename: file.filename,
                    originalName: file.originalname,
                    size: file.size,
                    mimetype: file.mimetype,
                    path: file.path
                });
            }
        });

        console.log('Files to update in database:', uploadedFiles);

        // Update employee record with file paths
        if (Object.keys(uploadedFiles).length > 0) {
            // Build the SET clause dynamically
            const setClause = Object.keys(uploadedFiles)
                .map(key => `${key} = ?`)
                .join(', ');
            
            const values = [...Object.values(uploadedFiles), employeeId];
            
            const [result] = await db.query(
                `UPDATE employees SET ${setClause} WHERE employee_id = ?`,
                values
            );

            console.log('Database update result:', {
                affectedRows: result.affectedRows,
                changedRows: result.changedRows
            });
        }

        // Fetch the updated employee to verify
        const [updatedEmployee] = await db.query(
            'SELECT * FROM employees WHERE employee_id = ?',
            [employeeId]
        );

        console.log('Updated employee records:', updatedEmployee[0]);

        res.json({
            success: true,
            message: 'Documents uploaded successfully',
            files: uploadedFiles,
            employee: updatedEmployee[0]
        });

    } catch (error) {
        console.error('='.repeat(50));
        console.error('ERROR UPLOADING DOCUMENTS:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('='.repeat(50));

        res.status(500).json({ 
            success: false, 
            message: 'Error uploading documents',
            error: error.message,
            sqlMessage: error.sqlMessage
        });
    }
};

// Get employee documents
exports.getEmployeeDocuments = async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        console.log('Fetching documents for employee:', employeeId);
        
        const [employees] = await db.query(
            `SELECT 
                profile_image, 
                appointment_letter, 
                offer_letter, 
                contract_document, 
                aadhar_card, 
                pan_card,
                relieving_letter,
                salary_slip 
            FROM employees 
            WHERE employee_id = ?`,
            [employeeId]
        );

        if (employees.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Filter out null/undefined/empty values
        const documents = {};
        Object.keys(employees[0]).forEach(key => {
            const value = employees[0][key];
            if (value && value !== 'null' && value !== '') {
                documents[key] = value;
            }
        });

        console.log('Documents found:', documents);

        res.json(documents);

    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ message: 'Error fetching documents', error: error.message });
    }
};

// Download document
exports.downloadDocument = async (req, res) => {
    try {
        const { employeeId, documentType } = req.params;
        
        console.log('='.repeat(50));
        console.log('DOWNLOAD DOCUMENT REQUEST');
        console.log('Employee ID/Param:', employeeId);
        console.log('Document Type:', documentType);
        console.log('='.repeat(50));

        // First, try to find the employee by id or employee_id
        const [employees] = await db.query(
            'SELECT * FROM employees WHERE id = ? OR employee_id = ?',
            [employeeId, employeeId]
        );

        if (employees.length === 0) {
            console.log('Employee not found for ID:', employeeId);
            return res.status(404).json({ message: 'Employee not found' });
        }

        const employee = employees[0];
        console.log('Found employee:', employee.employee_id, employee.first_name);

        // Get the filename from the database
        const filename = employee[documentType];
        
        if (!filename) {
            console.log('Document not found for type:', documentType);
            return res.status(404).json({ message: 'Document not found in database' });
        }

        console.log('Document filename:', filename);

        // Determine the correct file path
        const baseDir = path.join(__dirname, '..');
        let filePath;

        if (documentType === 'profile_image') {
            filePath = path.join(baseDir, 'uploads/profiles/', filename);
        } else {
            filePath = path.join(baseDir, 'uploads/documents/', filename);
        }

        console.log('Looking for file at:', filePath);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.log('File not found on disk at:', filePath);
            
            // Try alternative paths
            const altPath = path.join(baseDir, 'uploads/documents/', filename);
            console.log('Trying alternative path:', altPath);
            
            if (fs.existsSync(altPath)) {
                console.log('File found at alternative path');
                filePath = altPath;
            } else {
                return res.status(404).json({ message: 'File not found on server' });
            }
        }

        // Get file stats
        const stats = fs.statSync(filePath);
        const ext = path.extname(filename).toLowerCase();
        
        console.log('File extension:', ext);
        console.log('File size:', stats.size);

        // Set appropriate headers based on file type
        let contentType = 'application/octet-stream';
        let contentDisposition = `inline; filename="${filename}"`;
        
        // Handle different file types
        const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        const pdfExts = ['.pdf'];
        const wordExts = ['.doc', '.docx'];
        const textExts = ['.txt', '.csv', '.json'];
        
        if (pdfExts.includes(ext)) {
            contentType = 'application/pdf';
            contentDisposition = `inline; filename="${filename}"`; // Show in browser
        } 
        else if (imageExts.includes(ext)) {
            contentType = `image/${ext.replace('.', '')}`;
            contentDisposition = `inline; filename="${filename}"`; // Show in browser
        }
        else if (wordExts.includes(ext)) {
            contentType = ext === '.doc' ? 'application/msword' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            contentDisposition = `attachment; filename="${filename}"`; // Force download
        }
        else if (textExts.includes(ext)) {
            contentType = 'text/plain';
            contentDisposition = `inline; filename="${filename}"`; // Show in browser
        }
        else {
            // For other file types, force download
            contentDisposition = `attachment; filename="${filename}"`;
        }

        // Set headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', contentDisposition);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');

        console.log('Sending file with headers:', {
            contentType,
            contentDisposition,
            contentLength: stats.size
        });

        // Send the file
        res.sendFile(filePath);

    } catch (error) {
        console.error('='.repeat(50));
        console.error('ERROR DOWNLOADING DOCUMENT:');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('='.repeat(50));

        res.status(500).json({ 
            success: false, 
            message: 'Error downloading document',
            error: error.message 
        });
    }
};

// Add endpoint to manually update all employees' months
exports.updateAllEmployeesMonths = async (req, res) => {
    try {
        const results = await EmployeeService.updateAllEmployeesMonths();
        res.json({
            success: true,
            message: 'All employees updated successfully',
            results
        });
    } catch (error) {
        console.error('Error updating employees:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating employees',
            error: error.message
        });
    }
};

exports.updateEmployeeMonths = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const result = await EmployeeService.updateEmployeeMonths(employeeId);
        res.json({
            success: true,
            message: 'Employee updated successfully',
            ...result
        });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating employee',
            error: error.message
        });
    }
};
