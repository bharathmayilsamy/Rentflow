import { useState } from 'react';
import { RentPayment, PaymentMethod, PaymentStatus, Tenant, Property, Expense } from '../types';
import { generateId, generateReceiptNo } from '../data';
import { Plus, CreditCard, Banknote, Smartphone, Building, FileText, X, CheckCircle, Calendar, TrendingDown, Receipt, Wallet } from 'lucide-react';

interface Props {
  payments: RentPayment[];
  setPayments: (p: RentPayment[]) => void;
  tenants: Tenant[];
  properties: Property[];
  expenses: Expense[];
  setExpenses: (e: Expense[]) => void;
  activeSubTab?: 'dues' | 'collection' | 'expense' | null;
}

const STATUS_COLORS: Record<PaymentStatus, string> = {
  Paid: 'bg-green-100 text-green-700',
  Pending: 'bg-yellow-100 text-yellow-700',
  Overdue: 'bg-red-100 text-red-700',
  Partial: 'bg-blue-100 text-blue-700',
};

const METHOD_ICONS: Record<PaymentMethod, any> = {
  UPI: Smartphone, Cash: Banknote, 'Bank Transfer': Building, Card: CreditCard, Cheque: FileText,
};

const METHODS: PaymentMethod[] = ['UPI', 'Cash', 'Bank Transfer', 'Card', 'Cheque'];
const EXPENSE_CATEGORIES = ['Maintenance', 'Repairs', 'Utilities', 'Insurance', 'Tax', 'Salary', 'Other'];

