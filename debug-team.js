// Run: node backend/debug-team.js
require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function debugTeam() {
    console.log('\n=== MANAGER (B2B250201) ===');
    const { data: manager } = await supabase
        .from('employees')
        .select('employee_id, first_name, last_name, designation')
        .eq('employee_id', 'B2B250201')
        .single();
    console.log(manager);
    const managerName = manager ? `${manager.first_name} ${manager.last_name}` : '';
    console.log('Manager full name:', JSON.stringify(managerName));

    console.log('\n=== EMPLOYEES (B2B260201, B2B260402) ===');
    const { data: emps } = await supabase
        .from('employees')
        .select('employee_id, first_name, last_name, reporting_manager')
        .in('employee_id', ['B2B260201', 'B2B260402']);
    emps?.forEach(e => {
        console.log(`${e.employee_id}: reporting_manager = ${JSON.stringify(e.reporting_manager)}`);
        console.log(`  Match: ${e.reporting_manager === managerName} | ilike would match: ${e.reporting_manager?.toLowerCase().trim() === managerName.toLowerCase().trim()}`);
    });
}

debugTeam().catch(console.error);
