export type PropertyType = 'Apartment' | 'PG' | 'Hostel' | 'House' | 'Commercial';

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  address: string;
  totalRooms: number;
  occupiedRooms: number;
  monthlyRent: number;
  image?: string;
}

export type TenantStatus = 'Active' | 'Inactive' | 'Notice';

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyId: string;
  room: string;
  rent: number;
  deposit: number;
  leaseStart: string;
  leaseEnd: string;
  idProof: string;
  emergencyContact: string;
  notes: string;
  status: TenantStatus;
  avatarColor: string;
  dueDay: number;
  ebConsumerNo: string;
  waterBillNo: string;
  propertyTaxNo: string;
}

export type PaymentMethod = 'UPI' | 'Cash' | 'Bank Transfer' | 'Card' | 'Cheque';
export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue' | 'Partial';

export interface RentPayment {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  room: string;
  amount: number;
  dueAmount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  date: string;
  dueDate: string;
  receiptNo: string;
}

export type MaintenanceCategory = 'Plumbing' | 'Electrical' | 'Carpentry' | 'Painting' | 'Appliance' | 'General';
export type MaintenancePriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type MaintenanceStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export interface MaintenanceRequest {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  room: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  description: string;
  repairCost: number;
  createdDate: string;
  resolvedDate?: string;
}

export interface Expense {
  id: string;
  propertyId: string;
  propertyName: string;
  category: string;
  amount: number;
  date: string;
  description: string;
}

export type ReminderType = 'Rent Due' | 'Lease Renewal' | 'Maintenance' | 'Custom';
export type ReminderChannel = 'WhatsApp' | 'SMS' | 'Email' | 'In-App';
export type ReminderStatus = 'Pending' | 'Sent';

export interface Reminder {
  id: string;
  tenantId: string;
  tenantName: string;
  type: ReminderType;
  channel: ReminderChannel;
  message: string;
  scheduledDate: string;
  status: ReminderStatus;
}

export type LateFeeType = 'Fixed' | 'Percentage';

export interface Settings {
  lateFeeEnabled: boolean;
  gracePeriod: number;
  lateFeeType: LateFeeType;
  lateFeeAmount: number;
  maxCap: number;
  notifyWhatsApp: boolean;
  notifySMS: boolean;
  notifyEmail: boolean;
  notifyInApp: boolean;
  profileName: string;
  profileEmail: string;
  profilePhone: string;
  currency: string;
  dateFormat: string;
  rentDueDay: number;
  customBillTypes: string[];
}

export type BillType = 'Electricity' | 'Water' | 'Tax' | 'Internet' | 'Gas' | 'Maintenance' | 'Other';
export type BillStatus = 'Pending' | 'Paid';

export interface TenantBill {
  id: string;
  tenantId: string;
  type: BillType;
  description: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: BillStatus;
}

// Passbook Transaction Types
export type TransactionType = 'Income' | 'Expense';
export type TransactionCategory = 'Rent' | 'Deposit' | 'Bill Payment' | 'Maintenance' | 'Repairs' | 'Utilities' | 'Insurance' | 'Tax' | 'Salary' | 'Other';

export interface PassbookEntry {
  id: string;
  date: string;
  type: TransactionType;
  category: TransactionCategory;
  description: string;
  amount: number;
  balance: number;
  reference?: string;
  propertyId?: string;
  propertyName?: string;
  tenantId?: string;
  tenantName?: string;
}

// User Management
export type UserRole = 'Owner' | 'Manager' | 'Staff' | 'Accountant';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type TabKey = 'dashboard' | 'properties' | 'tenants' | 'rent' | 'maintenance' | 'reports' | 'reminders' | 'settings' | 'passbook';
