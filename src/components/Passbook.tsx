import { useMemo, useState } from 'react';
import { RentPayment, Expense, TenantBill, Tenant, Property } from '../types';
import { formatDate, formatCurrency } from '../utils/helpers';
import { Download, FileSpreadsheet, FileText, Calendar, TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle, X, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Props {
  payments: RentPayment[];
  expenses: Expense[];
  bills: TenantBill[];
  tenants: Tenant[];
  properties: Property[];
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

export default function Passbook({ payments, expenses, bills, tenants, properties }: Props) {
  const [showExport, setShowExport] = useState(false);
  const [filterType, setFilterType] = useState<'All' | 'Income' | 'Expense'>('All');
  const [filterMonth, setFilterMonth] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
    const pw = doc.internal.pageSize.getWidth();
    doc.setFontSize(20); doc.setTextColor(99, 102, 241); doc.text('RentFlow', 14, 20);
    doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text('Complete Passbook & P&L Statement', 14, 30);
    doc.setFontSize(10); doc.setTextColor(128, 128, 128); doc.text(`Generated: ${formatDate(new Date().toISOString().split('T')[0])}`, 14, 38);

    autoTable(doc, { startY: 45, head: [['', 'Amount (₹)']], body: [['Total Income', totalIncome.toLocaleString()], ['Total Expense', `(${totalExpense.toLocaleString()})`], ['Net Balance', netBalance.toLocaleString()]], theme: 'striped', headStyles: { fillColor: [99, 102, 241] } });

    let y = (doc as any).lastAutoTable.finalY + 10;
    doc.text('Monthly P&L', 14, y);
    autoTable(doc, { startY: y + 4, head: [['Month', 'Income', 'Expense', 'Profit/Loss']], body: monthlyPL.map(m => [m.month, m.income.toLocaleString(), m.expense.toLocaleString(), m.profit.toLocaleString()]), theme: 'striped', headStyles: { fillColor: [99, 102, 241] } });

    y = (doc as any).lastAutoTable.finalY + 10;
    doc.text('All Transactions', 14, y);
    autoTable(doc, { startY: y + 4, head: [['Date', 'Type', 'Category', 'Description', 'Amount', 'Balance']], body: filtered.map(e => [formatDate(e.date), e.type, e.category, e.description.slice(0, 40), `${e.type === 'Income' ? '+' : '-'}${e.amount.toLocaleString()}`, e.balance.toLocaleString()]), theme: 'striped', headStyles: { fillColor: [99, 102, 241] }, styles: { fontSize: 7 } });

    y = (doc as any).lastAutoTable.finalY + 10;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.text('Income by Category', 14, y);
    autoTable(doc, { startY: y + 4, head: [['Category', 'Amount']], body: categoryBreakdown.income.map(([c, a]) => [c, a.toLocaleString()]), theme: 'striped', headStyles: { fillColor: [34, 197, 94] } });

    y = (doc as any).lastAutoTable.finalY + 8;
    doc.text('Expenses by Category', 14, y);
    autoTable(doc, { startY: y + 4, head: [['Category', 'Amount']], body: categoryBreakdown.expense.map(([c, a]) => [c, a.toLocaleString()]), theme: 'striped', headStyles: { fillColor: [239, 68, 68] } });

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(128, 128, 128); doc.text(`Page ${i}/${pages} | RentFlow Passbook`, pw / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' }); }
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
        <button onClick={() => setShowExport(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 transition font-medium text-sm shadow-sm"><Download className="w-4 h-4" /> Export Report</button>
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
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold ${entry.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>{entry.type === 'Income' ? '+' : '-'}{formatCurrency(entry.amount)}</p>
                <p className={`text-xs ${entry.balance >= 0 ? 'text-gray-500' : 'text-orange-500'}`}>Bal: {formatCurrency(entry.balance)}</p>
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
    </div>
  );
}
