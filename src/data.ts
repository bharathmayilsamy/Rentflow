import { Property, Tenant, RentPayment, MaintenanceRequest, Expense, Reminder, Settings, TenantBill, PassbookEntry, User } from './types';

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];

export const getAvatarColor = () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const generateReceiptNo = () => 'RCP-' + Date.now().toString().slice(-8);

export const initialProperties: Property[] = [
  { id: 'p1', name: 'Sunrise Apartments', type: 'Apartment', address: '123 MG Road, Bangalore', totalRooms: 20, occupiedRooms: 16, monthlyRent: 15000 },
  { id: 'p2', name: 'Green Valley PG', type: 'PG', address: '45 Koramangala, Bangalore', totalRooms: 30, occupiedRooms: 28, monthlyRent: 8000 },
  { id: 'p3', name: 'Elite Hostel', type: 'Hostel', address: '78 Indiranagar, Bangalore', totalRooms: 50, occupiedRooms: 42, monthlyRent: 6000 },
  { id: 'p4', name: 'Lake View House', type: 'House', address: '12 Whitefield, Bangalore', totalRooms: 5, occupiedRooms: 4, monthlyRent: 25000 },
  { id: 'p5', name: 'Tech Park Office', type: 'Commercial', address: '90 Electronic City, Bangalore', totalRooms: 10, occupiedRooms: 7, monthlyRent: 50000 },
];

export const initialTenants: Tenant[] = [
  { id: 't1', name: 'Rahul Sharma', email: 'rahul@email.com', phone: '9876543210', propertyId: 'p1', room: 'A-101', rent: 15000, deposit: 30000, leaseStart: '2024-01-01', leaseEnd: '2025-12-31', idProof: 'Aadhar - XXXX1234', emergencyContact: '9876543211', notes: 'Prefers ground floor', status: 'Active', avatarColor: '#6366f1', dueDay: 1, ebConsumerNo: '', waterBillNo: '', propertyTaxNo: '', isLocked: false },
  { id: 't2', name: 'Priya Patel', email: 'priya@email.com', phone: '9876543212', propertyId: 'p1', room: 'A-202', rent: 15000, deposit: 30000, leaseStart: '2024-03-01', leaseEnd: '2025-02-28', idProof: 'PAN - XXXX5678', emergencyContact: '9876543213', notes: '', status: 'Active', avatarColor: '#ec4899', dueDay: 5, ebConsumerNo: '', waterBillNo: '', propertyTaxNo: '', isLocked: false },
  { id: 't3', name: 'Amit Kumar', email: 'amit@email.com', phone: '9876543214', propertyId: 'p2', room: 'B-12', rent: 8000, deposit: 16000, leaseStart: '2024-06-01', leaseEnd: '2025-05-31', idProof: 'Aadhar - XXXX9012', emergencyContact: '9876543215', notes: 'Night shift worker', status: 'Active', avatarColor: '#22c55e', dueDay: 1, ebConsumerNo: '', waterBillNo: '', propertyTaxNo: '', isLocked: false },
  { id: 't4', name: 'Sneha Reddy', email: 'sneha@email.com', phone: '9876543216', propertyId: 'p3', room: 'H-5', rent: 6000, deposit: 12000, leaseStart: '2024-02-01', leaseEnd: '2024-12-31', idProof: 'Passport - XXXX3456', emergencyContact: '9876543217', notes: 'Student', status: 'Notice', avatarColor: '#f97316', dueDay: 10, ebConsumerNo: '', waterBillNo: '', propertyTaxNo: '', isLocked: false },
  { id: 't5', name: 'Vikram Singh', email: 'vikram@email.com', phone: '9876543218', propertyId: 'p4', room: 'Main', rent: 25000, deposit: 50000, leaseStart: '2024-04-01', leaseEnd: '2026-03-31', idProof: 'DL - XXXX7890', emergencyContact: '9876543219', notes: 'Family of 4', status: 'Active', avatarColor: '#3b82f6', dueDay: 1, ebConsumerNo: '', waterBillNo: '', propertyTaxNo: '', isLocked: false },
  { id: 't6', name: 'Deepa Nair', email: 'deepa@email.com', phone: '9876543220', propertyId: 'p2', room: 'B-15', rent: 8000, deposit: 16000, leaseStart: '2023-09-01', leaseEnd: '2024-08-31', idProof: 'Aadhar - XXXX2345', emergencyContact: '9876543221', notes: '', status: 'Inactive', avatarColor: '#8b5cf6', dueDay: 1, ebConsumerNo: '', waterBillNo: '', propertyTaxNo: '', isLocked: false },
];

