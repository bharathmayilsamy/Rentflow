-- ============================================
-- RentFlow - CLEAN SETUP
-- This drops old tables and recreates everything
-- Go to: SQL Editor → New Query → Paste → Run
-- ============================================

-- Drop old tables if they exist (order matters for foreign keys)
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;
DROP TABLE IF EXISTS passbook CASCADE;
DROP TABLE IF EXISTS tenant_bills CASCADE;
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS maintenance_requests CASCADE;
DROP TABLE IF EXISTS rent_payments CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS properties CASCADE;

-- ============================================
-- CREATE ALL TABLES
-- ============================================

CREATE TABLE properties (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  address TEXT,
  total_rooms INTEGER DEFAULT 0,
  occupied_rooms INTEGER DEFAULT 0,
  monthly_rent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  property_id TEXT,
  room TEXT,
  rent NUMERIC DEFAULT 0,
  deposit NUMERIC DEFAULT 0,
  lease_start TEXT,
  lease_end TEXT,
  id_proof TEXT,
  emergency_contact TEXT,
  notes TEXT,
  status TEXT DEFAULT 'Active',
  avatar_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rent_payments (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id TEXT,
  tenant_name TEXT,
  property_id TEXT,
  room TEXT,
  amount NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  method TEXT,
  status TEXT DEFAULT 'Pending',
  date TEXT,
  due_date TEXT,
  receipt_no TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE maintenance_requests (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id TEXT,
  tenant_name TEXT,
  property_id TEXT,
  property_name TEXT,
  room TEXT,
  category TEXT,
  priority TEXT,
  status TEXT DEFAULT 'Open',
  description TEXT,
  repair_cost NUMERIC DEFAULT 0,
  created_date TEXT,
  resolved_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id TEXT,
  property_name TEXT,
  category TEXT,
  amount NUMERIC DEFAULT 0,
  date TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id TEXT,
  tenant_name TEXT,
  type TEXT,
  channel TEXT,
  message TEXT,
  scheduled_date TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenant_bills (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id TEXT,
  type TEXT,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  due_date TEXT,
  paid_date TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE passbook (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  date TEXT,
  type TEXT,
  category TEXT,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  reference TEXT,
  property_id TEXT,
  property_name TEXT,
  tenant_id TEXT,
  tenant_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE app_users (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'Staff',
  avatar TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at_date TEXT,
  last_login TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  late_fee_enabled BOOLEAN DEFAULT true,
  grace_period INTEGER DEFAULT 5,
  late_fee_type TEXT DEFAULT 'Fixed',
  late_fee_amount NUMERIC DEFAULT 500,
  max_cap NUMERIC DEFAULT 2000,
  notify_whatsapp BOOLEAN DEFAULT true,
  notify_sms BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT true,
  notify_inapp BOOLEAN DEFAULT true,
  profile_name TEXT,
  profile_email TEXT,
  profile_phone TEXT,
  currency TEXT DEFAULT 'INR',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  rent_due_day INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE passbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES (each user sees only their data)
-- ============================================

CREATE POLICY "properties_all" ON properties FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tenants_all" ON tenants FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payments_all" ON rent_payments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "maintenance_all" ON maintenance_requests FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_all" ON expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reminders_all" ON reminders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bills_all" ON tenant_bills FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "passbook_all" ON passbook FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "appusers_all" ON app_users FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings_all" ON app_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- DONE! You should see "Success. No rows returned"
-- ============================================
