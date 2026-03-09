const db = require('../config/database');

// Check if IP is whitelisted (office IP)
const isOfficeIP = async (ip) => {
    try {
        // Remove IPv6 prefix if present
        const cleanIP = ip.replace('::ffff:', '');
        
        const [result] = await db.query(
            'SELECT * FROM ip_whitelist WHERE ip_address = ? AND is_active = true',
            [cleanIP]
        );
        
        return result.length > 0;
    } catch (error) {
        console.error('IP check error:', error);
        return false;
    }
};

// Middleware to check attendance eligibility
const checkAttendanceEligibility = async (req, res, next) => {
    try {
        // Get client IP
        const clientIP = req.headers['x-forwarded-for'] || 
                        req.socket.remoteAddress || 
                        req.connection.remoteAddress;
        
        const cleanIP = clientIP.replace('::ffff:', '');
        
        // Check if from office IP
        const isOffice = await isOfficeIP(cleanIP);
        
        // Attach to request for later use
        req.clientIP = cleanIP;
        req.canMarkAttendance = isOffice;
        
        console.log(`Client IP: ${cleanIP}, Can mark attendance: ${isOffice}`);
        
        next();
    } catch (error) {
        console.error('Middleware error:', error);
        next();
    }
};

module.exports = {
    isOfficeIP,
    checkAttendanceEligibility
};