export const initialPayments: RentPayment[] = [
  { id: 'pay1', tenantId: 't1', tenantName: 'Rahul Sharma', propertyId: 'p1', room: 'A-101', amount: 15000, dueAmount: 15000, method: 'UPI', status: 'Paid', date: '2025-01-05', dueDate: '2025-01-01', receiptNo: 'RCP-00000001' },
  { id: 'pay2', tenantId: 't2', tenantName: 'Priya Patel', propertyId: 'p1', room: 'A-202', amount: 15000, dueAmount: 15000, method: 'Bank Transfer', status: 'Paid', date: '2025-01-03', dueDate: '2025-01-01', receiptNo: 'RCP-00000002' },
  { id: 'pay3', tenantId: 't3', tenantName: 'Amit Kumar', propertyId: 'p2', room: 'B-12', amount: 0, dueAmount: 8000, method: 'UPI', status: 'Pending', date: '', dueDate: '2025-01-01', receiptNo: '' },
  { id: 'pay4', tenantId: 't4', tenantName: 'Sneha Reddy', propertyId: 'p3', room: 'H-5', amount: 0, dueAmount: 6000, method: 'Cash', status: 'Overdue', date: '', dueDate: '2024-12-01', receiptNo: '' },
  { id: 'pay5', tenantId: 't5', tenantName: 'Vikram Singh', propertyId: 'p4', room: 'Main', amount: 12000, dueAmount: 25000, method: 'Card', status: 'Partial', date: '2025-01-07', dueDate: '2025-01-01', receiptNo: 'RCP-00000003' },
  { id: 'pay6', tenantId: 't1', tenantName: 'Rahul Sharma', propertyId: 'p1', room: 'A-101', amount: 15000, dueAmount: 15000, method: 'UPI', status: 'Paid', date: '2024-12-02', dueDate: '2024-12-01', receiptNo: 'RCP-00000004' },
];

export const initialMaintenanceRequests: MaintenanceRequest[] = [
  { id: 'm1', tenantId: 't1', tenantName: 'Rahul Sharma', propertyId: 'p1', propertyName: 'Sunrise Apartments', room: 'A-101', category: 'Plumbing', priority: 'High', status: 'Open', description: 'Kitchen sink is leaking badly', repairCost: 0, createdDate: '2025-01-10' },
  { id: 'm2', tenantId: 't3', tenantName: 'Amit Kumar', propertyId: 'p2', propertyName: 'Green Valley PG', room: 'B-12', category: 'Electrical', priority: 'Urgent', status: 'In Progress', description: 'Power outlet sparking in room', repairCost: 2500, createdDate: '2025-01-08' },
  { id: 'm3', tenantId: 't5', tenantName: 'Vikram Singh', propertyId: 'p4', propertyName: 'Lake View House', room: 'Main', category: 'Carpentry', priority: 'Low', status: 'Resolved', description: 'Bedroom door hinge needs repair', repairCost: 800, createdDate: '2024-12-20', resolvedDate: '2024-12-25' },
  { id: 'm4', tenantId: 't4', tenantName: 'Sneha Reddy', propertyId: 'p3', propertyName: 'Elite Hostel', room: 'H-5', category: 'Appliance', priority: 'Medium', status: 'Open', description: 'AC not cooling properly', repairCost: 0, createdDate: '2025-01-12' },
];

export const initialExpenses: Expense[] = [
  { id: 'e1', propertyId: 'p1', propertyName: 'Sunrise Apartments', category: 'Maintenance', amount: 15000, date: '2025-01-05', description: 'Monthly maintenance staff salary' },
  { id: 'e2', propertyId: 'p1', propertyName: 'Sunrise Apartments', category: 'Repairs', amount: 5000, date: '2025-01-08', description: 'Plumbing repair in common area' },
  { id: 'e3', propertyId: 'p2', propertyName: 'Green Valley PG', category: 'Utilities', amount: 12000, date: '2025-01-03', description: 'Electricity bill' },
  { id: 'e4', propertyId: 'p3', propertyName: 'Elite Hostel', category: 'Insurance', amount: 25000, date: '2025-01-01', description: 'Annual property insurance premium' },
  { id: 'e5', propertyId: 'p4', propertyName: 'Lake View House', category: 'Tax', amount: 8000, date: '2025-01-10', description: 'Property tax payment' },
  { id: 'e6', propertyId: 'p2', propertyName: 'Green Valley PG', category: 'Maintenance', amount: 3000, date: '2024-12-20', description: 'Garden maintenance' },
  { id: 'e7', propertyId: 'p5', propertyName: 'Tech Park Office', category: 'Repairs', amount: 18000, date: '2024-12-15', description: 'HVAC system repair' },
];

