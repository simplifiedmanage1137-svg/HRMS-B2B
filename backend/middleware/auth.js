// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = {
    verifyToken: (req, res, next) => {
        // Check header first
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(403).json({ message: 'No token provided' });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            req.userId = decoded.id;
            req.userRole = decoded.role;
            req.employeeId = decoded.employeeId;
            next();
        });
    },

    isAdmin: (req, res, next) => {
        if (req.userRole !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        next();
    }
};

// middleware/auth.js
verifyToken: (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.employeeId = decoded.employeeId; // ✅ Ye set hona chahiye
    next();
  });
}