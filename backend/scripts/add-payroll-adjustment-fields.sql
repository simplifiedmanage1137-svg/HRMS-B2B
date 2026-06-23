-- ============================================================
-- Payroll Adjustment Fields Migration
-- Run once in Supabase SQL Editor
-- ============================================================

ALTER TABLE salary_slips
  ADD COLUMN IF NOT EXISTS salary_earned        NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS earned_difference    NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS adj_overtime_amount  NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adj_overtime_hours   NUMERIC(8,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adj_deduction_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_payable_salary NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS shift_hours          NUMERIC(4,2)  DEFAULT 8;

-- Optional: add index for bulk payroll queries
CREATE INDEX IF NOT EXISTS idx_salary_slips_month_year
  ON salary_slips (month, year);