export const initialReminders: Reminder[] = [
  { id: 'r1', tenantId: 't3', tenantName: 'Amit Kumar', type: 'Rent Due', channel: 'WhatsApp', message: 'Your rent of ₹8,000 is due. Please pay at the earliest.', scheduledDate: '2025-01-25', status: 'Pending' },
  { id: 'r2', tenantId: 't4', tenantName: 'Sneha Reddy', type: 'Lease Renewal', channel: 'Email', message: 'Your lease is expiring soon. Please contact us for renewal.', scheduledDate: '2024-12-15', status: 'Sent' },
  { id: 'r3', tenantId: 't1', tenantName: 'Rahul Sharma', type: 'Maintenance', channel: 'In-App', message: 'Your maintenance request has been received. We will update you soon.', scheduledDate: '2025-01-10', status: 'Sent' },
  { id: 'r4', tenantId: 't5', tenantName: 'Vikram Singh', type: 'Rent Due', channel: 'SMS', message: 'Partial payment received. Please pay remaining ₹13,000.', scheduledDate: '2025-01-15', status: 'Pending' },
];

export const initialSettings: Settings = {
  lateFeeEnabled: true,
  gracePeriod: 5,
  lateFeeType: 'Fixed',
  lateFeeAmount: 500,
  maxCap: 2000,
  notifyWhatsApp: true,
  notifySMS: true,
  notifyEmail: true,
  notifyInApp: true,
  profileName: 'Bharath',
  profileEmail: 'bharath@rentflow.com',
  profilePhone: '9876543200',
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
  rentDueDay: 1,
  customBillTypes: ['Electricity', 'Water', 'Tax', 'Internet', 'Gas', 'Maintenance', 'Other'],
};

export const revenueData = [
  { month: 'Jul', income: 180000, expense: 45000 },
  { month: 'Aug', income: 195000, expense: 52000 },
  { month: 'Sep', income: 210000, expense: 38000 },
  { month: 'Oct', income: 205000, expense: 61000 },
  { month: 'Nov', income: 220000, expense: 48000 },
  { month: 'Dec', income: 215000, expense: 55000 },
  { month: 'Jan', income: 230000, expense: 68000 },
];

export const recentActivities = [
  { id: 1, text: 'Rahul Sharma paid ₹15,000 rent via UPI', time: '2 hours ago', type: 'payment' as const },
  { id: 2, text: 'New maintenance request from Amit Kumar', time: '4 hours ago', type: 'maintenance' as const },
  { id: 3, text: 'Sneha Reddy submitted notice to vacate', time: '1 day ago', type: 'tenant' as const },
  { id: 4, text: 'Priya Patel paid ₹15,000 rent via Bank Transfer', time: '2 days ago', type: 'payment' as const },
  { id: 5, text: 'Maintenance resolved: Door hinge repair at Lake View', time: '3 days ago', type: 'maintenance' as const },
  { id: 6, text: 'Vikram Singh made partial payment of ₹12,000', time: '4 days ago', type: 'payment' as const },
];

export const initialBills: TenantBill[] = [
  { id: 'b1', tenantId: 't1', type: 'Electricity', description: 'January 2025 Electricity Bill', amount: 1500, dueDate: '2025-01-15', status: 'Paid', paidDate: '2025-01-12' },
  { id: 'b2', tenantId: 't1', type: 'Water', description: 'January 2025 Water Bill', amount: 500, dueDate: '2025-01-20', status: 'Pending' },
  { id: 'b3', tenantId: 't2', type: 'Internet', description: 'Internet Bill - Jan 2025', amount: 999, dueDate: '2025-01-10', status: 'Paid', paidDate: '2025-01-08' },
  { id: 'b4', tenantId: 't3', type: 'Electricity', description: 'Electricity Bill - Jan', amount: 800, dueDate: '2025-01-18', status: 'Pending' },
  { id: 'b5', tenantId: 't5', type: 'Gas', description: 'Gas Connection Bill', amount: 600, dueDate: '2025-01-22', status: 'Pending' },
  { id: 'b6', tenantId: 't4', type: 'Maintenance', description: 'Society Maintenance', amount: 2000, dueDate: '2025-01-05', status: 'Paid', paidDate: '2025-01-03' },
];

