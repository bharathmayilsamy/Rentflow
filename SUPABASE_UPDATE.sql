-- Run this in Supabase SQL Editor to add the new columns
-- Go to: https://supabase.com/dashboard/project/jjhamludettoemzbfqoo/sql/new

-- Add utility account numbers to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS eb_consumer_no TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS water_bill_no TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS property_tax_no TEXT DEFAULT '';

-- NOTE: The Passbook table shows 0 rows because passbook is now
-- AUTO-GENERATED from rent_payments + tenant_bills + expenses.
-- It does NOT write to the passbook table anymore.
-- The passbook table in Supabase is unused — that's correct!
-- All passbook data comes from these 3 tables:
--   rent_payments  → Income entries (when status = 'Paid')
--   tenant_bills   → Income entries (when status = 'Paid')  
--   expenses       → Expense entries
