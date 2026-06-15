-- Run this in Supabase SQL Editor to add the new columns
-- Only needed if tables already exist

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS due_day INTEGER DEFAULT 1;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS custom_bill_types TEXT[] DEFAULT ARRAY['Electricity','Water','Tax','Internet','Gas','Maintenance','Other'];

-- You can also drop the passbook table since it's now auto-generated:
-- DROP TABLE IF EXISTS passbook CASCADE;
