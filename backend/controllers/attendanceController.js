const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Generate unique session ID
const generateSessionId = () => {
    return uuidv4();
};

// Helper function to parse time string (e.g., "3:00 PM" or "15:00")
const parseTimeString = (timeStr) => {
    if (!timeStr) return null;
    
    console.log('Parsing time string:', timeStr);
    
    // Handle format like "3:00 PM - 12:00 AM"
    const parts = timeStr.split('-');
    let startTimeStr = timeStr;
    if (parts.length > 0) {
        startTimeStr = parts[0].trim();
    }
    
    // Try to parse time
    let hour = 9, minute = 0;
    
    // Check for AM/PM format (e.g., "3:00 PM")
    const ampmMatch = startTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (ampmMatch) {
        hour = parseInt(ampmMatch[1]);
        minute = parseInt(ampmMatch[2]);
        const ampm = ampmMatch[3].toUpperCase();
        
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        
        return { hour, minute };
    }
    
    // Check for 24-hour format (e.g., "15:00")
    const militaryMatch = startTimeStr.match(/(\d{1,2}):(\d{2})/);
    if (militaryMatch) {
        hour = parseInt(militaryMatch[1]);
        minute = parseInt(militaryMatch[2]);
        return { hour, minute };
    }
    
    return { hour, minute };
};