// Passbook entries - continuous revenue log
export const initialPassbook: PassbookEntry[] = [
  { id: 'pb1', date: '2024-12-01', type: 'Income', category: 'Rent', description: 'Rent from Rahul Sharma - A-101', amount: 15000, balance: 15000, tenantId: 't1', tenantName: 'Rahul Sharma', propertyId: 'p1', propertyName: 'Sunrise Apartments' },
  { id: 'pb2', date: '2024-12-02', type: 'Income', category: 'Rent', description: 'Rent from Priya Patel - A-202', amount: 15000, balance: 30000, tenantId: 't2', tenantName: 'Priya Patel', propertyId: 'p1', propertyName: 'Sunrise Apartments' },
  { id: 'pb3', date: '2024-12-05', type: 'Expense', category: 'Maintenance', description: 'Monthly maintenance staff salary', amount: 15000, balance: 15000, propertyId: 'p1', propertyName: 'Sunrise Apartments' },
  { id: 'pb4', date: '2024-12-10', type: 'Income', category: 'Rent', description: 'Rent from Amit Kumar - B-12', amount: 8000, balance: 23000, tenantId: 't3', tenantName: 'Amit Kumar', propertyId: 'p2', propertyName: 'Green Valley PG' },
  { id: 'pb5', date: '2024-12-15', type: 'Expense', category: 'Repairs', description: 'HVAC system repair', amount: 18000, balance: 5000, propertyId: 'p5', propertyName: 'Tech Park Office' },
  { id: 'pb6', date: '2024-12-20', type: 'Expense', category: 'Maintenance', description: 'Garden maintenance', amount: 3000, balance: 2000, propertyId: 'p2', propertyName: 'Green Valley PG' },
  { id: 'pb7', date: '2025-01-01', type: 'Expense', category: 'Insurance', description: 'Annual property insurance premium', amount: 25000, balance: -23000, propertyId: 'p3', propertyName: 'Elite Hostel' },
  { id: 'pb8', date: '2025-01-03', type: 'Income', category: 'Rent', description: 'Rent from Priya Patel - A-202', amount: 15000, balance: -8000, tenantId: 't2', tenantName: 'Priya Patel', propertyId: 'p1', propertyName: 'Sunrise Apartments' },
  { id: 'pb9', date: '2025-01-05', type: 'Income', category: 'Rent', description: 'Rent from Rahul Sharma - A-101', amount: 15000, balance: 7000, tenantId: 't1', tenantName: 'Rahul Sharma', propertyId: 'p1', propertyName: 'Sunrise Apartments' },
  { id: 'pb10', date: '2025-01-05', type: 'Expense', category: 'Maintenance', description: 'Monthly maintenance staff salary', amount: 15000, balance: -8000, propertyId: 'p1', propertyName: 'Sunrise Apartments' },
  { id: 'pb11', date: '2025-01-07', type: 'Income', category: 'Rent', description: 'Partial rent from Vikram Singh - Main', amount: 12000, balance: 4000, tenantId: 't5', tenantName: 'Vikram Singh', propertyId: 'p4', propertyName: 'Lake View House' },
  { id: 'pb12', date: '2025-01-08', type: 'Expense', category: 'Repairs', description: 'Plumbing repair in common area', amount: 5000, balance: -1000, propertyId: 'p1', propertyName: 'Sunrise Apartments' },
  { id: 'pb13', date: '2025-01-10', type: 'Expense', category: 'Tax', description: 'Property tax payment', amount: 8000, balance: -9000, propertyId: 'p4', propertyName: 'Lake View House' },
  { id: 'pb14', date: '2025-01-12', type: 'Income', category: 'Bill Payment', description: 'Electricity bill from Rahul Sharma', amount: 1500, balance: -7500, tenantId: 't1', tenantName: 'Rahul Sharma', propertyId: 'p1', propertyName: 'Sunrise Apartments' },
];

// Users for user management
export const initialUsers: User[] = [
  { id: 'u1', name: 'Bharath', email: 'bharath@rentflow.com', phone: '9876543200', role: 'Owner', avatar: '#6366f1', isActive: true, createdAt: '2024-01-01', lastLogin: '2025-01-15' },
  { id: 'u2', name: 'Priya Manager', email: 'priya.manager@rentflow.com', phone: '9876543201', role: 'Manager', avatar: '#ec4899', isActive: true, createdAt: '2024-03-15', lastLogin: '2025-01-14' },
  { id: 'u3', name: 'Ravi Staff', email: 'ravi.staff@rentflow.com', phone: '9876543202', role: 'Staff', avatar: '#22c55e', isActive: true, createdAt: '2024-06-01', lastLogin: '2025-01-13' },
];
