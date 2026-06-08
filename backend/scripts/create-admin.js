const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

const createAdmin = async () => {
    const email = 'newadmin@123.com';
    const password = 'newAdmin@123';
    const role = 'admin';

    // Check if already exists
    const { data: existing } = await supabase
        .from('employees')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();

    if (existing) {
        console.log('⚠️  Admin with this email already exists:', email);
        process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
        .from('employees')
        .insert([{
            email: email,
            password: hashedPassword,
            role: role,
            first_name: 'New',
            last_name: 'Admin',
            employee_id: 'ADMIN-NEW-01',
            joining_date: new Date().toISOString().split('T')[0]
        }])
        .select();

    if (error) {
        console.error('❌ Failed to create admin:', error.message);
        process.exit(1);
    }

    console.log('✅ Admin created successfully!');
    console.log('   Email:', email);
    console.log('   Role:', role);
    process.exit(0);
};

createAdmin().catch(err => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
});
