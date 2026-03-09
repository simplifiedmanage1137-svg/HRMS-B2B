const db = require('../config/database');

async function migrateAttendance() {
    try {
        console.log('Starting attendance migration...');

        // Check if attendance table exists
        const [tables] = await db.query("SHOW TABLES LIKE 'attendance'");
        
        if (tables.length === 0) {
            console.log('Creating attendance table...');
            await db.query(`
                CREATE TABLE attendance (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    employee_id VARCHAR(20) NOT NULL,
                    attendance_date DATE NOT NULL,
                    clock_in DATETIME,
                    clock_out DATETIME,
                    total_hours DECIMAL(5,2) DEFAULT 0,
                    status ENUM('present', 'half_day', 'absent', 'holiday') DEFAULT 'absent',
                    late_minutes DECIMAL(8,3) DEFAULT 0,
                    early_minutes DECIMAL(8,3) DEFAULT 0,
                    latitude DECIMAL(10,8),
                    longitude DECIMAL(11,8),
                    location_accuracy DECIMAL(5,2),
                    shift_time_used VARCHAR(50),
                    session_id VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_employee_date (employee_id, attendance_date),
                    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
                )
            `);
            console.log('✅ Attendance table created');
        } else {
            console.log('Attendance table exists, checking columns...');
            
            // Check if early_minutes column exists
            try {
                await db.query("SELECT early_minutes FROM attendance LIMIT 1");
                console.log('✅ early_minutes column exists');
            } catch (error) {
                console.log('Adding early_minutes column...');
                await db.query("ALTER TABLE attendance ADD COLUMN early_minutes DECIMAL(8,3) DEFAULT 0");
                console.log('✅ early_minutes column added');
            }

            // Check if shift_time_used column exists
            try {
                await db.query("SELECT shift_time_used FROM attendance LIMIT 1");
                console.log('✅ shift_time_used column exists');
            } catch (error) {
                console.log('Adding shift_time_used column...');
                await db.query("ALTER TABLE attendance ADD COLUMN shift_time_used VARCHAR(50)");
                console.log('✅ shift_time_used column added');
            }
        }

        // Check if attendance_sessions table exists
        const [sessionsTables] = await db.query("SHOW TABLES LIKE 'attendance_sessions'");
        
        if (sessionsTables.length === 0) {
            console.log('Creating attendance_sessions table...');
            await db.query(`
                CREATE TABLE attendance_sessions (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    employee_id VARCHAR(20) NOT NULL,
                    session_id VARCHAR(100) NOT NULL,
                    clock_in_time DATETIME NOT NULL,
                    last_heartbeat DATETIME NOT NULL,
                    clock_out_time DATETIME,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
                    INDEX idx_session (session_id),
                    INDEX idx_active (is_active)
                )
            `);
            console.log('✅ attendance_sessions table created');
        }

        console.log('Migration completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateAttendance();