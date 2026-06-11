import { useState } from 'react';
import { PassbookEntry, TransactionType, TransactionCategory, Property, Tenant } from '../types';
import { generateId } from '../data';
import { Plus, X, ArrowUpCircle, ArrowDownCircle, Download, FileSpreadsheet, FileText, Filter, Calendar, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Props {
  passbook: PassbookEntry[];
  setPassbook: (p: PassbookEntry[]) => void;
  properties: Property[];
  tenants: Tenant[];
}

const INCOME_CATEGORIES: TransactionCategory[] = ['Rent', 'Deposit', 'Bill Payment', 'Other'];
const EXPENSE_CATEGORIES: TransactionCategory[] = ['Maintenance', 'Repairs', 'Utilities', 'Insurance', 'Tax', 'Salary', 'Other'];

export default function Passbook({ passbook, setPassbook, properties, tenants }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [filterType, setFilterType] = useState<TransactionType | ''>('');
  const [filterMonth, setFilterMonth] = useState('');
  const [form, setForm] = useState({
    type: 'Income' as TransactionType,
    category: 'Rent' as TransactionCategory,
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    propertyId: '',
    tenantId: '',
  });

  // Calculate totals
  const totalIncome = passbook.filter(p => p.type === 'Income').reduce((s, p) => s + p.amount, 0);
  const totalExpense = passbook.filter(p => p.type === 'Expense').reduce((s, p) => s + p.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // Filter entries
  const filteredEntries = passbook.filter(entry => {
    if (filterType && entry.type !== filterType) return false;
    if (filterMonth) {
      const entryMonth = entry.date.substring(0, 7);
      if (entryMonth !== filterMonth) return false;
    }
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Monthly P&L
  const getMonthlyPL = () => {
    const months: { [key: string]: { income: number; expense: number } } = {};
    passbook.forEach(entry => {
      const month = entry.date.substring(0, 7);
      if (!months[month]) months[month] = { income: 0, expense: 0 };
      if (entry.type === 'Income') months[month].income += entry.amount;
      else months[month].expense += entry.amount;
    });
    return Object.entries(months)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, data]) => ({
        month,
        ...data,
        profit: data.income - data.expense,
      }));
  };

  const monthlyPL = getMonthlyPL();

  const addEntry = () => {
    if (!form.description.trim()) return;

    const prop = properties.find(p => p.id === form.propertyId);
    const tenant = tenants.find(t => t.id === form.tenantId);
    const lastBalance = passbook.length > 0 ? passbook[passbook.length - 1].balance : 0;
    const newBalance = form.type === 'Income' 
      ? lastBalance + form.amount 
      : lastBalance - form.amount;

    const newEntry: PassbookEntry = {
      id: generateId(),
      date: form.date,
      type: form.type,
      category: form.category,
      description: form.description,
      amount: form.amount,
      balance: newBalance,
      propertyId: form.propertyId || undefined,
      propertyName: prop?.name,
      tenantId: form.tenantId || undefined,
      tenantName: tenant?.name,
      reference: `TXN-${Date.now().toString().slice(-8)}`,
    };

    // Insert in correct position based on date
    const newPassbook = [...passbook, newEntry].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Recalculate balances
    let runningBalance = 0;
    newPassbook.forEach(entry => {
      if (entry.type === 'Income') runningBalance += entry.amount;
      else runningBalance -= entry.amount;
      entry.balance = runningBalance;
    });

    setPassbook(newPassbook);
    setShowForm(false);
    setForm({
      type: 'Income',
      category: 'Rent',
      description: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      propertyId: '',
      tenantId: '',
    });
  };

  // Export Functions
  const exportTransactionsPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.setTextColor(99, 102, 241);
    doc.text('RentFlow', 14, 20);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Transaction Passbook', 14, 30);
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 38);

    // Summary
    autoTable(doc, {
      startY: 45,
      head: [['Total Income', 'Total Expense', 'Net Balance']],
      body: [[
        `₹${totalIncome.toLocaleString()}`,
        `₹${totalExpense.toLocaleString()}`,
        `₹${netBalance.toLocaleString()}`,
      ]],
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
    });

    // Transactions
    const finalY1 = (doc as any).lastAutoTable.finalY + 10;
    doc.text('All Transactions', 14, finalY1);

    autoTable(doc, {
      startY: finalY1 + 4,
      head: [['Date', 'Type', 'Category', 'Description', 'Amount', 'Balance']],
      body: filteredEntries.map(e => [
        e.date,
        e.type,
        e.category,
        e.description,
        `${e.type === 'Income' ? '+' : '-'}₹${e.amount.toLocaleString()}`,
        `₹${e.balance.toLocaleString()}`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 8 },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount} | RentFlow Passbook`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save('passbook-transactions.pdf');
  };

  const exportPLStatementPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.setTextColor(99, 102, 241);
    doc.text('RentFlow', 14, 20);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Profit & Loss Statement', 14, 30);
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 38);

    // Overall Summary
    autoTable(doc, {
      startY: 45,
      head: [['Description', 'Amount (₹)']],
      body: [
        ['Total Revenue', totalIncome.toLocaleString()],
        ['Total Expenses', `(${totalExpense.toLocaleString()})`],
        ['Net Profit/Loss', netBalance.toLocaleString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
    });

    // Monthly Breakdown
    const finalY1 = (doc as any).lastAutoTable.finalY + 10;
    doc.text('Monthly Breakdown', 14, finalY1);

    autoTable(doc, {
      startY: finalY1 + 4,
      head: [['Month', 'Income (₹)', 'Expense (₹)', 'Profit/Loss (₹)']],
      body: monthlyPL.map(m => [
        m.month,
        m.income.toLocaleString(),
        m.expense.toLocaleString(),
        m.profit.toLocaleString(),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
    });

    // Category-wise breakdown
    const incomeByCategory: { [key: string]: number } = {};
    const expenseByCategory: { [key: string]: number } = {};
    
    passbook.forEach(entry => {
      if (entry.type === 'Income') {
        incomeByCategory[entry.category] = (incomeByCategory[entry.category] || 0) + entry.amount;
      } else {
        expenseByCategory[entry.category] = (expenseByCategory[entry.category] || 0) + entry.amount;
      }
    });

    const finalY2 = (doc as any).lastAutoTable.finalY + 10;
    doc.text('Income by Category', 14, finalY2);

    autoTable(doc, {
      startY: finalY2 + 4,
      head: [['Category', 'Amount (₹)']],
      body: Object.entries(incomeByCategory).map(([cat, amt]) => [cat, amt.toLocaleString()]),
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
    });

    const finalY3 = (doc as any).lastAutoTable.finalY + 10;
    doc.text('Expenses by Category', 14, finalY3);

    autoTable(doc, {
      startY: finalY3 + 4,
      head: [['Category', 'Amount (₹)']],
      body: Object.entries(expenseByCategory).map(([cat, amt]) => [cat, amt.toLocaleString()]),
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68] },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount} | RentFlow P&L Statement`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save('profit-loss-statement.pdf');
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Transactions sheet
    const txnData = [
      ['RentFlow - Transaction Passbook'],
      [`Generated: ${new Date().toLocaleDateString('en-IN')}`],
      [],
      ['Date', 'Type', 'Category', 'Description', 'Property', 'Tenant', 'Amount', 'Balance', 'Reference'],
      ...filteredEntries.map(e => [
        e.date,
        e.type,
        e.category,
        e.description,
        e.propertyName || '',
        e.tenantName || '',
        e.type === 'Income' ? e.amount : -e.amount,
        e.balance,
        e.reference || '',
      ]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(txnData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Transactions');

    // P&L sheet
    const plData = [
      ['Profit & Loss Statement'],
      [],
      ['Summary'],
      ['Total Income', totalIncome],
      ['Total Expense', totalExpense],
      ['Net Profit/Loss', netBalance],
      [],
      ['Monthly Breakdown'],
      ['Month', 'Income', 'Expense', 'Profit/Loss'],
      ...monthlyPL.map(m => [m.month, m.income, m.expense, m.profit]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(plData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Profit & Loss');

    XLSX.writeFile(wb, 'rentflow-financial-report.xlsx');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Passbook & Reporting</h1>
          <p className="text-gray-500 text-sm mt-1">Continuous revenue log and financial statements</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 transition font-medium text-sm shadow-sm">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm">
            <Plus className="w-4 h-4" /> Add Entry
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-xl">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Income</p>
              <p className="text-2xl font-bold text-green-600">₹{totalIncome.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 rounded-xl">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Expense</p>
              <p className="text-2xl font-bold text-red-600">₹{totalExpense.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${netBalance >= 0 ? 'bg-indigo-100' : 'bg-orange-100'}`}>
              <Wallet className={`w-5 h-5 ${netBalance >= 0 ? 'text-indigo-600' : 'text-orange-600'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Net Balance</p>
              <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>₹{netBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 rounded-xl">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Transactions</p>
              <p className="text-2xl font-bold text-purple-600">{passbook.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 font-medium">Filters:</span>
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value as TransactionType | '')} className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="">All Types</option>
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
        </select>
        <input 
          type="month" 
          value={filterMonth} 
          onChange={e => setFilterMonth(e.target.value)} 
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        {(filterType || filterMonth) && (
          <button onClick={() => { setFilterType(''); setFilterMonth(''); }} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Clear Filters
          </button>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Date</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Type</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Category</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Description</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Property</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600">Amount</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600">Balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map(entry => (
                <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3.5 text-gray-600">{entry.date}</td>
                  <td className="px-5 py-3.5">
                    <span className={`flex items-center gap-1.5 ${entry.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.type === 'Income' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                      {entry.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{entry.category}</span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-900">{entry.description}</td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{entry.propertyName || '—'}</td>
                  <td className={`px-5 py-3.5 text-right font-bold ${entry.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                    {entry.type === 'Income' ? '+' : '-'}₹{entry.amount.toLocaleString()}
                  </td>
                  <td className={`px-5 py-3.5 text-right font-medium ${entry.balance >= 0 ? 'text-gray-900' : 'text-orange-600'}`}>
                    ₹{entry.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-400">No transactions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly P&L Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Profit & Loss</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Month</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600">Income</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600">Expense</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600">Profit/Loss</th>
              </tr>
            </thead>
            <tbody>
              {monthlyPL.map(m => (
                <tr key={m.month} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{m.month}</td>
                  <td className="px-5 py-3.5 text-right text-green-600 font-medium">₹{m.income.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-right text-red-600 font-medium">₹{m.expense.toLocaleString()}</td>
                  <td className={`px-5 py-3.5 text-right font-bold ${m.profit >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>
                    ₹{m.profit.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Entry Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Add Transaction</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setForm({ ...form, type: 'Income', category: 'Rent' })}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition ${form.type === 'Income' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                    <ArrowUpCircle className="w-5 h-5" /> Income
                  </button>
                  <button
                    onClick={() => setForm({ ...form, type: 'Expense', category: 'Maintenance' })}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition ${form.type === 'Expense' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                    <ArrowDownCircle className="w-5 h-5" /> Expense
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as TransactionCategory })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  {(form.type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                    <option key={c}>{c}</option>
                  ))}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Property (Optional)</label>
                <select value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Select property</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {form.type === 'Income' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tenant (Optional)</label>
                  <select value={form.tenantId} onChange={e => setForm({ ...form, tenantId: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Select tenant</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description*</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Enter description" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button>
                <button onClick={addEntry} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">Add Entry</button>
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
              <h2 className="text-xl font-bold">Export Documents</h2>
              <button onClick={() => setShowExportModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <button onClick={() => { exportTransactionsPDF(); setShowExportModal(false); }} className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 transition text-left">
                <FileText className="w-8 h-8 text-red-600" />
                <div>
                  <p className="font-medium text-gray-900">Transaction Passbook (PDF)</p>
                  <p className="text-xs text-gray-500">All transactions with running balance</p>
                </div>
              </button>
              <button onClick={() => { exportPLStatementPDF(); setShowExportModal(false); }} className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 transition text-left">
                <FileText className="w-8 h-8 text-red-600" />
                <div>
                  <p className="font-medium text-gray-900">P&L Statement (PDF)</p>
                  <p className="text-xs text-gray-500">Profit & Loss with category breakdown</p>
                </div>
              </button>
              <button onClick={() => { exportToExcel(); setShowExportModal(false); }} className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition text-left">
                <FileSpreadsheet className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Financial Report (Excel)</p>
                  <p className="text-xs text-gray-500">Complete data in spreadsheet format</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