// Clock in
exports.clockIn = async (req, res) => {
    try {
        console.log('='.repeat(70));
        console.log('📍 CLOCK-IN REQUEST');
        console.log('Time:', new Date().toISOString());
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('='.repeat(70));

        const { employee_id, latitude, longitude, accuracy } = req.body;

        if (!employee_id) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID is required'
            });
        }

        // Get employee details
        const [employee] = await db.query(
            'SELECT * FROM employees WHERE employee_id = ?',
            [employee_id]
        );

        if (employee.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const emp = employee[0];
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTimeStr = now.toTimeString().split(' ')[0];
        const sessionId = generateSessionId();

        console.log('Employee:', emp.first_name, emp.last_name);
        console.log('Profile shift timing:', emp.shift_timing);

        // Parse shift time from employee profile
        let shiftHour = 9, shiftMinute = 0;
        let shiftDisplay = emp.shift_timing || '9:00 AM';
        
        if (emp.shift_timing) {
            const parsedTime = parseTimeString(emp.shift_timing);
            if (parsedTime) {
                shiftHour = parsedTime.hour;
                shiftMinute = parsedTime.minute;
                console.log(`✅ Using shift from profile: ${shiftHour}:${shiftMinute.toString().padStart(2, '0')}`);
            }
        }
        
        // Create shift start datetime for today
        const shiftStartTime = new Date(now);
        shiftStartTime.setHours(shiftHour, shiftMinute, 0, 0);
        
        console.log('Shift start time:', shiftStartTime.toLocaleString());
        console.log('Clock in time:', now.toLocaleString());

        // Calculate difference
        const diffMs = now - shiftStartTime;
        const isLate = diffMs > 0;
        const isEarly = diffMs < 0;
        const lateMinutes = isLate ? diffMs / (1000 * 60) : 0;
        const earlyMinutes = isEarly ? Math.abs(diffMs) / (1000 * 60) : 0;

        console.log('Is late:', isLate, 'Is early:', isEarly);
        console.log('Late minutes:', lateMinutes, 'Early minutes:', earlyMinutes);

        // Check if attendance table exists and has required columns
        try {
            // First, check if attendance table exists
            const [tables] = await db.query("SHOW TABLES LIKE 'attendance'");
            if (tables.length === 0) {
                console.log('⚠️ Attendance table does not exist, creating it...');
                
                // Create attendance table
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
                        UNIQUE KEY unique_employee_date (employee_id, attendance_date)
                    )
                `);
                console.log('✅ Attendance table created');
            }

            // Check if attendance_sessions table exists
            const [sessionsTables] = await db.query("SHOW TABLES LIKE 'attendance_sessions'");
            if (sessionsTables.length === 0) {
                console.log('⚠️ Attendance sessions table does not exist, creating it...');
                
                await db.query(`
                    CREATE TABLE attendance_sessions (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        employee_id VARCHAR(20) NOT NULL,
                        session_id VARCHAR(100) NOT NULL,
                        clock_in_time DATETIME NOT NULL,
                        last_heartbeat DATETIME NOT NULL,
                        clock_out_time DATETIME,
                        is_active BOOLEAN DEFAULT TRUE,
                        INDEX idx_session (session_id),
                        INDEX idx_active (is_active)
                    )
                `);
                console.log('✅ Attendance sessions table created');
            }
        } catch (tableError) {
            console.error('Error checking/creating tables:', tableError);
            // Continue anyway
        }

        // Check if already clocked in today
        const [existing] = await db.query(
            'SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = ?',
            [employee_id, today]
        );

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            if (existing.length > 0) {
                if (existing[0].clock_in && !existing[0].clock_out) {
                    await connection.rollback();
                    connection.release();
                    
                    return res.status(400).json({
                        success: false,
                        message: 'Already clocked in today',
                        clock_in: existing[0].clock_in
                    });
                }

                // Update existing record
                await connection.query(
                    `UPDATE attendance 
                     SET clock_in = ?, 
                         clock_out = NULL,
                         late_minutes = ?,
                         early_minutes = ?,
                         latitude = ?,
                         longitude = ?,
                         location_accuracy = ?,
                         session_id = ?,
                         shift_time_used = ?
                     WHERE employee_id = ? AND attendance_date = ?`,
                    [now, lateMinutes, earlyMinutes, latitude, longitude, accuracy, sessionId, shiftDisplay, employee_id, today]
                );
            } else {
                // Insert new record
                await connection.query(
                    `INSERT INTO attendance 
                     (employee_id, attendance_date, clock_in, late_minutes, early_minutes,
                      latitude, longitude, location_accuracy, session_id, shift_time_used) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [employee_id, today, now, lateMinutes, earlyMinutes, latitude, longitude, accuracy, sessionId, shiftDisplay]
                );
            }

            // Create or update active session
            await connection.query(
                `INSERT INTO attendance_sessions 
                 (employee_id, session_id, clock_in_time, last_heartbeat, is_active) 
                 VALUES (?, ?, ?, ?, true)
                 ON DUPLICATE KEY UPDATE
                 last_heartbeat = NOW(), is_active = true`,
                [employee_id, sessionId, now, now]
            );

            await connection.commit();
            connection.release();

            // Prepare response message
            let status = 'On Time';
            let message = '✅ Clocked in on time';
            let lateDisplay = null;
            let earlyDisplay = null;

            if (isLate) {
                status = 'Late';
                const lateSeconds = Math.round(lateMinutes * 60);
                
                if (lateSeconds < 60) {
                    lateDisplay = `${lateSeconds} second${lateSeconds !== 1 ? 's' : ''}`;
                } else {
                    const minutes = Math.floor(lateSeconds / 60);
                    const seconds = lateSeconds % 60;
                    lateDisplay = seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
                }
                message = `⚠️ Clocked in (${lateDisplay} late)`;
            } else if (isEarly) {
                status = 'Early';
                const earlySeconds = Math.round(earlyMinutes * 60);
                
                if (earlySeconds < 60) {
                    earlyDisplay = `${earlySeconds} second${earlySeconds !== 1 ? 's' : ''}`;
                } else {
                    const minutes = Math.floor(earlySeconds / 60);
                    const seconds = earlySeconds % 60;
                    earlyDisplay = seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
                }
                message = `⏰ Clocked in (${earlyDisplay} early)`;
            }

            const response = {
                success: true,
                message,
                clock_in: now,
                clock_in_time: currentTimeStr,
                shift_time: shiftDisplay,
                status,
                is_late: isLate,
                is_early: isEarly,
                session_id: sessionId,
                employee_name: `${emp.first_name} ${emp.last_name}`
            };

            if (isLate) {
                response.late_minutes = lateMinutes;
                response.late_display = lateDisplay;
            }
            if (isEarly) {
                response.early_minutes = earlyMinutes;
                response.early_display = earlyDisplay;
            }

            console.log('✅ Response:', response.message);
            res.json(response);

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('❌ Clock-in error:', error);
        console.error('Error stack:', error.stack);
        
        // Check for specific database errors
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(500).json({
                success: false,
                message: 'Database column mismatch. Please run database migrations.',
                error: error.message
            });
        }
        
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({
                success: false,
                message: 'Attendance tables not found. Please run database setup.',
                error: error.message
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Failed to clock in',
            error: error.message
        });
    }
};

// attendanceController.js - Clock Out with better error handling

