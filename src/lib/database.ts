import { supabase } from './supabase';
import {
  Property, Tenant, RentPayment, MaintenanceRequest,
  Expense, Reminder, TenantBill, PassbookEntry, User, Settings, AccountRequest
} from '../types';

// ============================================
// Helper: get current user id
// ============================================
const getUserId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
};

// ============================================
// PROPERTIES
// ============================================
export const db_loadProperties = async (): Promise<Property[] | null> => {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error('Load properties error:', error); return null; }
  return data?.map((r: any) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    address: r.address,
    totalRooms: r.total_rooms,
    occupiedRooms: r.occupied_rooms,
    monthlyRent: r.monthly_rent,
  })) || null;
};

export const db_saveProperties = async (properties: Property[]) => {
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('properties').delete().eq('user_id', userId);
  if (properties.length === 0) return;

  const rows = properties.map(p => ({
    id: p.id,
    user_id: userId,
    name: p.name,
    type: p.type,
    address: p.address,
    total_rooms: p.totalRooms,
    occupied_rooms: p.occupiedRooms,
    monthly_rent: p.monthlyRent,
  }));

  const { error } = await supabase.from('properties').upsert(rows);
  if (error) console.error('Save properties error:', error);
};

// ============================================
// TENANTS
// ============================================
export const db_loadTenants = async (): Promise<Tenant[] | null> => {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error('Load tenants error:', error); return null; }
  return data?.map((r: any) => ({
    id: r.id,
    name: r.name,
    email: r.email || '',
    phone: r.phone || '',
    propertyId: r.property_id || '',
    room: r.room || '',
    rent: r.rent || 0,
    deposit: r.deposit || 0,
    leaseStart: r.lease_start || '',
    leaseEnd: r.lease_end || '',
    idProof: r.id_proof || '',
    emergencyContact: r.emergency_contact || '',
    notes: r.notes || '',
    status: r.status || 'Active',
    avatarColor: r.avatar_color || '#6366f1',
  })) || null;
};

export const db_saveTenants = async (tenants: Tenant[]) => {
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('tenants').delete().eq('user_id', userId);
  if (tenants.length === 0) return;

  const rows = tenants.map(t => ({
    id: t.id,
    user_id: userId,
    name: t.name,
    email: t.email,
    phone: t.phone,
    property_id: t.propertyId,
    room: t.room,
    rent: t.rent,
    deposit: t.deposit,
    lease_start: t.leaseStart,
    lease_end: t.leaseEnd,
    id_proof: t.idProof,
    emergency_contact: t.emergencyContact,
    notes: t.notes,
    status: t.status,
    avatar_color: t.avatarColor,
  }));

  const { error } = await supabase.from('tenants').upsert(rows);
  if (error) console.error('Save tenants error:', error);
};

// ============================================
// RENT PAYMENTS
// ============================================
export const db_loadPayments = async (): Promise<RentPayment[] | null> => {
  const { data, error } = await supabase
    .from('rent_payments')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error('Load payments error:', error); return null; }
  return data?.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id || '',
    tenantName: r.tenant_name || '',
    propertyId: r.property_id || '',
    room: r.room || '',
    amount: r.amount || 0,
    dueAmount: r.due_amount || 0,
    method: r.method || 'UPI',
    status: r.status || 'Pending',
    date: r.date || '',
    dueDate: r.due_date || '',
    receiptNo: r.receipt_no || '',
  })) || null;
};

export const db_savePayments = async (payments: RentPayment[]) => {
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('rent_payments').delete().eq('user_id', userId);
  if (payments.length === 0) return;

  const rows = payments.map(p => ({
    id: p.id,
    user_id: userId,
    tenant_id: p.tenantId,
    tenant_name: p.tenantName,
    property_id: p.propertyId,
    room: p.room,
    amount: p.amount,
    due_amount: p.dueAmount,
    method: p.method,
    status: p.status,
    date: p.date,
    due_date: p.dueDate,
    receipt_no: p.receiptNo,
  }));

  const { error } = await supabase.from('rent_payments').upsert(rows);
  if (error) console.error('Save payments error:', error);
};

// ============================================
// MAINTENANCE
// ============================================
export const db_loadMaintenance = async (): Promise<MaintenanceRequest[] | null> => {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error('Load maintenance error:', error); return null; }
  return data?.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id || '',
    tenantName: r.tenant_name || '',
    propertyId: r.property_id || '',
    propertyName: r.property_name || '',
    room: r.room || '',
    category: r.category || 'General',
    priority: r.priority || 'Medium',
    status: r.status || 'Open',
    description: r.description || '',
    repairCost: r.repair_cost || 0,
    createdDate: r.created_date || '',
    resolvedDate: r.resolved_date || undefined,
  })) || null;
};

