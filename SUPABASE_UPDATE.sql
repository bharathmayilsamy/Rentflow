-- Run in Supabase SQL Editor
-- Adds new columns for lock feature and utility numbers

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS eb_consumer_no TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS water_bill_no TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS property_tax_no TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS due_day INTEGER DEFAULT 1;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS custom_bill_types TEXT[] DEFAULT ARRAY['Electricity','Water','Tax','Internet','Gas','Maintenance','Other'];