// Clock out - FIXED with proper error messages
exports.clockOut = async (req, res) => {
    try {
        console.log('='.repeat(70));
        console.log('📍 CLOCK-OUT REQUEST');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('='.repeat(70));

        const { employee_id, session_id, latitude, longitude, accuracy } = req.body;

        if (!employee_id) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID is required'
            });
        }

        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // ============== FIND ANY INCOMPLETE ATTENDANCE ==============
            // First check for any incomplete attendance (from any day)
            const [incompleteAttendance] = await connection.query(
                `SELECT * FROM attendance 
                 WHERE employee_id = ? 
                 AND clock_in IS NOT NULL 
                 AND clock_out IS NULL 
                 ORDER BY attendance_date ASC 
                 LIMIT 1`,
                [employee_id]
            );

            let attendanceRecord = null;
            let activeSession = null;
            let attendanceDate = today;

            // Case 1: Found incomplete attendance from previous day(s)
            if (incompleteAttendance.length > 0) {
                attendanceRecord = incompleteAttendance[0];
                attendanceDate = attendanceRecord.attendance_date;
                
                console.log(`✅ Found incomplete attendance from ${attendanceDate}`);
                
                // Try to find associated session
                if (attendanceRecord.session_id) {
                    const [sessions] = await connection.query(
                        'SELECT * FROM attendance_sessions WHERE session_id = ? AND is_active = true',
                        [attendanceRecord.session_id]
                    );
                    if (sessions.length > 0) {
                        activeSession = sessions[0];
                    }
                }
            } else {
                // Case 2: Check for today's active session
                if (session_id) {
                    const [sessions] = await connection.query(
                        'SELECT * FROM attendance_sessions WHERE employee_id = ? AND session_id = ? AND is_active = true',
                        [employee_id, session_id]
                    );
                    if (sessions.length > 0) {
                        activeSession = sessions[0];
                    }
                }

                if (!activeSession) {
                    const [sessions] = await connection.query(
                        'SELECT * FROM attendance_sessions WHERE employee_id = ? AND is_active = true ORDER BY clock_in_time DESC LIMIT 1',
                        [employee_id]
                    );
                    if (sessions.length > 0) {
                        activeSession = sessions[0];
                    }
                }

                // If we have active session, get the attendance record
                if (activeSession) {
                    const sessionDate = new Date(activeSession.clock_in_time).toISOString().split('T')[0];
                    const [attendance] = await connection.query(
                        'SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = ?',
                        [employee_id, sessionDate]
                    );
                    if (attendance.length > 0) {
                        attendanceRecord = attendance[0];
                        attendanceDate = sessionDate;
                    }
                }
            }

            // If still no record found
            if (!attendanceRecord) {
                await connection.rollback();
                connection.release();
                
                // Check if employee exists
                const [employee] = await connection.query(
                    'SELECT * FROM employees WHERE employee_id = ?',
                    [employee_id]
                );
                
                if (employee.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Employee not found'
                    });
                }
                
                return res.status(400).json({
                    success: false,
                    message: 'No active clock-in found. Please clock in first.',
                    error_type: 'NO_ACTIVE_SESSION'
                });
            }

            console.log(`✅ Processing clock-out for attendance from ${attendanceDate}`);

            // Calculate total hours worked
            const clockIn = new Date(attendanceRecord.clock_in);
            const totalHours = (now - clockIn) / (1000 * 60 * 60);
            const totalMinutes = Math.round((now - clockIn) / (1000 * 60));

            // Check if this is a next-day clock-out
            const clockInDate = clockIn.toISOString().split('T')[0];
            const isNextDay = clockInDate !== today;

            // Determine status based on total hours
            let status = 'present';
            if (totalHours < 4) {
                status = 'absent';
            } else if (totalHours >= 4 && totalHours < 8) {
                status = 'half_day';
            }

            console.log(`📊 Total hours: ${totalHours.toFixed(2)} (from ${clockInDate} to ${today})`);
            console.log(`📊 Status: ${status}`);

            // Update attendance record
            await connection.query(
                `UPDATE attendance 
                 SET clock_out = ?, 
                     total_hours = ?,
                     status = ?,
                     latitude = COALESCE(?, latitude),
                     longitude = COALESCE(?, longitude),
                     location_accuracy = COALESCE(?, location_accuracy)
                 WHERE id = ?`,
                [now, totalHours.toFixed(2), status, latitude, longitude, accuracy, attendanceRecord.id]
            );

            // Deactivate session if exists
            if (activeSession) {
                await connection.query(
                    `UPDATE attendance_sessions 
                     SET is_active = false, 
                         clock_out_time = ?
                     WHERE id = ?`,
                    [now, activeSession.id]
                );
            }

            await connection.commit();
            connection.release();

            // Prepare response message
            let statusMessage = '';
            switch(status) {
                case 'present':
                    statusMessage = 'Full day present';
                    break;
                case 'half_day':
                    statusMessage = 'Half day';
                    break;
                case 'absent':
                    statusMessage = 'Marked as absent (insufficient hours)';
                    break;
            }

            const dateMessage = isNextDay ? ` for ${clockInDate}` : '';

            res.json({
                success: true,
                message: `Clocked out successfully${dateMessage}. ${statusMessage}`,
                clock_out: now,
                attendance_date: clockInDate,
                total_hours: totalHours.toFixed(2),
                status: status,
                is_next_day: isNextDay
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('❌ Clock-out error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to clock out',
            error: error.message
        });
    }
};