export const db_saveMaintenance = async (items: MaintenanceRequest[]) => {
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('maintenance_requests').delete().eq('user_id', userId);
  if (items.length === 0) return;

  const rows = items.map(m => ({
    id: m.id,
    user_id: userId,
    tenant_id: m.tenantId,
    tenant_name: m.tenantName,
    property_id: m.propertyId,
    property_name: m.propertyName,
    room: m.room,
    category: m.category,
    priority: m.priority,
    status: m.status,
    description: m.description,
    repair_cost: m.repairCost,
    created_date: m.createdDate,
    resolved_date: m.resolvedDate || null,
  }));

  const { error } = await supabase.from('maintenance_requests').upsert(rows);
  if (error) console.error('Save maintenance error:', error);
};

// ============================================
// EXPENSES
// ============================================
export const db_loadExpenses = async (): Promise<Expense[] | null> => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error('Load expenses error:', error); return null; }
  return data?.map((r: any) => ({
    id: r.id,
    propertyId: r.property_id || '',
    propertyName: r.property_name || '',
    category: r.category || '',
    amount: r.amount || 0,
    date: r.date || '',
    description: r.description || '',
  })) || null;
};

export const db_saveExpenses = async (items: Expense[]) => {
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('expenses').delete().eq('user_id', userId);
  if (items.length === 0) return;

  const rows = items.map(e => ({
    id: e.id,
    user_id: userId,
    property_id: e.propertyId,
    property_name: e.propertyName,
    category: e.category,
    amount: e.amount,
    date: e.date,
    description: e.description,
  }));

  const { error } = await supabase.from('expenses').upsert(rows);
  if (error) console.error('Save expenses error:', error);
};

// ============================================
// REMINDERS
// ============================================
export const db_loadReminders = async (): Promise<Reminder[] | null> => {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error('Load reminders error:', error); return null; }
  return data?.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id || '',
    tenantName: r.tenant_name || '',
    type: r.type || 'Custom',
    channel: r.channel || 'In-App',
    message: r.message || '',
    scheduledDate: r.scheduled_date || '',
    status: r.status || 'Pending',
  })) || null;
};

export const db_saveReminders = async (items: Reminder[]) => {
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('reminders').delete().eq('user_id', userId);
  if (items.length === 0) return;

  const rows = items.map(r => ({
    id: r.id,
    user_id: userId,
    tenant_id: r.tenantId,
    tenant_name: r.tenantName,
    type: r.type,
    channel: r.channel,
    message: r.message,
    scheduled_date: r.scheduledDate,
    status: r.status,
  }));

  const { error } = await supabase.from('reminders').upsert(rows);
  if (error) console.error('Save reminders error:', error);
};

// ============================================
// TENANT BILLS
// ============================================
export const db_loadBills = async (): Promise<TenantBill[] | null> => {
  const { data, error } = await supabase
    .from('tenant_bills')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error('Load bills error:', error); return null; }
  return data?.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id || '',
    type: r.type || 'Other',
    description: r.description || '',
    amount: r.amount || 0,
    dueDate: r.due_date || '',
    paidDate: r.paid_date || undefined,
    status: r.status || 'Pending',
  })) || null;
};

export const db_saveBills = async (items: TenantBill[]) => {
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('tenant_bills').delete().eq('user_id', userId);
  if (items.length === 0) return;

  const rows = items.map(b => ({
    id: b.id,
    user_id: userId,
    tenant_id: b.tenantId,
    type: b.type,
    description: b.description,
    amount: b.amount,
    due_date: b.dueDate,
    paid_date: b.paidDate || null,
    status: b.status,
  }));

  const { error } = await supabase.from('tenant_bills').upsert(rows);
  if (error) console.error('Save bills error:', error);
};

// ============================================
// PASSBOOK
// ============================================
export const db_loadPassbook = async (): Promise<PassbookEntry[] | null> => {
  const { data, error } = await supabase
    .from('passbook')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error('Load passbook error:', error); return null; }
  return data?.map((r: any) => ({
    id: r.id,
    date: r.date || '',
    type: r.type || 'Income',
    category: r.category || 'Other',
    description: r.description || '',
    amount: r.amount || 0,
    balance: r.balance || 0,
    reference: r.reference || undefined,
    propertyId: r.property_id || undefined,
    propertyName: r.property_name || undefined,
    tenantId: r.tenant_id || undefined,
    tenantName: r.tenant_name || undefined,
  })) || null;
};

export const db_savePassbook = async (items: PassbookEntry[]) => {
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('passbook').delete().eq('user_id', userId);
  if (items.length === 0) return;

  const rows = items.map(p => ({
    id: p.id,
    user_id: userId,
    date: p.date,
    type: p.type,
    category: p.category,
    description: p.description,
    amount: p.amount,
    balance: p.balance,
    reference: p.reference || null,
    property_id: p.propertyId || null,
    property_name: p.propertyName || null,
    tenant_id: p.tenantId || null,
    tenant_name: p.tenantName || null,
  }));

  const { error } = await supabase.from('passbook').upsert(rows);
  if (error) console.error('Save passbook error:', error);
};