export default function RentCollection({ payments, setPayments, tenants, properties, expenses, setExpenses, activeSubTab }: Props) {
  const [showPayForm, setShowPayForm] = useState(false);
  const [showDueForm, setShowDueForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showManualRent, setShowManualRent] = useState(false);
  const [manualRent, setManualRent] = useState({ tenantId: '', amount: 0, method: 'UPI' as PaymentMethod, date: new Date().toISOString().split('T')[0] });
  const [selectedPayment, setSelectedPayment] = useState<RentPayment | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('UPI');
  const [dueForm, setDueForm] = useState({ tenantId: '', dueAmount: 0, dueDate: '' });
  const [expenseForm, setExpenseForm] = useState({ 
    propertyId: '', category: 'Maintenance', amount: 0, date: '', description: '', isMonthly: false 
  });

  // Determine which view to show
  const currentView = activeSubTab || 'dues';

  const totalDue = payments.filter(p => p.status !== 'Paid').reduce((s, p) => s + (p.dueAmount - p.amount), 0);
  const totalCollected = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const pendingCount = payments.filter(p => p.status === 'Pending').length;
  const overdueCount = payments.filter(p => p.status === 'Overdue').length;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const monthlyExpenses = expenses.filter(e => {
    const expDate = new Date(e.date);
    const now = new Date();
    return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + e.amount, 0);

  const openPayForm = (p: RentPayment) => {
    setSelectedPayment(p);
    setPayAmount(p.dueAmount - p.amount);
    setPayMethod('UPI');
    setShowPayForm(true);
  };

  const recordPayment = () => {
    if (!selectedPayment) return;
    const newAmount = selectedPayment.amount + payAmount;
    const newStatus: PaymentStatus = newAmount >= selectedPayment.dueAmount ? 'Paid' : 'Partial';
    setPayments(payments.map(p =>
      p.id === selectedPayment.id
        ? { ...p, amount: newAmount, status: newStatus, method: payMethod, date: new Date().toISOString().split('T')[0], receiptNo: p.receiptNo || generateReceiptNo() }
        : p
    ));
    setShowPayForm(false);
  };

  const generateDue = () => {
    const tenant = tenants.find(t => t.id === dueForm.tenantId);
    if (!tenant) return;
    setPayments([...payments, {
      id: generateId(),
      tenantId: tenant.id,
      tenantName: tenant.name,
      propertyId: tenant.propertyId,
      room: tenant.room,
      amount: 0,
      dueAmount: dueForm.dueAmount || tenant.rent,
      method: 'UPI',
      status: 'Pending',
      date: '',
      dueDate: dueForm.dueDate || new Date().toISOString().split('T')[0],
      receiptNo: '',
    }]);
    setShowDueForm(false);
    setDueForm({ tenantId: '', dueAmount: 0, dueDate: '' });
  };

  const addExpense = () => {
    if (!expenseForm.description.trim()) return;
    const prop = properties.find(p => p.id === expenseForm.propertyId);
    
    // If monthly, add expenses for current and future months (simplified: just current)
    setExpenses([...expenses, {
      id: generateId(),
      propertyId: expenseForm.propertyId,
      propertyName: prop?.name || 'General',
      category: expenseForm.category,
      amount: expenseForm.amount,
      date: expenseForm.date || new Date().toISOString().split('T')[0],
      description: expenseForm.description + (expenseForm.isMonthly ? ' (Monthly)' : ''),
    }]);
    setShowExpenseForm(false);
    setExpenseForm({ propertyId: '', category: 'Maintenance', amount: 0, date: '', description: '', isMonthly: false });
  };

  // Filter data based on view
  const duesPayments = payments.filter(p => p.status === 'Pending' || p.status === 'Overdue' || p.status === 'Partial');
  const collectionPayments = payments.filter(p => p.status === 'Paid');

  return (
    <div className="space-y-6">
      {/* Summary Cards - Different for each view */}
      {currentView === 'dues' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-100 rounded-xl">
                  <Receipt className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Due</p>
                  <p className="text-2xl font-bold text-red-600">₹{totalDue.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-yellow-100 rounded-xl">
                  <Calendar className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-100 rounded-xl">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-center justify-center gap-2">
              <button onClick={() => setShowDueForm(true)} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm">
                <Plus className="w-4 h-4" /> Generate Due
              </button>
              <button onClick={() => setShowManualRent(true)} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition font-medium text-sm shadow-sm">
                <CreditCard className="w-4 h-4" /> Record Rent
              </button>
            </div>
          </div>

          {/* Dues Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Pending Dues</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Tenant</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Room</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Due Amount</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Paid</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Balance</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Status</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Due Date</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {duesPayments.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="px-5 py-3.5 font-medium text-gray-900">{p.tenantName}</td>
                      <td className="px-5 py-3.5 text-gray-600">{p.room}</td>
                      <td className="px-5 py-3.5 text-gray-900 font-medium">₹{p.dueAmount.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-gray-900">₹{p.amount.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-red-600 font-medium">₹{(p.dueAmount - p.amount).toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{p.dueDate}</td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => openPayForm(p)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition font-medium">
                          Collect
                        </button>
                      </td>
                    </tr>
                  ))}
                  {duesPayments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-gray-400">No pending dues</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {currentView === 'collection' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-100 rounded-xl">
                  <Wallet className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Collected</p>
                  <p className="text-2xl font-bold text-green-600">₹{totalCollected.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payments Received</p>
                  <p className="text-2xl font-bold text-indigo-600">{collectionPayments.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 rounded-xl">
                  <Receipt className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Receipts Generated</p>
                  <p className="text-2xl font-bold text-purple-600">{collectionPayments.filter(p => p.receiptNo).length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Collection Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Tenant</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Room</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Amount</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Method</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Date</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Receipt No</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {collectionPayments.map(p => {
                    const MIcon = METHOD_ICONS[p.method];
                    return (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                        <td className="px-5 py-3.5 font-medium text-gray-900">{p.tenantName}</td>
                        <td className="px-5 py-3.5 text-gray-600">{p.room}</td>
                        <td className="px-5 py-3.5 text-green-600 font-bold">₹{p.amount.toLocaleString()}</td>
                        <td className="px-5 py-3.5">
                          <span className="flex items-center gap-1.5 text-gray-600">
                            <MIcon className="w-4 h-4" /> {p.method}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">{p.date}</td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs font-mono">{p.receiptNo}</td>
                        <td className="px-5 py-3.5">
                          <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> Paid
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {collectionPayments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-gray-400">No payments collected yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {currentView === 'expense' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-100 rounded-xl">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">₹{totalExpenses.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-100 rounded-xl">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">This Month</p>
                  <p className="text-2xl font-bold text-orange-600">₹{monthlyExpenses.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 rounded-xl">
                  <Receipt className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Records</p>
                  <p className="text-2xl font-bold text-indigo-600">{expenses.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-center">
              <button onClick={() => setShowExpenseForm(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm">
                <Plus className="w-4 h-4" /> Add Expense
              </button>
            </div>
          </div>

          {/* Expense Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Expense Records</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Date</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Property</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Category</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Description</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="px-5 py-3.5 text-gray-600">{e.date}</td>
                      <td className="px-5 py-3.5 font-medium text-gray-900">{e.propertyName}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{e.category}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {e.description}
                        {e.description.includes('(Monthly)') && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">Monthly</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-red-600 font-bold">₹{e.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-gray-400">No expenses recorded</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Record Payment Modal */}
      {showPayForm && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPayForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Record Payment</h2>
              <button onClick={() => setShowPayForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Tenant: <span className="font-medium text-gray-900">{selectedPayment.tenantName}</span></p>
                <p className="text-sm text-gray-500 mt-1">Balance Due: <span className="font-medium text-red-600">₹{(selectedPayment.dueAmount - selectedPayment.amount).toLocaleString()}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (₹)</label>
                <input type="number" value={payAmount} onChange={e => setPayAmount(+e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {METHODS.map(m => {
                    const MIcon = METHOD_ICONS[m];
                    return (
                      <button key={m} onClick={() => setPayMethod(m)} className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition ${payMethod === m ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        <MIcon className="w-4 h-4" />
                        {m}
                      </button>
                    );
                  })}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDueForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Generate New Due</h2>
              <button onClick={() => setShowDueForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
                <select value={dueForm.tenantId} onChange={e => {
                  const t = tenants.find(t => t.id === e.target.value);
                  setDueForm({ ...dueForm, tenantId: e.target.value, dueAmount: t?.rent || 0 });
                }} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Select tenant</option>
                  {tenants.filter(t => t.status === 'Active').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Amount (₹)</label>
                <input type="number" value={dueForm.dueAmount} onChange={e => setDueForm({ ...dueForm, dueAmount: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" value={dueForm.dueDate} onChange={e => setDueForm({ ...dueForm, dueDate: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowDueForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button>
                <button onClick={generateDue} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">Generate Due</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowExpenseForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Add Expense</h2>
              <button onClick={() => setShowExpenseForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                <select value={expenseForm.propertyId} onChange={e => setExpenseForm({ ...expenseForm, propertyId: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">General / All Properties</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description*</label>
                <input value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="e.g., Monthly Maintenance Staff Salary" />
              </div>
              
              {/* Monthly Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">Monthly Recurring</p>
                  <p className="text-xs text-gray-500 mt-0.5">Mark this as a monthly expense</p>
                </div>
                <button
                  onClick={() => setExpenseForm({ ...expenseForm, isMonthly: !expenseForm.isMonthly })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${expenseForm.isMonthly ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${expenseForm.isMonthly ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowExpenseForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button>
                <button onClick={addExpense} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">Add Expense</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Rent Recording Modal */}
      {showManualRent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowManualRent(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Record Rent Payment</h2>
              <button onClick={() => setShowManualRent(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
                <select value={manualRent.tenantId} onChange={e => {
                  const t = tenants.find(t => t.id === e.target.value);
                  setManualRent({ ...manualRent, tenantId: e.target.value, amount: t?.rent || 0 });
                }} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Select tenant</option>
                  {tenants.filter(t => t.status === 'Active').map(t => <option key={t.id} value={t.id}>{t.name} - Room {t.room}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input type="number" value={manualRent.amount} onChange={e => setManualRent({ ...manualRent, amount: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <input type="date" value={manualRent.date} onChange={e => setManualRent({ ...manualRent, date: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {METHODS.map(m => {
                    const MIcon = METHOD_ICONS[m];
                    return (
                      <button key={m} onClick={() => setManualRent({ ...manualRent, method: m })} className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition ${manualRent.method === m ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        <MIcon className="w-4 h-4" />{m}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowManualRent(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button>
                <button onClick={() => {
                  const tenant = tenants.find(t => t.id === manualRent.tenantId);
                  if (!tenant) return;
                  // Check if there's an existing pending due for this tenant
                  const existingDue = payments.find(p => p.tenantId === tenant.id && (p.status === 'Pending' || p.status === 'Overdue'));
                  if (existingDue) {
                    const newAmt = existingDue.amount + manualRent.amount;
                    const newStatus = newAmt >= existingDue.dueAmount ? 'Paid' as PaymentStatus : 'Partial' as PaymentStatus;
                    setPayments(payments.map(p => p.id === existingDue.id ? { ...p, amount: newAmt, status: newStatus, method: manualRent.method, date: manualRent.date, receiptNo: p.receiptNo || generateReceiptNo() } : p));
                  } else {
                    setPayments([...payments, {
                      id: generateId(), tenantId: tenant.id, tenantName: tenant.name, propertyId: tenant.propertyId, room: tenant.room,
                      amount: manualRent.amount, dueAmount: manualRent.amount, method: manualRent.method, status: 'Paid',
                      date: manualRent.date, dueDate: manualRent.date, receiptNo: generateReceiptNo(),
                    }]);
                  }
                  setShowManualRent(false);
                  setManualRent({ tenantId: '', amount: 0, method: 'UPI', date: new Date().toISOString().split('T')[0] });
                }} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-green-700 transition">Record Payment</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