// Get today's attendance - FIXED
exports.getTodayAttendance = async (req, res) => {
    try {
        const { employee_id } = req.params;
        
        if (!employee_id) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID is required'
            });
        }

        const today = new Date().toISOString().split('T')[0];

        console.log('📊 Getting attendance for:', employee_id, today);

        // First check if employee exists
        const [employee] = await db.query(
            'SELECT * FROM employees WHERE employee_id = ?',
            [employee_id]
        );

        if (employee.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Check for today's attendance
        const [todayAttendance] = await db.query(
            `SELECT a.*, e.first_name, e.last_name, e.shift_timing 
             FROM attendance a
             JOIN employees e ON a.employee_id = e.employee_id
             WHERE a.employee_id = ? AND a.attendance_date = ?`,
            [employee_id, today]
        );

        // Check for any incomplete attendance from previous days
        const [incompleteAttendance] = await db.query(
            `SELECT a.*, e.first_name, e.last_name, e.shift_timing 
             FROM attendance a
             JOIN employees e ON a.employee_id = e.employee_id
             WHERE a.employee_id = ? 
             AND a.clock_in IS NOT NULL 
             AND a.clock_out IS NULL
             ORDER BY a.attendance_date DESC
             LIMIT 1`,
            [employee_id]
        );

        const [activeSession] = await db.query(
            'SELECT * FROM attendance_sessions WHERE employee_id = ? AND is_active = true',
            [employee_id]
        );

        // Determine which attendance to show
        let formattedAttendance = null;
        let hasPreviousIncomplete = false;

        if (incompleteAttendance.length > 0) {
            // There's an incomplete attendance from previous day
            formattedAttendance = { ...incompleteAttendance[0] };
            hasPreviousIncomplete = true;
            
            // Calculate hours so far
            const clockIn = new Date(formattedAttendance.clock_in);
            const now = new Date();
            const hoursSoFar = (now - clockIn) / (1000 * 60 * 60);
            formattedAttendance.hours_so_far = hoursSoFar.toFixed(2);
            formattedAttendance.is_previous_day = true;
            
            console.log(`⚠️ Found incomplete attendance from ${formattedAttendance.attendance_date}`);
            
        } else if (todayAttendance.length > 0) {
            // Normal today's attendance
            formattedAttendance = { ...todayAttendance[0] };
            
            if (formattedAttendance.clock_out) {
                const totalHours = parseFloat(formattedAttendance.total_hours) || 0;
                
                if (totalHours >= 8) {
                    formattedAttendance.status = 'present';
                } else if (totalHours >= 4 && totalHours < 8) {
                    formattedAttendance.status = 'half_day';
                } else if (totalHours > 0 && totalHours < 4) {
                    formattedAttendance.status = 'absent';
                }
            } else {
                // Currently working
                const clockIn = new Date(formattedAttendance.clock_in);
                const now = new Date();
                const currentHours = (now - clockIn) / (1000 * 60 * 60);
                formattedAttendance.current_hours = currentHours.toFixed(2);
            }
            
            // Calculate late display if applicable
            if (formattedAttendance.late_minutes > 0) {
                const lateSeconds = Math.round(formattedAttendance.late_minutes * 60);
                formattedAttendance.late_display = lateSeconds < 60 ? 
                    `${lateSeconds}s` : 
                    `${Math.floor(lateSeconds / 60)}m ${lateSeconds % 60}s`;
            }
        }

        res.json({
            success: true,
            attendance: formattedAttendance,
            active_session: activeSession[0] || null,
            has_previous_incomplete: hasPreviousIncomplete,
            message: hasPreviousIncomplete ? 
                `You have an incomplete attendance from ${formattedAttendance?.attendance_date}. Please clock out.` : 
                undefined
        });

    } catch (error) {
        console.error('❌ Error getting attendance:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get attendance',
            error: error.message
        });
    }
};

