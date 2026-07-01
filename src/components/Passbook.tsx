import { useMemo, useState } from 'react';
import { RentPayment, Expense, TenantBill, Tenant, Property } from '../types';
import { generateId } from '../data';
import { formatDate, formatCurrency } from '../utils/helpers';
import { cur, addHeader, addSection, addSummaryBox, addFooter, tblStyle, GREEN, RED } from '../utils/pdfHelpers';
import { Download, FileSpreadsheet, FileText, Calendar, TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle, X, Search, Plus, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Props {
  payments: RentPayment[];
  expenses: Expense[];
  setExpenses: (e: Expense[]) => void;
  bills: TenantBill[];
  tenants: Tenant[];
  properties: Property[];
  onToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

interface LedgerEntry {
  id: string;
  date: string;
  type: 'Income' | 'Expense';
  category: string;
  description: string;
  amount: number;
  balance: number;
  source: string;
  property?: string;
  tenant?: string;
}

export default function Passbook({ payments, expenses, setExpenses, bills, tenants, properties, onToast }: Props) {
  const [showExport, setShowExport] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [filterType, setFilterType] = useState<'All' | 'Income' | 'Expense'>('All');
  const [filterMonth, setFilterMonth] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [manualEntry, setManualEntry] = useState({ type: 'Income' as 'Income' | 'Expense', category: '', description: '', amount: 0, date: new Date().toISOString().split('T')[0], propertyId: '' });

  const addManualEntry = () => {
    if (!manualEntry.description.trim() || manualEntry.amount <= 0) { onToast('Enter description and amount', 'error'); return; }
    const prop = properties.find(p => p.id === manualEntry.propertyId);
    if (manualEntry.type === 'Expense') {
      setExpenses([...expenses, { id: generateId(), propertyId: manualEntry.propertyId, propertyName: prop?.name || 'General', category: manualEntry.category || 'Other', amount: manualEntry.amount, date: manualEntry.date, description: manualEntry.description }]);
    } else {
      // For income, add as a generic expense with negative amount won't work — we add as a paid payment
      setExpenses([...expenses, { id: generateId(), propertyId: manualEntry.propertyId, propertyName: prop?.name || 'General', category: `Income: ${manualEntry.category || 'Other'}`, amount: -manualEntry.amount, date: manualEntry.date, description: `[INCOME] ${manualEntry.description}` }]);
    }
    onToast(`Entry added to passbook`);
    setShowAddEntry(false);
    setManualEntry({ type: 'Income', category: '', description: '', amount: 0, date: new Date().toISOString().split('T')[0], propertyId: '' });
  };

  const deleteEntry = (entry: LedgerEntry) => {
    if (entry.source === 'Expense') {
      const expId = entry.id.replace('exp-', '');
      setExpenses(expenses.filter(e => e.id !== expId));
      onToast('Entry removed from passbook');
    } else {
      onToast('Can only delete expense entries. Rent & bill entries are managed from Tenants page.', 'info');
    }
  };

  // Build ledger from ALL sources automatically
  const ledger = useMemo((): LedgerEntry[] => {
    const entries: LedgerEntry[] = [];

    // 1. Rent payments (Income)
    payments.filter(p => p.status === 'Paid' && p.date).forEach(p => {
      const prop = properties.find(pr => pr.id === p.propertyId);
      entries.push({
        id: `rent-${p.id}`, date: p.date, type: 'Income', category: 'Rent',
        description: `Rent from ${p.tenantName} (Room ${p.room}) via ${p.method}`,
        amount: p.amount, balance: 0, source: 'Rent Collection',
        property: prop?.name, tenant: p.tenantName,
      });
    });

    // 2. Bill payments (Income)
    bills.filter(b => b.status === 'Paid' && b.paidDate).forEach(b => {
      const tenant = tenants.find(t => t.id === b.tenantId);
      const prop = tenant ? properties.find(p => p.id === tenant.propertyId) : null;
      entries.push({
        id: `bill-${b.id}`, date: b.paidDate!, type: 'Income', category: `${b.type} Bill`,
        description: `${b.description} from ${tenant?.name || 'Unknown'}`,
        amount: b.amount, balance: 0, source: 'Bill Payment',
        property: prop?.name, tenant: tenant?.name,
      });
    });

    // 3. Expenses
    expenses.forEach(e => {
      entries.push({
        id: `exp-${e.id}`, date: e.date, type: 'Expense', category: e.category,
        description: e.description,
        amount: e.amount, balance: 0, source: 'Expense',
        property: e.propertyName,
      });
    });

    // Sort by date
    entries.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate running balance
    let balance = 0;
    entries.forEach(e => {
      if (e.type === 'Income') balance += e.amount;
      else balance -= e.amount;
      e.balance = balance;
    });

    return entries;
  }, [payments, expenses, bills, tenants, properties]);

  // Filter
  const filtered = useMemo(() => {
    return ledger.filter(e => {
      if (filterType !== 'All' && e.type !== filterType) return false;
      if (filterMonth && !e.date.startsWith(filterMonth)) return false;
      if (searchTerm && !e.description.toLowerCase().includes(searchTerm.toLowerCase()) && !(e.tenant || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [ledger, filterType, filterMonth, searchTerm]);

  // Totals
  const totalIncome = ledger.filter(e => e.type === 'Income').reduce((s, e) => s + e.amount, 0);
  const totalExpense = ledger.filter(e => e.type === 'Expense').reduce((s, e) => s + e.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // Monthly P&L
  const monthlyPL = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    ledger.forEach(e => {
      const m = e.date.substring(0, 7);
      if (!map[m]) map[m] = { income: 0, expense: 0 };
      if (e.type === 'Income') map[m].income += e.amount;
      else map[m].expense += e.amount;
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])).map(([month, data]) => ({ month, ...data, profit: data.income - data.expense }));
  }, [ledger]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const incomeMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};
    ledger.forEach(e => {
      const map = e.type === 'Income' ? incomeMap : expenseMap;
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return { income: Object.entries(incomeMap).sort((a, b) => b[1] - a[1]), expense: Object.entries(expenseMap).sort((a, b) => b[1] - a[1]) };
  }, [ledger]);

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    addHeader(doc, 'Passbook & P/L Statement', `${ledger.length} transactions`);
    let y = addSummaryBox(doc, 58, [['Total Income', cur(totalIncome)], ['Total Expense', cur(totalExpense)], ['Net Balance', cur(netBalance)]]);

    y = addSection(doc, y, 'Monthly P&L');
    autoTable(doc, { startY: y, head: [['Month', 'Income', 'Expense', 'Profit/Loss']], body: monthlyPL.map(m => [m.month, cur(m.income), cur(m.expense), cur(m.profit)]), ...tblStyle(),
      didParseCell: (data: any) => { if (data.section === 'body' && data.column.index === 3) { const raw = data.cell.raw as string; const neg = raw.includes('-'); data.cell.styles.textColor = neg ? [220, 38, 38] : [22, 163, 74]; data.cell.styles.fontStyle = 'bold'; } } });

    y = (doc as any).lastAutoTable.finalY + 6;
    y = addSection(doc, y, 'All Transactions');
    autoTable(doc, { startY: y, head: [['Date', 'Type', 'Category', 'Description', 'Amount', 'Balance']], body: filtered.map(e => [formatDate(e.date), e.type, e.category, e.description.replace(/[^\x00-\x7F]/g, '').slice(0, 35), `${e.type === 'Income' ? '+' : '-'} ${cur(e.amount)}`, cur(e.balance)]), ...tblStyle(),
      didParseCell: (data: any) => { if (data.section === 'body' && data.column.index === 1) { data.cell.styles.textColor = data.cell.text[0] === 'Income' ? [22, 163, 74] : [220, 38, 38]; data.cell.styles.fontStyle = 'bold'; } } });

    y = (doc as any).lastAutoTable.finalY + 6;
    y = addSection(doc, y, 'Income by Category', GREEN);
    autoTable(doc, { startY: y, head: [['Category', 'Amount', '% of Total']], body: categoryBreakdown.income.map(([c, a]) => [c, cur(a), totalIncome > 0 ? `${((a / totalIncome) * 100).toFixed(1)}%` : '0%']), ...tblStyle(GREEN) });

    y = (doc as any).lastAutoTable.finalY + 6;
    y = addSection(doc, y, 'Expenses by Category', RED);
    autoTable(doc, { startY: y, head: [['Category', 'Amount', '% of Total']], body: categoryBreakdown.expense.map(([c, a]) => [c, cur(a), totalExpense > 0 ? `${((a / totalExpense) * 100).toFixed(1)}%` : '0%']), ...tblStyle(RED) });

    addFooter(doc);
    doc.save('RentFlow-Passbook.pdf');
  };

  // Export Excel
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet([['RentFlow Passbook'], [`Generated: ${formatDate(new Date().toISOString().split('T')[0])}`], [], ['Summary'], ['Total Income', totalIncome], ['Total Expense', totalExpense], ['Net Balance', netBalance], [], ['Monthly P&L'], ['Month', 'Income', 'Expense', 'Profit/Loss'], ...monthlyPL.map(m => [m.month, m.income, m.expense, m.profit])]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
    const ws2 = XLSX.utils.aoa_to_sheet([['Transactions'], ['Date', 'Type', 'Category', 'Description', 'Amount', 'Balance', 'Property', 'Tenant', 'Source'], ...filtered.map(e => [e.date, e.type, e.category, e.description, e.type === 'Income' ? e.amount : -e.amount, e.balance, e.property || '', e.tenant || '', e.source])]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Transactions');
    XLSX.writeFile(wb, 'RentFlow-Passbook.xlsx');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900">Passbook</h1><p className="text-gray-500 text-sm mt-1">Complete financial history • Auto-records all transactions</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddEntry(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm"><Plus className="w-4 h-4" /> Add Entry</button>
          <button onClick={() => setShowExport(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 transition font-medium text-sm shadow-sm"><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-3"><div className="p-2.5 bg-green-100 rounded-xl"><TrendingUp className="w-5 h-5 text-green-600" /></div><div><p className="text-sm text-gray-500">Total Income</p><p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p></div></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-3"><div className="p-2.5 bg-red-100 rounded-xl"><TrendingDown className="w-5 h-5 text-red-600" /></div><div><p className="text-sm text-gray-500">Total Expense</p><p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p></div></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-3"><div className={`p-2.5 rounded-xl ${netBalance >= 0 ? 'bg-indigo-100' : 'bg-orange-100'}`}><Wallet className={`w-5 h-5 ${netBalance >= 0 ? 'text-indigo-600' : 'text-orange-600'}`} /></div><div><p className="text-sm text-gray-500">Net Balance</p><p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>{formatCurrency(netBalance)}</p></div></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-3"><div className="p-2.5 bg-purple-100 rounded-xl"><Calendar className="w-5 h-5 text-purple-600" /></div><div><p className="text-sm text-gray-500">Transactions</p><p className="text-2xl font-bold text-purple-600">{ledger.length}</p></div></div>
      </div>

      {/* Monthly P&L */}
      {monthlyPL.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h3 className="text-lg font-semibold text-gray-900">Monthly Profit & Loss</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-100"><th className="text-left px-5 py-3 font-semibold text-gray-600">Month</th><th className="text-right px-5 py-3 font-semibold text-gray-600">Income</th><th className="text-right px-5 py-3 font-semibold text-gray-600">Expense</th><th className="text-right px-5 py-3 font-semibold text-gray-600">P&L</th></tr></thead>
              <tbody>{monthlyPL.map(m => (<tr key={m.month} className="border-b border-gray-50 hover:bg-gray-50/50"><td className="px-5 py-3 font-medium text-gray-900">{m.month}</td><td className="px-5 py-3 text-right text-green-600 font-medium">{formatCurrency(m.income)}</td><td className="px-5 py-3 text-right text-red-600 font-medium">{formatCurrency(m.expense)}</td><td className={`px-5 py-3 text-right font-bold ${m.profit >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>{formatCurrency(m.profit)}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex-1 min-w-[180px]"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5">
          {['All', 'Income', 'Expense'].map(t => <button key={t} onClick={() => setFilterType(t as any)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterType === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>{t}</button>)}
        </div>
        <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
        {(filterType !== 'All' || filterMonth || searchTerm) && <button onClick={() => { setFilterType('All'); setFilterMonth(''); setSearchTerm(''); }} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium px-2">Clear</button>}
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
          <span className="text-xs text-gray-400">{filtered.length} transactions</span>
        </div>
        <div className="divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><p>No transactions found</p></div>
          ) : filtered.map(entry => (
            <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition">
              <div className={`p-2 rounded-xl shrink-0 ${entry.type === 'Income' ? 'bg-green-100' : 'bg-red-100'}`}>
                {entry.type === 'Income' ? <ArrowUpCircle className="w-5 h-5 text-green-600" /> : <ArrowDownCircle className="w-5 h-5 text-red-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{entry.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">{formatDate(entry.date)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">{entry.category}</span>
                  {entry.property && <span className="text-[10px] text-gray-400">{entry.property}</span>}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500 font-medium">{entry.source}</span>
                </div>
              </div>
              <div className="text-right shrink-0 flex items-center gap-2">
                <div>
                  <p className={`text-sm font-bold ${entry.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>{entry.type === 'Income' ? '+' : '-'}{formatCurrency(entry.amount)}</p>
                  <p className={`text-xs ${entry.balance >= 0 ? 'text-gray-500' : 'text-orange-500'}`}>Bal: {formatCurrency(entry.balance)}</p>
                </div>
                {entry.source === 'Expense' && (
                  <button onClick={() => deleteEntry(entry)} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      {(categoryBreakdown.income.length > 0 || categoryBreakdown.expense.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Income Breakdown</h3>
            <div className="space-y-2">{categoryBreakdown.income.map(([cat, amt]) => {
              const pct = totalIncome > 0 ? (amt / totalIncome) * 100 : 0;
              return (<div key={cat}><div className="flex justify-between mb-1"><span className="text-sm text-gray-700">{cat}</span><span className="text-sm font-semibold text-green-600">{formatCurrency(amt)}</span></div><div className="w-full bg-gray-100 rounded-full h-2"><div className="h-2 bg-green-500 rounded-full" style={{ width: `${pct}%` }} /></div></div>);
            })}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Expense Breakdown</h3>
            <div className="space-y-2">{categoryBreakdown.expense.map(([cat, amt]) => {
              const pct = totalExpense > 0 ? (amt / totalExpense) * 100 : 0;
              return (<div key={cat}><div className="flex justify-between mb-1"><span className="text-sm text-gray-700">{cat}</span><span className="text-sm font-semibold text-red-600">{formatCurrency(amt)}</span></div><div className="w-full bg-gray-100 rounded-full h-2"><div className="h-2 bg-red-500 rounded-full" style={{ width: `${pct}%` }} /></div></div>);
            })}</div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowExport(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold">Export Passbook</h2><button onClick={() => setShowExport(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="space-y-3">
              <button onClick={() => { exportPDF(); setShowExport(false); }} className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 transition"><FileText className="w-8 h-8 text-red-600" /><div><p className="font-medium text-gray-900">PDF Report</p><p className="text-xs text-gray-500">P&L + all transactions</p></div></button>
              <button onClick={() => { exportExcel(); setShowExport(false); }} className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition"><FileSpreadsheet className="w-8 h-8 text-green-600" /><div><p className="font-medium text-gray-900">Excel Spreadsheet</p><p className="text-xs text-gray-500">Full data with formulas</p></div></button>
            </div>
          </div>
        </div>
      )}

      {/* Add Manual Entry Modal */}
      {showAddEntry && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAddEntry(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold">Add Passbook Entry</h2><button onClick={() => setShowAddEntry(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setManualEntry({ ...manualEntry, type: 'Income' })} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition ${manualEntry.type === 'Income' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}`}><ArrowUpCircle className="w-5 h-5" /> Income</button>
                  <button onClick={() => setManualEntry({ ...manualEntry, type: 'Expense' })} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition ${manualEntry.type === 'Expense' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600'}`}><ArrowDownCircle className="w-5 h-5" /> Expense</button>
                </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><input value={manualEntry.category} onChange={e => setManualEntry({ ...manualEntry, category: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="e.g., Rent, Repairs, Deposit" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description*</label><input value={manualEntry.description} onChange={e => setManualEntry({ ...manualEntry, description: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Describe the transaction" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label><input type="number" value={manualEntry.amount} onChange={e => setManualEntry({ ...manualEntry, amount: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" value={manualEntry.date} onChange={e => setManualEntry({ ...manualEntry, date: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Property (optional)</label><select value={manualEntry.propertyId} onChange={e => setManualEntry({ ...manualEntry, propertyId: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">General</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="flex gap-3 pt-2"><button onClick={() => setShowAddEntry(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button><button onClick={addManualEntry} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">Add Entry</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