// ============================================
// APP USERS
// ============================================
export const db_loadUsers = async (): Promise<User[] | null> => {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error('Load users error:', error); return null; }
  return data?.map((r: any) => ({
    id: r.id,
    name: r.name || '',
    email: r.email || '',
    phone: r.phone || '',
    role: r.role || 'Staff',
    avatar: r.avatar || '#6366f1',
    isActive: r.is_active !== false,
    createdAt: r.created_at_date || '',
    lastLogin: r.last_login || undefined,
  })) || null;
};

export const db_saveUsers = async (items: User[]) => {
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('app_users').delete().eq('user_id', userId);
  if (items.length === 0) return;

  const rows = items.map(u => ({
    id: u.id,
    user_id: userId,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    avatar: u.avatar,
    is_active: u.isActive,
    created_at_date: u.createdAt,
    last_login: u.lastLogin || null,
  }));

  const { error } = await supabase.from('app_users').upsert(rows);
  if (error) console.error('Save users error:', error);
};

// ============================================
// SETTINGS
// ============================================
export const db_loadSettings = async (): Promise<Settings | null> => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .single();
  if (error || !data) return null;
  return {
    lateFeeEnabled: data.late_fee_enabled !== false,
    gracePeriod: data.grace_period || 5,
    lateFeeType: data.late_fee_type || 'Fixed',
    lateFeeAmount: data.late_fee_amount || 500,
    maxCap: data.max_cap || 2000,
    notifyWhatsApp: data.notify_whatsapp !== false,
    notifySMS: data.notify_sms !== false,
    notifyEmail: data.notify_email !== false,
    notifyInApp: data.notify_inapp !== false,
    profileName: data.profile_name || '',
    profileEmail: data.profile_email || '',
    profilePhone: data.profile_phone || '',
    currency: data.currency || 'INR',
    dateFormat: data.date_format || 'DD/MM/YYYY',
    rentDueDay: data.rent_due_day || 1,
  };
};

export const db_saveSettings = async (s: Settings) => {
  const userId = await getUserId();
  if (!userId) return;

  const row = {
    user_id: userId,
    late_fee_enabled: s.lateFeeEnabled,
    grace_period: s.gracePeriod,
    late_fee_type: s.lateFeeType,
    late_fee_amount: s.lateFeeAmount,
    max_cap: s.maxCap,
    notify_whatsapp: s.notifyWhatsApp,
    notify_sms: s.notifySMS,
    notify_email: s.notifyEmail,
    notify_inapp: s.notifyInApp,
    profile_name: s.profileName,
    profile_email: s.profileEmail,
    profile_phone: s.profilePhone,
    currency: s.currency,
    date_format: s.dateFormat,
    rent_due_day: s.rentDueDay,
  };

  const { error } = await supabase
    .from('app_settings')
    .upsert(row, { onConflict: 'user_id' });
  if (error) console.error('Save settings error:', error);
};

// ============================================
// SIGNUP REQUESTS (account approval)
// ============================================
export const db_loadSignupRequests = async (): Promise<AccountRequest[] | null> => {
  const { data, error } = await supabase
    .from('signup_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('Load signup requests error:', error); return null; }
  return data?.map((r: any) => ({
    id: r.id,
    email: r.email || '',
    name: r.name || '',
    status: r.status || 'Pending',
    createdAt: r.created_at?.split('T')[0] || r.created_at_date || '',
  })) || null;
};

export const db_createSignupRequest = async (email: string, name: string, authUserId: string) => {
  const { error } = await supabase.from('signup_requests').upsert({
    id: authUserId,
    email: email.toLowerCase(),
    name,
    status: 'Pending',
    created_at_date: new Date().toISOString().split('T')[0],
  }, { onConflict: 'email' });
  if (error) console.error('Create signup request error:', error);
  return { error };
};

export const db_updateSignupRequest = async (id: string, status: 'Approved' | 'Rejected') => {
  const { error } = await supabase
    .from('signup_requests')
    .update({ status })
    .eq('id', id);
  if (error) console.error('Update signup request error:', error);
  return { error };
};

// ============================================
// LOAD ALL DATA AT ONCE
// ============================================
export const db_loadAllData = async () => {
  const [
    properties,
    tenants,
    payments,
    maintenance,
    expenses,
    reminders,
    bills,
    passbook,
    users,
    settings,
    signupRequests,
  ] = await Promise.all([
    db_loadProperties(),
    db_loadTenants(),
    db_loadPayments(),
    db_loadMaintenance(),
    db_loadExpenses(),
    db_loadReminders(),
    db_loadBills(),
    db_loadPassbook(),
    db_loadUsers(),
    db_loadSettings(),
    db_loadSignupRequests(),
  ]);

  return { properties, tenants, payments, maintenance, expenses, reminders, bills, passbook, users, settings, signupRequests };
};
