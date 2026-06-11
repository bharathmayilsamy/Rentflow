import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { Expense, Property, RentPayment, Tenant, TenantBill } from '../types';
import { generateId } from '../data';
import { revenueData } from '../data';
import { Plus, Trash2, X, Download, FileSpreadsheet, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Props {
  expenses: Expense[];
  setExpenses: (e: Expense[]) => void;
  properties: Property[];
  payments: RentPayment[];
  tenants: Tenant[];
  bills: TenantBill[];
}

const EXPENSE_COLORS = ['#6366f1', '#ec4899', '#f97316', '#22c55e', '#06b6d4', '#eab308'];
const CATEGORIES = ['Maintenance', 'Repairs', 'Utilities', 'Insurance', 'Tax', 'Other'];

export default function Reports({ expenses, setExpenses, properties, payments, tenants, bills }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'income-expense' | 'detailed'>('income-expense');
  const [form, setForm] = useState({ propertyId: '', category: 'Maintenance', amount: 0, date: '', description: '' });

  const totalIncome = revenueData.reduce((s, d) => s + d.income, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);

  // Expense breakdown
  const expenseByCategory = CATEGORIES.map(cat => ({
    name: cat,
    value: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(d => d.value > 0);

  // Property-wise comparison
  const propertyComparison = properties.map(p => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
    income: payments.filter(pay => pay.propertyId === p.id && pay.status === 'Paid').reduce((s, pay) => s + pay.amount, 0),
    expense: expenses.filter(e => e.propertyId === p.id).reduce((s, e) => s + e.amount, 0),
  }));

  const addExpense = () => {
    if (!form.description.trim()) return;
    const prop = properties.find(p => p.id === form.propertyId);
    setExpenses([...expenses, {
      id: generateId(),
      propertyId: form.propertyId,
      propertyName: prop?.name || 'General',
      category: form.category,
      amount: form.amount,
      date: form.date || new Date().toISOString().split('T')[0],
      description: form.description,
    }]);
    setShowForm(false);
    setForm({ propertyId: '', category: 'Maintenance', amount: 0, date: '', description: '' });
  };

  const removeExpense = (id: string) => setExpenses(expenses.filter(e => e.id !== id));

  // Helper to get tenant payment details
  const getTenantPaymentDetails = () => {
    return tenants.map(tenant => {
      const tenantPayments = payments.filter(p => p.tenantId === tenant.id);
      const totalPaid = tenantPayments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
      const totalDue = tenantPayments.reduce((s, p) => s + p.dueAmount, 0);
      const pending = totalDue - totalPaid;
      
      const tenantBills = bills.filter(b => b.tenantId === tenant.id);
      const paidBills = tenantBills.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);
      const pendingBills = tenantBills.filter(b => b.status === 'Pending').reduce((s, b) => s + b.amount, 0);
      
      const prop = properties.find(p => p.id === tenant.propertyId);
      
      return {
        name: tenant.name,
        property: prop?.name || 'Unknown',
        room: tenant.room,
        monthlyRent: tenant.rent,
        totalPaid,
        pending,
        paidBills,
        pendingBills,
        totalOutstanding: pending + pendingBills,
        status: tenant.status,
      };
    });
  };

  // Export to PDF - Income & Expense Report
  const exportIncomeExpensePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(99, 102, 241);
    doc.text('RentFlow', 14, 20);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Income & Expense Report', 14, 30);
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 38);
    
    // Summary
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Summary', 14, 52);
    
    autoTable(doc, {
      startY: 56,
      head: [['Description', 'Amount (₹)']],
      body: [
        ['Total Income', totalIncome.toLocaleString()],
        ['Total Expenses', totalExpense.toLocaleString()],
        ['Net Profit', (totalIncome - totalExpense).toLocaleString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
    });
    
    // Monthly breakdown
    const finalY1 = (doc as any).lastAutoTable.finalY + 10;
    doc.text('Monthly Breakdown', 14, finalY1);
    
    autoTable(doc, {
      startY: finalY1 + 4,
      head: [['Month', 'Income (₹)', 'Expense (₹)', 'Net (₹)']],
      body: revenueData.map(d => [
        d.month,
        d.income.toLocaleString(),
        d.expense.toLocaleString(),
        (d.income - d.expense).toLocaleString(),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
    });
    
    // Expense Records
    const finalY2 = (doc as any).lastAutoTable.finalY + 10;
    doc.text('Expense Records', 14, finalY2);
    
    autoTable(doc, {
      startY: finalY2 + 4,
      head: [['Date', 'Property', 'Category', 'Description', 'Amount (₹)']],
      body: expenses.map(e => [e.date, e.propertyName, e.category, e.description, e.amount.toLocaleString()]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
    });
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount} | RentFlow - Property Management`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }
    
    doc.save('income-expense-report.pdf');
  };

  // Export to Excel - Income & Expense Report
  const exportIncomeExpenseExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['RentFlow - Income & Expense Report'],
      [`Generated on: ${new Date().toLocaleDateString('en-IN')}`],
      [],
      ['Summary'],
      ['Description', 'Amount (₹)'],
      ['Total Income', totalIncome],
      ['Total Expenses', totalExpense],
      ['Net Profit', totalIncome - totalExpense],
      [],
      ['Monthly Breakdown'],
      ['Month', 'Income (₹)', 'Expense (₹)', 'Net (₹)'],
      ...revenueData.map(d => [d.month, d.income, d.expense, d.income - d.expense]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
    
    // Expenses sheet
    const expenseData = [
      ['Expense Records'],
      ['Date', 'Property', 'Category', 'Description', 'Amount (₹)'],
      ...expenses.map(e => [e.date, e.propertyName, e.category, e.description, e.amount]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(expenseData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Expenses');
    
    XLSX.writeFile(wb, 'income-expense-report.xlsx');
  };

  // Export to PDF - Detailed Tenant Report
  const exportDetailedPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const details = getTenantPaymentDetails();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(99, 102, 241);
    doc.text('RentFlow', 14, 20);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Detailed Tenant Payment Report', 14, 30);
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 38);
    
    // Overall Summary
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Overall Summary', 14, 52);
    
    const totalRentPaid = details.reduce((s, d) => s + d.totalPaid, 0);
    const totalRentPending = details.reduce((s, d) => s + d.pending, 0);
    const totalBillsPaid = details.reduce((s, d) => s + d.paidBills, 0);
    const totalBillsPending = details.reduce((s, d) => s + d.pendingBills, 0);
    
    autoTable(doc, {
      startY: 56,
      head: [['Category', 'Paid (₹)', 'Pending (₹)', 'Total (₹)']],
      body: [
        ['Rent Payments', totalRentPaid.toLocaleString(), totalRentPending.toLocaleString(), (totalRentPaid + totalRentPending).toLocaleString()],
        ['Bills & Dues', totalBillsPaid.toLocaleString(), totalBillsPending.toLocaleString(), (totalBillsPaid + totalBillsPending).toLocaleString()],
        ['Grand Total', (totalRentPaid + totalBillsPaid).toLocaleString(), (totalRentPending + totalBillsPending).toLocaleString(), (totalRentPaid + totalBillsPaid + totalRentPending + totalBillsPending).toLocaleString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
    });
    
    // Tenant-wise breakdown
    const finalY1 = (doc as any).lastAutoTable.finalY + 10;
    doc.text('Tenant-wise Payment Details', 14, finalY1);
    
    autoTable(doc, {
      startY: finalY1 + 4,
      head: [['Tenant', 'Property', 'Room', 'Rent Paid (₹)', 'Rent Pending (₹)', 'Bills Paid (₹)', 'Bills Pending (₹)', 'Total Outstanding (₹)']],
      body: details.map(d => [
        d.name,
        d.property,
        d.room,
        d.totalPaid.toLocaleString(),
        d.pending.toLocaleString(),
        d.paidBills.toLocaleString(),
        d.pendingBills.toLocaleString(),
        d.totalOutstanding.toLocaleString(),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 8 },
    });
    
    // Individual rent payment records
    const finalY2 = (doc as any).lastAutoTable.finalY + 10;
    doc.text('Rent Payment Records', 14, finalY2);
    
    autoTable(doc, {
      startY: finalY2 + 4,
      head: [['Tenant', 'Room', 'Due Date', 'Due Amount (₹)', 'Paid (₹)', 'Status', 'Receipt No']],
      body: payments.map(p => [
        p.tenantName,
        p.room,
        p.dueDate,
        p.dueAmount.toLocaleString(),
        p.amount.toLocaleString(),
        p.status,
        p.receiptNo || '—',
      ]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 8 },
    });
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount} | RentFlow - Property Management`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }
    
    doc.save('detailed-tenant-report.pdf');
  };

  // Export to Excel - Detailed Tenant Report
  const exportDetailedExcel = () => {
    const wb = XLSX.utils.book_new();
    const details = getTenantPaymentDetails();
    
    const totalRentPaid = details.reduce((s, d) => s + d.totalPaid, 0);
    const totalRentPending = details.reduce((s, d) => s + d.pending, 0);
    const totalBillsPaid = details.reduce((s, d) => s + d.paidBills, 0);
    const totalBillsPending = details.reduce((s, d) => s + d.pendingBills, 0);
    
    // Summary sheet
    const summaryData = [
      ['RentFlow - Detailed Tenant Payment Report'],
      [`Generated on: ${new Date().toLocaleDateString('en-IN')}`],
      [],
      ['Overall Summary'],
      ['Category', 'Paid (₹)', 'Pending (₹)', 'Total (₹)'],
      ['Rent Payments', totalRentPaid, totalRentPending, totalRentPaid + totalRentPending],
      ['Bills & Dues', totalBillsPaid, totalBillsPending, totalBillsPaid + totalBillsPending],
      ['Grand Total', totalRentPaid + totalBillsPaid, totalRentPending + totalBillsPending, totalRentPaid + totalBillsPaid + totalRentPending + totalBillsPending],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
    
    // Tenant details sheet
    const tenantData = [
      ['Tenant-wise Payment Details'],
      ['Tenant', 'Property', 'Room', 'Monthly Rent', 'Rent Paid', 'Rent Pending', 'Bills Paid', 'Bills Pending', 'Total Outstanding', 'Status'],
      ...details.map(d => [d.name, d.property, d.room, d.monthlyRent, d.totalPaid, d.pending, d.paidBills, d.pendingBills, d.totalOutstanding, d.status]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(tenantData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Tenant Details');
    
    // Payment records sheet
    const paymentData = [
      ['Rent Payment Records'],
      ['Tenant', 'Room', 'Due Date', 'Due Amount', 'Paid Amount', 'Status', 'Payment Date', 'Method', 'Receipt No'],
      ...payments.map(p => [p.tenantName, p.room, p.dueDate, p.dueAmount, p.amount, p.status, p.date || '—', p.method, p.receiptNo || '—']),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(paymentData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Payment Records');
    
    // Bills sheet
    const billData = [
      ['Bills & Dues'],
      ['Tenant', 'Bill Type', 'Description', 'Amount', 'Due Date', 'Status', 'Paid Date'],
      ...bills.map(b => {
        const tenant = tenants.find(t => t.id === b.tenantId);
        return [tenant?.name || 'Unknown', b.type, b.description, b.amount, b.dueDate, b.status, b.paidDate || '—'];
      }),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(billData);
    XLSX.utils.book_append_sheet(wb, ws4, 'Bills');
    
    XLSX.writeFile(wb, 'detailed-tenant-report.xlsx');
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    if (exportType === 'income-expense') {
      if (format === 'pdf') exportIncomeExpensePDF();
      else exportIncomeExpenseExcel();
    } else {
      if (format === 'pdf') exportDetailedPDF();
      else exportDetailedExcel();
    }
    setShowExportModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Income, expenses, and financial insights</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 transition font-medium text-sm shadow-sm">
            <Download className="w-4 h-4" /> Export Reports
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total Income</p>
          <p className="text-2xl font-bold text-green-600 mt-1">₹{totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600 mt-1">₹{totalExpense.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Net Profit</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">₹{(totalIncome - totalExpense).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends Area Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, '']} />
              <Area type="monotone" dataKey="income" stroke="#6366f1" fill="url(#incomeGrad)" strokeWidth={2} name="Income" />
              <Area type="monotone" dataKey="expense" stroke="#f43f5e" fill="url(#expenseGrad)" strokeWidth={2} name="Expense" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown Pie */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={expenseByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                {expenseByCategory.map((_, index) => (
                  <Cell key={index} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Property-wise Bar Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Property-wise Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={propertyComparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, '']} />
            <Bar dataKey="income" fill="#6366f1" radius={[4, 4, 0, 0]} name="Income" />
            <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expense" />
            <Legend />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expense Records Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Expense Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Property</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Category</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Description</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Amount</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3 text-gray-600">{e.date}</td>
                  <td className="px-5 py-3 text-gray-900 font-medium">{e.propertyName}</td>
                  <td className="px-5 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{e.category}</span></td>
                  <td className="px-5 py-3 text-gray-600">{e.description}</td>
                  <td className="px-5 py-3 text-gray-900 font-medium">₹{e.amount.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => removeExpense(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Add Expense</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                <select value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Select property</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description*</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Expense description" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button>
                <button onClick={addExpense} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">Add Expense</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowExportModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Export Reports</h2>
              <button onClick={() => setShowExportModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Report Type</label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${exportType === 'income-expense' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="exportType" checked={exportType === 'income-expense'} onChange={() => setExportType('income-expense')} className="mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Income & Expense Report</p>
                      <p className="text-xs text-gray-500 mt-0.5">Monthly breakdown, total income, expenses, and net profit</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${exportType === 'detailed' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="exportType" checked={exportType === 'detailed'} onChange={() => setExportType('detailed')} className="mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Detailed Tenant Report</p>
                      <p className="text-xs text-gray-500 mt-0.5">Tenant-wise payments, pending dues, bills, and complete payment history</p>
                    </div>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Choose Format</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleExport('pdf')} className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-red-200 bg-red-50 hover:border-red-400 transition">
                    <FileText className="w-8 h-8 text-red-600" />
                    <span className="font-medium text-red-700">Export PDF</span>
                  </button>
                  <button onClick={() => handleExport('excel')} className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-green-200 bg-green-50 hover:border-green-400 transition">
                    <FileSpreadsheet className="w-8 h-8 text-green-600" />
                    <span className="font-medium text-green-700">Export Excel</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
