/**
 * Script: Update attendance for Kanchan Yadav — March 2026 salary cycle
 * Cycle  : 26-Feb-2026 to 25-Mar-2026
 * Run    : node scripts/update-kanchan-attendance-mar2026.js
 *
 * DB status constraint allows: present | absent | half_day | working
 * WO and Holiday are stored as status='absent' with is_holiday=true
 */

require('dotenv').config();
const supabase = require('../config/supabase');

// ── Raw attendance sheet data (date → type) ───────────────────────────────────
const SHEET = {
  '2026-02-26': 'P',
  '2026-02-27': 'Absent',
  '2026-02-28': 'WO',
  '2026-03-01': 'WO',
  '2026-03-02': 'Absent',
  '2026-03-03': 'Holiday',
  '2026-03-04': 'Absent',
  '2026-03-05': 'P',
  '2026-03-06': 'P',
  '2026-03-07': 'WO',
  '2026-03-08': 'WO',
  '2026-03-09': 'P',
  '2026-03-10': 'P',
  '2026-03-11': 'P',
  '2026-03-12': 'P',
  '2026-03-13': 'P',
  '2026-03-14': 'WO',
  '2026-03-15': 'WO',
  '2026-03-16': 'P',
  '2026-03-17': 'P',
  '2026-03-18': 'P',
  '2026-03-19': 'P',
  '2026-03-20': 'P',
  '2026-03-21': 'WO',
  '2026-03-22': 'WO',
  '2026-03-23': 'P',
  '2026-03-24': 'P',
  '2026-03-25': 'P',
};

// Map sheet code → DB fields
function mapCode(code) {
  switch (code) {
    case 'P':
      return { status: 'present', is_holiday: false, holiday_name: null, total_hours: 9, total_minutes: 540 };
    case 'Absent':
      return { status: 'absent', is_holiday: false, holiday_name: null, total_hours: 0, total_minutes: 0 };
    case 'WO':
      return { status: 'absent', is_holiday: true, holiday_name: 'Week Off', total_hours: 0, total_minutes: 0 };
    case 'Holiday':
      return { status: 'absent', is_holiday: true, holiday_name: 'Holiday', total_hours: 0, total_minutes: 0 };
    default:
      return null;
  }
}

async function run() {
  console.log('🚀 Starting attendance update for Kanchan Yadav — March 2026 cycle\n');

  // 1. Find employee
  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('employee_id, first_name, last_name, joining_date')
    .ilike('first_name', 'kanchan')
    .ilike('last_name', 'yadav')
    .maybeSingle();

  if (empErr || !emp) {
    console.error('❌ Employee "Kanchan Yadav" not found.', empErr?.message || '');
    process.exit(1);
  }

  const { employee_id, first_name, last_name, joining_date } = emp;
  console.log(`✅ Found: ${first_name} ${last_name} (${employee_id})  |  DOJ: ${joining_date}\n`);

  const dates = Object.keys(SHEET).sort();
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  // 2. Fetch existing records for the cycle range
  const { data: existing, error: fetchErr } = await supabase
    .from('attendance')
    .select('id, attendance_date, status, is_holiday, holiday_name')
    .eq('employee_id', employee_id)
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate);

  if (fetchErr) {
    console.error('❌ Error fetching existing records:', fetchErr.message);
    process.exit(1);
  }

  const existingMap = {};
  (existing || []).forEach(r => { existingMap[r.attendance_date] = r; });

  // 3. Build insert / update lists
  const toInsert = [];
  const toUpdate = [];

  for (const [date, code] of Object.entries(SHEET)) {
    const mapped = mapCode(code);
    if (!mapped) continue;

    const payload = { employee_id, attendance_date: date, ...mapped };

    if (existingMap[date]) {
      toUpdate.push({ id: existingMap[date].id, prevStatus: existingMap[date].status, sheetCode: code, ...payload });
    } else {
      toInsert.push({ sheetCode: code, ...payload });
    }
  }

  let inserted = 0, updated = 0, failed = 0;
  const insertedRows = [], updatedRows = [], failedRows = [];

  // 4. Inserts — strip extra fields before sending to DB
  const dbInserts = toInsert.map(({ sheetCode, ...rest }) => rest);
  if (dbInserts.length > 0) {
    const { error: insErr } = await supabase.from('attendance').insert(dbInserts);
    if (insErr) {
      failed += dbInserts.length;
      toInsert.forEach(r => failedRows.push({ date: r.attendance_date, code: r.sheetCode, error: insErr.message }));
    } else {
      inserted = dbInserts.length;
      toInsert.forEach(r => insertedRows.push({ date: r.attendance_date, code: r.sheetCode, status: r.status, holiday_name: r.holiday_name }));
    }
  }

  // 5. Updates
  for (const r of toUpdate) {
    const { id, prevStatus, sheetCode, ...payload } = r;
    const { error: updErr } = await supabase.from('attendance').update(payload).eq('id', id);
    if (updErr) {
      failed++;
      failedRows.push({ date: r.attendance_date, code: sheetCode, error: updErr.message });
    } else {
      updated++;
      updatedRows.push({ date: r.attendance_date, code: sheetCode, status: r.status, holiday_name: r.holiday_name, prevStatus });
    }
  }

  // 6. Summary
  console.log('═'.repeat(65));
  console.log(`📊 SUMMARY — ${first_name} ${last_name} (${employee_id})`);
  console.log(`   Cycle   : ${startDate}  →  ${endDate}`);
  console.log(`   Total   : ${Object.keys(SHEET).length} days`);
  console.log(`   ✅ Inserted : ${inserted}`);
  console.log(`   🔄 Updated  : ${updated}`);
  console.log(`   ❌ Failed   : ${failed}`);
  console.log('═'.repeat(65));

  if (insertedRows.length > 0) {
    console.log('\n➕ INSERTED RECORDS:');
    console.log('   Date          Sheet   DB Status    Holiday Name');
    console.log('   ─────────────────────────────────────────────────');
    insertedRows.forEach(r =>
      console.log(`   ${r.date}    ${String(r.code).padEnd(7)} ${String(r.status).padEnd(12)} ${r.holiday_name || '—'}`)
    );
  }

  if (updatedRows.length > 0) {
    console.log('\n✏️  UPDATED RECORDS:');
    console.log('   Date          Sheet   Old DB Status  →  New DB Status   Holiday Name');
    console.log('   ──────────────────────────────────────────────────────────────────────');
    updatedRows.forEach(r =>
      console.log(`   ${r.date}    ${String(r.code).padEnd(7)} ${String(r.prevStatus).padEnd(15)} →  ${String(r.status).padEnd(15)} ${r.holiday_name || '—'}`)
    );
  }

  if (failedRows.length > 0) {
    console.log('\n❌ FAILED RECORDS:');
    failedRows.forEach(r => console.log(`   ${r.date} [${r.code}] — ${r.error}`));
  }

  const counts = { P: 0, Absent: 0, WO: 0, Holiday: 0 };
  Object.values(SHEET).forEach(c => { if (counts[c] !== undefined) counts[c]++; });
  console.log('\n📅 ATTENDANCE BREAKDOWN:');
  console.log(`   Present (P)  : ${counts.P}`);
  console.log(`   Absent       : ${counts.Absent}`);
  console.log(`   Week Off     : ${counts.WO}`);
  console.log(`   Holiday      : ${counts.Holiday}`);
  console.log('\n✅ Done.\n');
}

run().catch(err => { console.error('❌ Unhandled error:', err); process.exit(1); });
