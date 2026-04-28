-- ============================================================
-- FIX 1: attendance_status_check constraint
-- ============================================================
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT conname FROM pg_constraint 
             WHERE conrelid = 'attendance'::regclass AND contype = 'c'
    LOOP
        EXECUTE 'ALTER TABLE attendance DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE attendance ADD CONSTRAINT attendance_status_check
CHECK (status IN ('present', 'absent', 'half_day', 'working', 'on_leave'));

-- ============================================================
-- FIX 2: salary_slips missing columns
-- ============================================================
ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS cycle_start_date DATE;
ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS cycle_end_date DATE;
ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS total_working_days INTEGER;
ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS unpaid_leave_days INTEGER DEFAULT 0;
ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS per_day_salary NUMERIC(10,2);
ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS unpaid_deduction NUMERIC(10,2) DEFAULT 0;
ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(10,2);
ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(10,2) DEFAULT 0;
ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS overtime_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;

-- Verify
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'attendance'::regclass AND contype = 'c';
