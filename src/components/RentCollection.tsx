import { useState, useMemo } from 'react';
import { RentPayment, PaymentMethod, PaymentStatus, Tenant, Property, Expense, TenantBill, BillStatus } from '../types';
import { generateId, generateReceiptNo } from '../data';
import { formatDate, formatCurrency } from '../utils/helpers';
import { Plus, CreditCard, Banknote, Smartphone, Building, FileText, X, CheckCircle, Calendar, TrendingDown, Receipt, Wallet, AlertCircle, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  payments: RentPayment[];
  setPayments: (p: RentPayment[]) => void;
  tenants: Tenant[];
  properties: Property[];
  expenses: Expense[];
  setExpenses: (e: Expense[]) => void;
  bills: TenantBill[];
  setBills: (b: TenantBill[]) => void;
  activeSubTab?: 'dues' | 'collection' | 'expense' | null;
  onToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const STATUS_COLORS: Record<PaymentStatus, string> = { Paid: 'bg-green-100 text-green-700', Pending: 'bg-yellow-100 text-yellow-700', Overdue: 'bg-red-100 text-red-700', Partial: 'bg-blue-100 text-blue-700' };
const METHOD_ICONS: Record<PaymentMethod, any> = { UPI: Smartphone, Cash: Banknote, 'Bank Transfer': Building, Card: CreditCard, Cheque: FileText };
const METHODS: PaymentMethod[] = ['UPI', 'Cash', 'Bank Transfer', 'Card', 'Cheque'];
const EXPENSE_CATEGORIES = ['Maintenance', 'Repairs', 'Utilities', 'Insurance', 'Tax', 'Salary', 'Other'];

export default function RentCollection({ payments, setPayments, tenants, properties, expenses, setExpenses, bills, setBills, activeSubTab, onToast }: Props) {
  const [showPayForm, setShowPayForm] = useState(false);
  const [showDueForm, setShowDueForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showManualRent, setShowManualRent] = useState(false);
  const [manualRent, setManualRent] = useState({ tenantId: '', amount: 0, method: 'UPI' as PaymentMethod, date: new Date().toISOString().split('T')[0] });
  const [selectedPayment, setSelectedPayment] = useState<RentPayment | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('UPI');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueForm, setDueForm] = useState({ tenantId: '', dueAmount: 0, dueDate: '' });
  const [expenseForm, setExpenseForm] = useState({ propertyId: '', category: 'Maintenance', amount: 0, date: '', description: '', isMonthly: false });

  const currentView = activeSubTab || 'dues';
  const totalDue = payments.filter(p => p.status !== 'Paid').reduce((s, p) => s + (p.dueAmount - p.amount), 0);
  const totalCollected = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const pendingCount = payments.filter(p => p.status === 'Pending').length;
  const overdueCount = payments.filter(p => p.status === 'Overdue').length;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const monthlyExpenses = expenses.filter(e => { const d = new Date(e.date); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).reduce((s, e) => s + e.amount, 0);

  // Build tenant-wise dues summary including bills
  const tenantDuesSummary = useMemo(() => {
    const activeTenants = tenants.filter(t => t.status === 'Active' || t.status === 'Notice');
    return activeTenants.map(t => {
      const rentDues = payments.filter(p => p.tenantId === t.id && p.status !== 'Paid');
      const rentDueTotal = rentDues.reduce((s, p) => s + (p.dueAmount - p.amount), 0);
      const pendingBills = bills.filter(b => b.tenantId === t.id && b.status === 'Pending');
      const billsTotal = pendingBills.reduce((s, b) => s + b.amount, 0);
      const prop = properties.find(p => p.id === t.propertyId);
      if (rentDueTotal === 0 && billsTotal === 0) return null;
      return { tenant: t, rentDues, rentDueTotal, pendingBills, billsTotal, totalDue: rentDueTotal + billsTotal, propertyName: prop?.name || '' };
    }).filter(Boolean) as { tenant: Tenant; rentDues: RentPayment[]; rentDueTotal: number; pendingBills: TenantBill[]; billsTotal: number; totalDue: number; propertyName: string }[];
  }, [tenants, payments, bills, properties]);

  const openPayForm = (p: RentPayment) => {
    setSelectedPayment(p);
    setPayAmount(p.dueAmount - p.amount);
    setPayMethod('UPI');
    setPayDate(new Date().toISOString().split('T')[0]);
    setShowPayForm(true);
  };

  const recordPayment = () => {
    if (!selectedPayment) return;
    const newAmount = selectedPayment.amount + payAmount;
    const newStatus: PaymentStatus = newAmount >= selectedPayment.dueAmount ? 'Paid' : 'Partial';
    setPayments(payments.map(p =>
      p.id === selectedPayment.id
        ? { ...p, amount: newAmount, status: newStatus, method: payMethod, date: payDate, receiptNo: p.receiptNo || generateReceiptNo() }
        : p
    ));
    setShowPayForm(false);
    onToast(`Payment of ${formatCurrency(payAmount)} recorded → Passbook updated`);
  };

  const generateDue = () => {
    const tenant = tenants.find(t => t.id === dueForm.tenantId);
    if (!tenant) return;
    setPayments([...payments, { id: generateId(), tenantId: tenant.id, tenantName: tenant.name, propertyId: tenant.propertyId, room: tenant.room, amount: 0, dueAmount: dueForm.dueAmount || tenant.rent, method: 'UPI', status: 'Pending', date: '', dueDate: dueForm.dueDate || new Date().toISOString().split('T')[0], receiptNo: '' }]);
    setShowDueForm(false);
    setDueForm({ tenantId: '', dueAmount: 0, dueDate: '' });
    onToast('Rent due generated');
  };

  // Collect all pending bills for a tenant at once
  const collectAllBills = (tenantId: string) => {
    const pendingBills = bills.filter(b => b.tenantId === tenantId && b.status === 'Pending');
    if (pendingBills.length === 0) return;
    const total = pendingBills.reduce((s, b) => s + b.amount, 0);
    const today = new Date().toISOString().split('T')[0];
    setBills(bills.map(b => b.tenantId === tenantId && b.status === 'Pending' ? { ...b, status: 'Paid' as BillStatus, paidDate: today } : b));
    const tenant = tenants.find(t => t.id === tenantId);
    onToast(`${pendingBills.length} bills (${formatCurrency(total)}) collected from ${tenant?.name} → Passbook updated`);
  };

  const addExpense = () => {
    if (!expenseForm.description.trim()) return;
    const prop = properties.find(p => p.id === expenseForm.propertyId);
    setExpenses([...expenses, { id: generateId(), propertyId: expenseForm.propertyId, propertyName: prop?.name || 'General', category: expenseForm.category, amount: expenseForm.amount, date: expenseForm.date || new Date().toISOString().split('T')[0], description: expenseForm.description + (expenseForm.isMonthly ? ' (Monthly)' : '') }]);
    setShowExpenseForm(false);
    setExpenseForm({ propertyId: '', category: 'Maintenance', amount: 0, date: '', description: '', isMonthly: false });
    onToast('Expense added → Passbook updated');
  };

  // Export tenant transaction history PDF
  const exportTenantPDF = (t: Tenant) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const tp = payments.filter(p => p.tenantId === t.id).sort((a, b) => (a.date || a.dueDate).localeCompare(b.date || b.dueDate));
    const tb = bills.filter(b => b.tenantId === t.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const prop = properties.find(p => p.id === t.propertyId);
    const totalPaid = tp.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
    const totalDue = tp.filter(p => p.status !== 'Paid').reduce((s, p) => s + (p.dueAmount - p.amount), 0);
    const billsPaid = tb.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);
    const billsPending = tb.filter(b => b.status === 'Pending').reduce((s, b) => s + b.amount, 0);

    doc.setFontSize(20); doc.setTextColor(99, 102, 241); doc.text('RentFlow', 14, 20);
    doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text('Tenant Transaction History', 14, 30);
    doc.setFontSize(10); doc.setTextColor(128, 128, 128); doc.text(`Generated: ${formatDate(new Date().toISOString().split('T')[0])}`, 14, 38);

    // Tenant info
    autoTable(doc, { startY: 45, body: [['Name', t.name], ['Property', prop?.name || '—'], ['Room', t.room || '—'], ['Monthly Rent', formatCurrency(t.rent)], ['Deposit', formatCurrency(t.deposit)], ['Date of Joining', formatDate(t.leaseStart)], ['Due Day', `${t.dueDay || 1} of every month`], ['Status', t.status]], theme: 'plain', styles: { fontSize: 10 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } } });

    // Summary
    let y = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(12); doc.setTextColor(0, 0, 0); doc.text('Financial Summary', 14, y);
    autoTable(doc, { startY: y + 4, head: [['Category', 'Amount']], body: [['Total Rent Paid', formatCurrency(totalPaid)], ['Rent Pending/Overdue', formatCurrency(totalDue)], ['Bills Paid', formatCurrency(billsPaid)], ['Bills Pending', formatCurrency(billsPending)], ['Advance/Balance', formatCurrency(totalPaid - tp.filter(p => p.status === 'Paid').reduce((s, p) => s + p.dueAmount, 0))], ['Total Outstanding', formatCurrency(totalDue + billsPending)]], theme: 'striped', headStyles: { fillColor: [99, 102, 241] } });

    // Rent payments
    y = (doc as any).lastAutoTable.finalY + 8;
    doc.text('Rent Payment History', 14, y);
    autoTable(doc, { startY: y + 4, head: [['Due Date', 'Amount Due', 'Paid', 'Date Paid', 'Method', 'Status', 'Receipt']], body: tp.map(p => [formatDate(p.dueDate), formatCurrency(p.dueAmount), formatCurrency(p.amount), p.date ? formatDate(p.date) : '—', p.method, p.status, p.receiptNo || '—']), theme: 'striped', headStyles: { fillColor: [99, 102, 241] }, styles: { fontSize: 8 } });

    // Bills
    if (tb.length > 0) {
      y = (doc as any).lastAutoTable.finalY + 8;
      doc.text('Bills & Dues', 14, y);
      autoTable(doc, { startY: y + 4, head: [['Type', 'Description', 'Amount', 'Due Date', 'Paid Date', 'Status']], body: tb.map(b => [b.type, b.description, formatCurrency(b.amount), formatDate(b.dueDate), b.paidDate ? formatDate(b.paidDate) : '—', b.status]), theme: 'striped', headStyles: { fillColor: [34, 197, 94] }, styles: { fontSize: 8 } });
    }

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(128, 128, 128); doc.text(`Page ${i}/${pages} | RentFlow - ${t.name}`, pw / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' }); }
    doc.save(`${t.name.replace(/\s+/g, '-')}-history.pdf`);
    onToast(`PDF exported for ${t.name}`);
  };

  const collectionPayments = payments.filter(p => p.status === 'Paid');

  return (
    <div className="space-y-6">
      {currentView === 'dues' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="flex items-center gap-3"><div className="p-2.5 bg-red-100 rounded-xl"><Receipt className="w-5 h-5 text-red-600" /></div><div><p className="text-sm text-gray-500">Total Due</p><p className="text-2xl font-bold text-red-600">{formatCurrency(totalDue)}</p></div></div></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="flex items-center gap-3"><div className="p-2.5 bg-yellow-100 rounded-xl"><Calendar className="w-5 h-5 text-yellow-600" /></div><div><p className="text-sm text-gray-500">Pending</p><p className="text-2xl font-bold text-yellow-600">{pendingCount}</p></div></div></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="flex items-center gap-3"><div className="p-2.5 bg-red-100 rounded-xl"><AlertCircle className="w-5 h-5 text-red-600" /></div><div><p className="text-sm text-gray-500">Overdue</p><p className="text-2xl font-bold text-red-600">{overdueCount}</p></div></div></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-center justify-center gap-2">
              <button onClick={() => setShowDueForm(true)} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition font-medium text-sm"><Plus className="w-4 h-4" /> Generate Due</button>
              <button onClick={() => setShowManualRent(true)} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition font-medium text-sm"><CreditCard className="w-4 h-4" /> Record Rent</button>
            </div>
          </div>

          {/* Tenant-wise Dues Cards */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Tenant-wise Dues</h3>
            {tenantDuesSummary.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">No pending dues</div>
            ) : tenantDuesSummary.map(item => (
              <div key={item.tenant.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: item.tenant.avatarColor }}>
                      {item.tenant.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.tenant.name}</h4>
                      <p className="text-xs text-gray-500">{item.propertyName} {item.tenant.room && `• Room ${item.tenant.room}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">{formatCurrency(item.totalDue)}</p>
                      <p className="text-xs text-gray-500">Total due</p>
                    </div>
                    <button onClick={() => exportTenantPDF(item.tenant)} className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600 transition" title="Export PDF"><FileDown className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {/* Rent dues */}
                  {item.rentDues.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-red-500" />
                        <div><p className="text-sm font-medium text-gray-900">Rent Due</p><p className="text-xs text-gray-500">Due: {formatDate(p.dueDate)}</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right"><p className="text-sm font-bold text-red-600">{formatCurrency(p.dueAmount - p.amount)}</p><span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${STATUS_COLORS[p.status]}`}>{p.status}</span></div>
                        <button onClick={() => openPayForm(p)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition font-medium">Collect</button>
                      </div>
                    </div>
                  ))}
                  {/* Bill dues */}
                  {item.pendingBills.length > 0 && (
                    <div className="p-3 bg-orange-50/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-orange-700 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Pending Bills</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-orange-700">{formatCurrency(item.billsTotal)}</p>
                          <button onClick={() => collectAllBills(item.tenant.id)} className="text-xs bg-orange-600 text-white px-3 py-1 rounded-lg hover:bg-orange-700 transition font-medium">Collect Bills</button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {item.pendingBills.map(b => (
                          <div key={b.id} className="flex items-center justify-between text-xs gap-3">
                            <div className="min-w-0">
                              <span className="text-gray-600 block truncate">{b.type}: {b.description}</span>
                              <span className="text-[10px] text-gray-400">Due: {formatDate(b.dueDate)}</span>
                            </div>
                            <span className="font-semibold text-orange-600 shrink-0">{formatCurrency(b.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {currentView === 'collection' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="flex items-center gap-3"><div className="p-2.5 bg-green-100 rounded-xl"><Wallet className="w-5 h-5 text-green-600" /></div><div><p className="text-sm text-gray-500">Total Collected</p><p className="text-2xl font-bold text-green-600">{formatCurrency(totalCollected)}</p></div></div></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="flex items-center gap-3"><div className="p-2.5 bg-indigo-100 rounded-xl"><CheckCircle className="w-5 h-5 text-indigo-600" /></div><div><p className="text-sm text-gray-500">Payments</p><p className="text-2xl font-bold text-indigo-600">{collectionPayments.length}</p></div></div></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="flex items-center gap-3"><div className="p-2.5 bg-purple-100 rounded-xl"><Receipt className="w-5 h-5 text-purple-600" /></div><div><p className="text-sm text-gray-500">Receipts</p><p className="text-2xl font-bold text-purple-600">{collectionPayments.filter(p => p.receiptNo).length}</p></div></div></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h3 className="text-lg font-semibold text-gray-900">Payment History</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-100"><th className="text-left px-5 py-3.5 font-semibold text-gray-600">Tenant</th><th className="text-left px-5 py-3.5 font-semibold text-gray-600">Room</th><th className="text-left px-5 py-3.5 font-semibold text-gray-600">Amount</th><th className="text-left px-5 py-3.5 font-semibold text-gray-600">Method</th><th className="text-left px-5 py-3.5 font-semibold text-gray-600">Date</th><th className="text-left px-5 py-3.5 font-semibold text-gray-600">Receipt</th><th className="text-left px-5 py-3.5 font-semibold text-gray-600"></th></tr></thead>
                <tbody>
                  {collectionPayments.sort((a, b) => b.date.localeCompare(a.date)).map(p => {
                    const MIcon = METHOD_ICONS[p.method];
                    const tenant = tenants.find(t => t.id === p.tenantId);
                    return (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                        <td className="px-5 py-3.5 font-medium text-gray-900">{p.tenantName}</td>
                        <td className="px-5 py-3.5 text-gray-600">{p.room}</td>
                        <td className="px-5 py-3.5 text-green-600 font-bold">{formatCurrency(p.amount)}</td>
                        <td className="px-5 py-3.5"><span className="flex items-center gap-1.5 text-gray-600"><MIcon className="w-4 h-4" /> {p.method}</span></td>
                        <td className="px-5 py-3.5 text-gray-600">{formatDate(p.date)}</td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs font-mono">{p.receiptNo}</td>
                        <td className="px-5 py-3.5">{tenant && <button onClick={() => exportTenantPDF(tenant)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 transition" title="Export tenant PDF"><FileDown className="w-4 h-4" /></button>}</td>
                      </tr>
                    );
                  })}
                  {collectionPayments.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">No payments</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {currentView === 'expense' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="flex items-center gap-3"><div className="p-2.5 bg-red-100 rounded-xl"><TrendingDown className="w-5 h-5 text-red-600" /></div><div><p className="text-sm text-gray-500">Total Expenses</p><p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p></div></div></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="flex items-center gap-3"><div className="p-2.5 bg-orange-100 rounded-xl"><Calendar className="w-5 h-5 text-orange-600" /></div><div><p className="text-sm text-gray-500">This Month</p><p className="text-2xl font-bold text-orange-600">{formatCurrency(monthlyExpenses)}</p></div></div></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="flex items-center gap-3"><div className="p-2.5 bg-indigo-100 rounded-xl"><Receipt className="w-5 h-5 text-indigo-600" /></div><div><p className="text-sm text-gray-500">Records</p><p className="text-2xl font-bold text-indigo-600">{expenses.length}</p></div></div></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-center"><button onClick={() => setShowExpenseForm(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm"><Plus className="w-4 h-4" /> Add Expense</button></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h3 className="text-lg font-semibold text-gray-900">Expense Records</h3></div>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b border-gray-100"><th className="text-left px-5 py-3.5 font-semibold text-gray-600">Date</th><th className="text-left px-5 py-3.5 font-semibold text-gray-600">Property</th><th className="text-left px-5 py-3.5 font-semibold text-gray-600">Category</th><th className="text-left px-5 py-3.5 font-semibold text-gray-600">Description</th><th className="text-left px-5 py-3.5 font-semibold text-gray-600">Amount</th></tr></thead><tbody>
              {expenses.map(e => (<tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50"><td className="px-5 py-3.5 text-gray-600">{formatDate(e.date)}</td><td className="px-5 py-3.5 font-medium text-gray-900">{e.propertyName}</td><td className="px-5 py-3.5"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{e.category}</span></td><td className="px-5 py-3.5 text-gray-600">{e.description}</td><td className="px-5 py-3.5 text-red-600 font-bold">{formatCurrency(e.amount)}</td></tr>))}
              {expenses.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No expenses</td></tr>}
            </tbody></table></div>
          </div>
        </>
      )}

      {/* Record Payment / Collect Modal - WITH DATE PICKER */}
      {showPayForm && selectedPayment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowPayForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold">Collect Payment</h2><button onClick={() => setShowPayForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Tenant: <span className="font-medium text-gray-900">{selectedPayment.tenantName}</span></p>
                <p className="text-sm text-gray-500 mt-1">Balance Due: <span className="font-medium text-red-600">{formatCurrency(selectedPayment.dueAmount - selectedPayment.amount)}</span></p>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (₹)</label><input type="number" value={payAmount} onChange={e => setPayAmount(+e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label><input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {METHODS.map(m => { const MIcon = METHOD_ICONS[m]; return (
                    <button key={m} onClick={() => setPayMethod(m)} className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition ${payMethod === m ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}><MIcon className="w-4 h-4" />{m}</button>
                  ); })}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowPayForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button>
                <button onClick={recordPayment} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-green-700 transition">Confirm Payment</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Due Modal */}
      {showDueForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowDueForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold">Generate Due</h2><button onClick={() => setShowDueForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label><select value={dueForm.tenantId} onChange={e => { const t = tenants.find(t => t.id === e.target.value); setDueForm({ ...dueForm, tenantId: e.target.value, dueAmount: t?.rent || 0 }); }} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">Select tenant</option>{tenants.filter(t => t.status === 'Active').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Due Amount (₹)</label><input type="number" value={dueForm.dueAmount} onChange={e => setDueForm({ ...dueForm, dueAmount: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label><input type="date" value={dueForm.dueDate} onChange={e => setDueForm({ ...dueForm, dueDate: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div className="flex gap-3 pt-2"><button onClick={() => setShowDueForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button><button onClick={generateDue} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">Generate</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowExpenseForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold">Add Expense</h2><button onClick={() => setShowExpenseForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Property</label><select value={expenseForm.propertyId} onChange={e => setExpenseForm({ ...expenseForm, propertyId: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">General</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><select value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">{EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label><input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description*</label><input value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="e.g., Plumbing repair" /></div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"><div><p className="font-medium text-gray-900 text-sm">Monthly Recurring</p><p className="text-xs text-gray-500">Mark as monthly</p></div><button onClick={() => setExpenseForm({ ...expenseForm, isMonthly: !expenseForm.isMonthly })} className={`relative w-12 h-6 rounded-full transition-colors ${expenseForm.isMonthly ? 'bg-indigo-600' : 'bg-gray-300'}`}><div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${expenseForm.isMonthly ? 'translate-x-6' : 'translate-x-0.5'}`} /></button></div>
              <div className="flex gap-3 pt-2"><button onClick={() => setShowExpenseForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button><button onClick={addExpense} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">Add Expense</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Record Rent Modal */}
      {showManualRent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowManualRent(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold">Record Rent</h2><button onClick={() => setShowManualRent(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label><select value={manualRent.tenantId} onChange={e => { const t = tenants.find(t => t.id === e.target.value); setManualRent({ ...manualRent, tenantId: e.target.value, amount: t?.rent || 0 }); }} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">Select</option>{tenants.filter(t => t.status === 'Active').map(t => <option key={t.id} value={t.id}>{t.name} - Room {t.room}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label><input type="number" value={manualRent.amount} onChange={e => setManualRent({ ...manualRent, amount: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label><input type="date" value={manualRent.date} onChange={e => setManualRent({ ...manualRent, date: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Method</label><div className="grid grid-cols-3 gap-2">{METHODS.map(m => { const MIcon = METHOD_ICONS[m]; return (<button key={m} onClick={() => setManualRent({ ...manualRent, method: m })} className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition ${manualRent.method === m ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}><MIcon className="w-4 h-4" />{m}</button>); })}</div></div>
              <div className="flex gap-3 pt-2"><button onClick={() => setShowManualRent(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button><button onClick={() => {
                const tenant = tenants.find(t => t.id === manualRent.tenantId); if (!tenant) return;
                const existing = payments.find(p => p.tenantId === tenant.id && (p.status === 'Pending' || p.status === 'Overdue'));
                if (existing) { const newAmt = existing.amount + manualRent.amount; setPayments(payments.map(p => p.id === existing.id ? { ...p, amount: newAmt, status: newAmt >= existing.dueAmount ? 'Paid' as PaymentStatus : 'Partial' as PaymentStatus, method: manualRent.method, date: manualRent.date, receiptNo: p.receiptNo || generateReceiptNo() } : p)); }
                else { setPayments([...payments, { id: generateId(), tenantId: tenant.id, tenantName: tenant.name, propertyId: tenant.propertyId, room: tenant.room, amount: manualRent.amount, dueAmount: manualRent.amount, method: manualRent.method, status: 'Paid', date: manualRent.date, dueDate: manualRent.date, receiptNo: generateReceiptNo() }]); }
                setShowManualRent(false); setManualRent({ tenantId: '', amount: 0, method: 'UPI', date: new Date().toISOString().split('T')[0] });
                onToast(`Rent recorded for ${tenant.name} → Passbook updated`);
              }} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-green-700 transition">Record</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
