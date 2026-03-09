const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
};

// Run this once to generate hashed passwords for your users
const generateHashes = async () => {
    const adminHash = await hashPassword('admin123');
    const employeeHash = await hashPassword('employee123');
    
    console.log('Admin password hash:', adminHash);
    console.log('Employee password hash:', employeeHash);
};

// Uncomment to run
// generateHashes();

module.exports = hashPassword;