// Get attendance report for admin
// Get attendance report with leave data
exports.getAttendanceReport = async (req, res) => {
    try {
        const { start, end, employee_id } = req.query;
        
        // Get attendance records
        let attendanceQuery = `
            SELECT a.*, e.first_name, e.last_name, e.department, e.shift_timing
            FROM attendance a
            JOIN employees e ON a.employee_id = e.employee_id
            WHERE a.attendance_date BETWEEN ? AND ?
        `;
        let params = [start, end];

        if (employee_id) {
            attendanceQuery += ' AND a.employee_id = ?';
            params.push(employee_id);
        }

        attendanceQuery += ' ORDER BY a.attendance_date DESC, e.first_name';

        const [attendance] = await db.query(attendanceQuery, params);

        // Get leave records for the same period
        let leaveQuery = `
            SELECT l.*, e.first_name, e.last_name, e.department
            FROM leaves l
            JOIN employees e ON l.employee_id = e.employee_id
            WHERE l.status = 'approved'
            AND (
                (l.start_date BETWEEN ? AND ?) OR
                (l.end_date BETWEEN ? AND ?) OR
                (l.start_date <= ? AND l.end_date >= ?)
            )
        `;
        let leaveParams = [start, end, start, end, start, end];

        if (employee_id) {
            leaveQuery += ' AND l.employee_id = ?';
            leaveParams.push(employee_id);
        }

        const [leaves] = await db.query(leaveQuery, leaveParams);

        // Combine attendance and leave data
        const combinedData = [];
        const employeeMap = {};

        // Process attendance records
        attendance.forEach(record => {
            const key = `${record.employee_id}-${record.attendance_date}`;
            employeeMap[key] = {
                type: 'attendance',
                ...record
            };
        });

        // Process leave records and mark those days
        leaves.forEach(leave => {
            const startDate = new Date(leave.start_date);
            const endDate = new Date(leave.end_date);
            
            // For each day in the leave period
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const key = `${leave.employee_id}-${dateStr}`;
                
                // If there's an attendance record for this day, update its status
                if (employeeMap[key]) {
                    employeeMap[key].type = 'leave';
                    employeeMap[key].leave_type = leave.leave_type;
                    employeeMap[key].leave_reason = leave.reason;
                    employeeMap[key].status = 'on_leave';
                } else {
                    // Create a new record for this leave day
                    employeeMap[key] = {
                        type: 'leave',
                        employee_id: leave.employee_id,
                        first_name: leave.first_name,
                        last_name: leave.last_name,
                        department: leave.department,
                        attendance_date: dateStr,
                        leave_type: leave.leave_type,
                        leave_reason: leave.reason,
                        status: 'on_leave',
                        clock_in: null,
                        clock_out: null,
                        total_hours: 0
                    };
                }
            }
        });

        // Convert map to array
        Object.values(employeeMap).forEach(record => {
            combinedData.push(record);
        });

        // Calculate statistics
        const stats = {
            total: combinedData.length,
            present: combinedData.filter(a => a.status === 'present').length,
            half_day: combinedData.filter(a => a.status === 'half_day').length,
            absent: combinedData.filter(a => a.status === 'absent').length,
            on_leave: combinedData.filter(a => a.status === 'on_leave').length,
            late: combinedData.filter(a => parseFloat(a.late_minutes) > 0).length,
            early: combinedData.filter(a => parseFloat(a.early_minutes) > 0).length
        };

        // Add formatted display to each record
        const combinedWithDetails = combinedData.map(record => {
            const recordWithDetails = { ...record };
            
            if (record.late_minutes > 0) {
                const totalSeconds = Math.round(record.late_minutes * 60);
                if (totalSeconds < 60) {
                    recordWithDetails.late_text = `${totalSeconds}s`;
                } else {
                    const mins = Math.floor(totalSeconds / 60);
                    const secs = totalSeconds % 60;
                    recordWithDetails.late_text = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
                }
            }
            
            if (record.early_minutes > 0) {
                const totalSeconds = Math.round(record.early_minutes * 60);
                if (totalSeconds < 60) {
                    recordWithDetails.early_text = `${totalSeconds}s`;
                } else {
                    const mins = Math.floor(totalSeconds / 60);
                    const secs = totalSeconds % 60;
                    recordWithDetails.early_text = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
                }
            }
            
            return recordWithDetails;
        });

        res.json({
            success: true,
            stats,
            attendance: combinedWithDetails
        });

    } catch (error) {
        console.error('Error in getAttendanceReport:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get attendance report',
            error: error.message 
        });
    }
};

// Heartbeat
exports.heartbeat = async (req, res) => {
    try {
        const { employee_id, session_id, latitude, longitude } = req.body;

        await db.query(
            `UPDATE attendance_sessions 
             SET last_heartbeat = NOW(), 
                 latitude = COALESCE(?, latitude),
                 longitude = COALESCE(?, longitude)
             WHERE employee_id = ? AND session_id = ? AND is_active = true`,
            [latitude, longitude, employee_id, session_id]
        );

        res.json({ success: true, timestamp: new Date() });

    } catch (error) {
        console.error('Heartbeat error:', error);
        res.status(500).json({ success: false, message: 'Heartbeat failed' });
    }
};

// Check active sessions (for monitoring only, no auto clock-out)
exports.checkActiveSessions = async () => {
    try {
        // This function now only monitors, doesn't auto clock-out
        const [activeSessions] = await db.query(
            `SELECT COUNT(*) as count FROM attendance_sessions 
             WHERE is_active = true`
        );

        console.log(`📊 Active sessions: ${activeSessions[0].count}`);
        
        // Optional: Send alerts for sessions inactive for too long
        const timeoutMinutes = 60; // Alert after 60 minutes of no heartbeat
        const [inactiveSessions] = await db.query(
            `SELECT * FROM attendance_sessions 
             WHERE is_active = true 
             AND last_heartbeat < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
            [timeoutMinutes]
        );

        for (const session of inactiveSessions) {
            console.log(`⚠️ Session ${session.session_id} for employee ${session.employee_id} has been inactive for ${timeoutMinutes}+ minutes`);
            
            // You could send a notification to admin here
            // But DO NOT auto clock-out
        }

        return { 
            success: true, 
            active: activeSessions[0].count,
            inactive: inactiveSessions.length 
        };

    } catch (error) {
        console.error('Error checking active sessions:', error);
        return { success: false, error: error.message };
    }
};

// Mark absent for employees who didn't punch in at end of day
exports.markAbsentAtDayEnd = async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        
        console.log('📝 Running end-of-day absent marking for:', today);

        // Get all employees
        const [employees] = await db.query('SELECT employee_id FROM employees');
        let markedCount = 0;
        let updatedCount = 0;

        for (const emp of employees) {
            // Check if employee has attendance record for today
            const [attendance] = await db.query(
                'SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = ?',
                [emp.employee_id, today]
            );

            // If no record exists, create absent record
            if (attendance.length === 0) {
                await db.query(
                    `INSERT INTO attendance 
                     (employee_id, attendance_date, status) 
                     VALUES (?, ?, 'absent')`,
                    [emp.employee_id, today]
                );
                markedCount++;
                console.log(`✅ Marked absent for employee ${emp.employee_id}`);
            } 
            // If record exists but has clock_in and no clock_out, mark as half_day (they forgot to clock out)
            else if (attendance[0].clock_in && !attendance[0].clock_out) {
                await db.query(
                    `UPDATE attendance 
                     SET status = 'half_day',
                         total_hours = TIMESTAMPDIFF(HOUR, clock_in, NOW())
                     WHERE employee_id = ? AND attendance_date = ?`,
                    [emp.employee_id, today]
                );
                updatedCount++;
                console.log(`⚠️ Auto-marked half_day for employee ${emp.employee_id} (forgot to clock out)`);
            }
        }

        console.log(`✅ End-of-day absent marking completed. Marked ${markedCount} absent, updated ${updatedCount} half_day.`);
        return { success: true, message: `Marked ${markedCount} absent, ${updatedCount} half_day` };

    } catch (error) {
        console.error('Error marking absent:', error);
        return { success: false, error: error.message };
    }
};



