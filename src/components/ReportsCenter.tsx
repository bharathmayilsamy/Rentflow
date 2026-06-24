import { useState } from 'react';
import { RentPayment, Expense, TenantBill, Tenant, Property } from '../types';
import { formatDate, getOrdinal } from '../utils/helpers';
import { FileText, FileSpreadsheet, Users, User, Calendar, TrendingUp, Receipt, Wallet, Download, ChevronRight } from 'lucide-react';
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

type ReportType = 'all-tenants' | 'tenant-wise' | 'monthly' | 'last6months' | 'pnl' | 'transactions' | 'bills' | 'collection';

const REPORT_CARDS: { key: ReportType; title: string; desc: string; icon: any; color: string }[] = [
  { key: 'all-tenants', title: 'All Tenants Report', desc: 'Complete tenant details with rent, deposits, dues, payments', icon: Users, color: 'bg-indigo-100 text-indigo-600' },
  { key: 'tenant-wise', title: 'Tenant-wise Report', desc: 'Select a tenant and generate detailed history', icon: User, color: 'bg-purple-100 text-purple-600' },
  { key: 'monthly', title: 'Monthly Report', desc: 'Income and expenses for a selected month', icon: Calendar, color: 'bg-blue-100 text-blue-600' },
  { key: 'last6months', title: 'Last 6 Months Report', desc: 'Trends and summary for the past 6 months', icon: TrendingUp, color: 'bg-green-100 text-green-600' },
  { key: 'pnl', title: 'Profit & Loss Report', desc: 'Revenue vs expenses with category breakdown', icon: Wallet, color: 'bg-emerald-100 text-emerald-600' },
  { key: 'transactions', title: 'Transactions Report', desc: 'All income and expense transactions', icon: Receipt, color: 'bg-orange-100 text-orange-600' },
  { key: 'bills', title: 'Bills Report', desc: 'All tenant bills - paid and pending', icon: FileText, color: 'bg-amber-100 text-amber-600' },
  { key: 'collection', title: 'Collection Report', desc: 'Rent collection history with receipts', icon: Download, color: 'bg-cyan-100 text-cyan-600' },
];

// PDF helper - strip unicode for jsPDF compatibility
const clean = (s: string) => s.replace(/[^\x00-\x7F]/g, '').replace(/Rs\./g, 'Rs ');
const pdfCurrency = (n: number) => `Rs ${n.toLocaleString('en-IN')}`;
const pdfFooter = (doc: jsPDF) => {
  const pw = doc.internal.pageSize.getWidth();
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(128, 128, 128); doc.text(`Page ${i}/${pages} | RentFlow Reports`, pw / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' }); }
};
const pdfHeader = (doc: jsPDF, title: string) => {
  doc.setFontSize(18); doc.setTextColor(99, 102, 241); doc.text('RentFlow', 14, 18);
  doc.setFontSize(13); doc.setTextColor(0, 0, 0); doc.text(title, 14, 28);
  doc.setFontSize(9); doc.setTextColor(128, 128, 128); doc.text(`Generated: ${formatDate(new Date().toISOString().split('T')[0])}`, 14, 35);
};

export default function ReportsCenter({ payments, expenses, bills, tenants, properties }: Props) {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Helper data
  const getTenantData = (t: Tenant) => {
    const tp = payments.filter(p => p.tenantId === t.id);
    const tb = bills.filter(b => b.tenantId === t.id);
    const prop = properties.find(p => p.id === t.propertyId);
    const totalPaid = tp.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
    const totalDue = tp.filter(p => p.status !== 'Paid').reduce((s, p) => s + (p.dueAmount - p.amount), 0);
    const billsPaid = tb.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);
    const billsPending = tb.filter(b => b.status === 'Pending').reduce((s, b) => s + b.amount, 0);
    const totalInvoice = tp.reduce((s, p) => s + p.dueAmount, 0) + tb.reduce((s, b) => s + b.amount, 0);
    const rentAdded = tp.reduce((s, p) => s + p.dueAmount, 0);
    return { prop, tp, tb, totalPaid, totalDue, billsPaid, billsPending, totalInvoice, rentAdded };
  };

  // ALL TENANTS REPORT
  const generateAllTenants = (format: 'pdf' | 'excel') => {
    const rows = tenants.map(t => {
      const d = getTenantData(t);
      return [t.name, t.phone || '-', t.status, t.room || '-', d.prop?.name || '-', formatDate(t.leaseStart),
        getOrdinal(t.dueDay || 1), pdfCurrency(t.deposit), pdfCurrency(t.deposit),
        `${getOrdinal(t.dueDay || 1)}`, pdfCurrency(d.totalInvoice), pdfCurrency(d.totalPaid),
        pdfCurrency(d.totalDue), pdfCurrency(d.rentAdded), pdfCurrency(d.totalPaid),
        pdfCurrency(d.billsPaid + d.billsPending)];
    });
    const headers = ['Name', 'Phone', 'Status', 'Room', 'Property', 'Move-in', 'Rent Date', 'Security Deposit', 'Current Deposit', 'Due Day', 'Total Invoice', 'Total Paid', 'Pending', 'Rent Added', 'Rent Paid', 'Bills'];

    if (format === 'pdf') {
      const doc = new jsPDF('landscape');
      pdfHeader(doc, 'All Tenants Report');
      autoTable(doc, { startY: 40, head: [headers], body: rows, theme: 'striped', headStyles: { fillColor: [99, 102, 241], fontSize: 6 }, styles: { fontSize: 6, cellPadding: 2 } });
      pdfFooter(doc); doc.save('all-tenants-report.pdf');
    } else {
      const ws = XLSX.utils.aoa_to_sheet([['RentFlow - All Tenants Report'], [`Generated: ${formatDate(new Date().toISOString().split('T')[0])}`], [], headers, ...tenants.map(t => { const d = getTenantData(t); return [t.name, t.phone, t.status, t.room, d.prop?.name, t.leaseStart, t.dueDay, t.deposit, t.deposit, t.dueDay, d.totalInvoice, d.totalPaid, d.totalDue, d.rentAdded, d.totalPaid, d.billsPaid + d.billsPending]; })]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Tenants'); XLSX.writeFile(wb, 'all-tenants-report.xlsx');
    }
  };

  // TENANT-WISE REPORT
  const generateTenantWise = (format: 'pdf' | 'excel') => {
    const t = tenants.find(t => t.id === selectedTenantId);
    if (!t) return;
    const d = getTenantData(t);

    if (format === 'pdf') {
      const doc = new jsPDF();
      pdfHeader(doc, `${clean(t.name)} - Detailed Report`);
      autoTable(doc, { startY: 40, body: [['Name', t.name], ['Phone', t.phone || '-'], ['Property', d.prop?.name || '-'], ['Room', t.room || '-'], ['Rent', pdfCurrency(t.rent)], ['Deposit', pdfCurrency(t.deposit)], ['Joined', formatDate(t.leaseStart)], ['Lease End', formatDate(t.leaseEnd)], ['Due Day', `${getOrdinal(t.dueDay || 1)} monthly`], ['Status', t.status], ['EB No', t.ebConsumerNo || '-'], ['Water No', t.waterBillNo || '-'], ['Tax No', t.propertyTaxNo || '-']], theme: 'plain', styles: { fontSize: 10 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 } } });
      let y = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(12); doc.text('Financial Summary', 14, y);
      autoTable(doc, { startY: y + 4, head: [['', 'Amount']], body: [['Rent Paid', pdfCurrency(d.totalPaid)], ['Rent Pending', pdfCurrency(d.totalDue)], ['Bills Paid', pdfCurrency(d.billsPaid)], ['Bills Pending', pdfCurrency(d.billsPending)], ['Total Invoice', pdfCurrency(d.totalInvoice)], ['Outstanding', pdfCurrency(d.totalDue + d.billsPending)]], theme: 'striped', headStyles: { fillColor: [99, 102, 241] } });
      y = (doc as any).lastAutoTable.finalY + 8; doc.text('Rent Payments', 14, y);
      autoTable(doc, { startY: y + 4, head: [['Due Date', 'Due Amt', 'Paid', 'Paid Date', 'Method', 'Status', 'Receipt']], body: d.tp.map(p => [formatDate(p.dueDate), pdfCurrency(p.dueAmount), pdfCurrency(p.amount), p.date ? formatDate(p.date) : '-', p.method, p.status, p.receiptNo || '-']), theme: 'striped', headStyles: { fillColor: [99, 102, 241] }, styles: { fontSize: 8 } });
      if (d.tb.length > 0) { y = (doc as any).lastAutoTable.finalY + 8; doc.text('Bills', 14, y); autoTable(doc, { startY: y + 4, head: [['Type', 'Description', 'Amount', 'Due', 'Paid', 'Status']], body: d.tb.map(b => [b.type, b.description, pdfCurrency(b.amount), formatDate(b.dueDate), b.paidDate ? formatDate(b.paidDate) : '-', b.status]), theme: 'striped', headStyles: { fillColor: [34, 197, 94] }, styles: { fontSize: 8 } }); }
      pdfFooter(doc); doc.save(`${t.name.replace(/\s+/g, '-')}-report.pdf`);
    } else {
      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.aoa_to_sheet([['Tenant Report - ' + t.name], [], ['Name', t.name], ['Phone', t.phone], ['Property', d.prop?.name], ['Room', t.room], ['Rent', t.rent], ['Deposit', t.deposit], ['Joined', t.leaseStart], ['Status', t.status], [], ['Summary'], ['Rent Paid', d.totalPaid], ['Rent Pending', d.totalDue], ['Bills Paid', d.billsPaid], ['Bills Pending', d.billsPending], ['Total Invoice', d.totalInvoice]]);
      XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
      const ws2 = XLSX.utils.aoa_to_sheet([['Payments'], ['Due Date', 'Due', 'Paid', 'Date', 'Method', 'Status', 'Receipt'], ...d.tp.map(p => [p.dueDate, p.dueAmount, p.amount, p.date || '-', p.method, p.status, p.receiptNo || '-'])]);
      XLSX.utils.book_append_sheet(wb, ws2, 'Payments');
      const ws3 = XLSX.utils.aoa_to_sheet([['Bills'], ['Type', 'Description', 'Amount', 'Due', 'Paid', 'Status'], ...d.tb.map(b => [b.type, b.description, b.amount, b.dueDate, b.paidDate || '-', b.status])]);
      XLSX.utils.book_append_sheet(wb, ws3, 'Bills');
      XLSX.writeFile(wb, `${t.name.replace(/\s+/g, '-')}-report.xlsx`);
    }
  };

  // MONTHLY REPORT
  const generateMonthly = (format: 'pdf' | 'excel') => {
    const mp = payments.filter(p => p.status === 'Paid' && p.date?.startsWith(selectedMonth));
    const me = expenses.filter(e => e.date?.startsWith(selectedMonth));
    const mb = bills.filter(b => b.status === 'Paid' && b.paidDate?.startsWith(selectedMonth));
    const income = mp.reduce((s, p) => s + p.amount, 0) + mb.reduce((s, b) => s + b.amount, 0);
    const exp = me.reduce((s, e) => s + e.amount, 0);

    if (format === 'pdf') {
      const doc = new jsPDF();
      pdfHeader(doc, `Monthly Report - ${selectedMonth}`);
      autoTable(doc, { startY: 40, head: [['', 'Amount']], body: [['Rent Collected', pdfCurrency(mp.reduce((s, p) => s + p.amount, 0))], ['Bills Collected', pdfCurrency(mb.reduce((s, b) => s + b.amount, 0))], ['Total Income', pdfCurrency(income)], ['Total Expenses', pdfCurrency(exp)], ['Net Profit', pdfCurrency(income - exp)]], theme: 'striped', headStyles: { fillColor: [99, 102, 241] } });
      let y = (doc as any).lastAutoTable.finalY + 8; doc.text('Rent Collections', 14, y);
      autoTable(doc, { startY: y + 4, head: [['Tenant', 'Room', 'Amount', 'Date', 'Method', 'Receipt']], body: mp.map(p => [p.tenantName, p.room, pdfCurrency(p.amount), formatDate(p.date), p.method, p.receiptNo || '-']), theme: 'striped', headStyles: { fillColor: [34, 197, 94] }, styles: { fontSize: 8 } });
      if (me.length > 0) { y = (doc as any).lastAutoTable.finalY + 8; doc.text('Expenses', 14, y); autoTable(doc, { startY: y + 4, head: [['Date', 'Property', 'Category', 'Description', 'Amount']], body: me.map(e => [formatDate(e.date), e.propertyName, e.category, e.description, pdfCurrency(e.amount)]), theme: 'striped', headStyles: { fillColor: [239, 68, 68] }, styles: { fontSize: 8 } }); }
      pdfFooter(doc); doc.save(`monthly-report-${selectedMonth}.pdf`);
    } else {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([[`Monthly Report - ${selectedMonth}`], [], ['Summary'], ['Rent Collected', mp.reduce((s, p) => s + p.amount, 0)], ['Bills Collected', mb.reduce((s, b) => s + b.amount, 0)], ['Total Income', income], ['Total Expenses', exp], ['Net', income - exp], [], ['Collections'], ['Tenant', 'Room', 'Amount', 'Date', 'Method'], ...mp.map(p => [p.tenantName, p.room, p.amount, p.date, p.method]), [], ['Expenses'], ['Date', 'Property', 'Category', 'Description', 'Amount'], ...me.map(e => [e.date, e.propertyName, e.category, e.description, e.amount])]);
      XLSX.utils.book_append_sheet(wb, ws, 'Report'); XLSX.writeFile(wb, `monthly-report-${selectedMonth}.xlsx`);
    }
  };

  // LAST 6 MONTHS
  const generateLast6Months = (format: 'pdf' | 'excel') => {
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); months.push(d.toISOString().slice(0, 7)); }
    const data = months.map(m => {
      const inc = payments.filter(p => p.status === 'Paid' && p.date?.startsWith(m)).reduce((s, p) => s + p.amount, 0) + bills.filter(b => b.status === 'Paid' && b.paidDate?.startsWith(m)).reduce((s, b) => s + b.amount, 0);
      const exp = expenses.filter(e => e.date?.startsWith(m)).reduce((s, e) => s + e.amount, 0);
      return { month: m, income: inc, expense: exp, net: inc - exp };
    });
    if (format === 'pdf') {
      const doc = new jsPDF(); pdfHeader(doc, 'Last 6 Months Report');
      autoTable(doc, { startY: 40, head: [['Month', 'Income', 'Expense', 'Net P/L']], body: data.map(d => [d.month, pdfCurrency(d.income), pdfCurrency(d.expense), pdfCurrency(d.net)]), theme: 'striped', headStyles: { fillColor: [99, 102, 241] } });
      const totalInc = data.reduce((s, d) => s + d.income, 0); const totalExp = data.reduce((s, d) => s + d.expense, 0);
      let y = (doc as any).lastAutoTable.finalY + 8; doc.text('Totals', 14, y);
      autoTable(doc, { startY: y + 4, body: [['Total Income', pdfCurrency(totalInc)], ['Total Expense', pdfCurrency(totalExp)], ['Net Profit/Loss', pdfCurrency(totalInc - totalExp)]], theme: 'plain', styles: { fontSize: 11 }, columnStyles: { 0: { fontStyle: 'bold' } } });
      pdfFooter(doc); doc.save('last-6-months-report.pdf');
    } else {
      const ws = XLSX.utils.aoa_to_sheet([['Last 6 Months Report'], [], ['Month', 'Income', 'Expense', 'Net'], ...data.map(d => [d.month, d.income, d.expense, d.net])]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Report'); XLSX.writeFile(wb, 'last-6-months-report.xlsx');
    }
  };

  // P&L REPORT
  const generatePnL = (format: 'pdf' | 'excel') => {
    const totalIncome = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0) + bills.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);
    const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
    const incCat: Record<string, number> = {}; const expCat: Record<string, number> = {};
    payments.filter(p => p.status === 'Paid').forEach(p => { incCat['Rent'] = (incCat['Rent'] || 0) + p.amount; });
    bills.filter(b => b.status === 'Paid').forEach(b => { incCat[b.type] = (incCat[b.type] || 0) + b.amount; });
    expenses.forEach(e => { expCat[e.category] = (expCat[e.category] || 0) + e.amount; });

    if (format === 'pdf') {
      const doc = new jsPDF(); pdfHeader(doc, 'Profit & Loss Statement');
      autoTable(doc, { startY: 40, head: [['', 'Amount']], body: [['Total Revenue', pdfCurrency(totalIncome)], ['Total Expenses', `(${pdfCurrency(totalExp)})`], ['Net Profit/Loss', pdfCurrency(totalIncome - totalExp)]], theme: 'striped', headStyles: { fillColor: [99, 102, 241] } });
      let y = (doc as any).lastAutoTable.finalY + 8; doc.text('Income Breakdown', 14, y);
      autoTable(doc, { startY: y + 4, head: [['Category', 'Amount']], body: Object.entries(incCat).map(([k, v]) => [k, pdfCurrency(v)]), theme: 'striped', headStyles: { fillColor: [34, 197, 94] } });
      y = (doc as any).lastAutoTable.finalY + 8; doc.text('Expense Breakdown', 14, y);
      autoTable(doc, { startY: y + 4, head: [['Category', 'Amount']], body: Object.entries(expCat).map(([k, v]) => [k, pdfCurrency(v)]), theme: 'striped', headStyles: { fillColor: [239, 68, 68] } });
      pdfFooter(doc); doc.save('profit-loss-report.pdf');
    } else {
      const ws = XLSX.utils.aoa_to_sheet([['P&L Statement'], [], ['Revenue', totalIncome], ['Expenses', totalExp], ['Net', totalIncome - totalExp], [], ['Income by Category'], ...Object.entries(incCat).map(([k, v]) => [k, v]), [], ['Expenses by Category'], ...Object.entries(expCat).map(([k, v]) => [k, v])]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'PnL'); XLSX.writeFile(wb, 'profit-loss-report.xlsx');
    }
  };

  // TRANSACTIONS
  const generateTransactions = (format: 'pdf' | 'excel') => {
    const entries: { date: string; type: string; desc: string; amount: number }[] = [];
    payments.filter(p => p.status === 'Paid' && p.date).forEach(p => entries.push({ date: p.date, type: 'Income', desc: `Rent - ${p.tenantName} (${p.room})`, amount: p.amount }));
    bills.filter(b => b.status === 'Paid' && b.paidDate).forEach(b => { const t = tenants.find(t => t.id === b.tenantId); entries.push({ date: b.paidDate!, type: 'Income', desc: `${b.type} - ${t?.name || ''}`, amount: b.amount }); });
    expenses.forEach(e => entries.push({ date: e.date, type: 'Expense', desc: e.description, amount: e.amount }));
    entries.sort((a, b) => a.date.localeCompare(b.date));

    if (format === 'pdf') {
      const doc = new jsPDF(); pdfHeader(doc, 'Transaction Report');
      autoTable(doc, { startY: 40, head: [['Date', 'Type', 'Description', 'Amount']], body: entries.map(e => [formatDate(e.date), e.type, clean(e.desc), pdfCurrency(e.amount)]), theme: 'striped', headStyles: { fillColor: [99, 102, 241] }, styles: { fontSize: 8 } });
      pdfFooter(doc); doc.save('transactions-report.pdf');
    } else {
      const ws = XLSX.utils.aoa_to_sheet([['Transactions'], ['Date', 'Type', 'Description', 'Amount'], ...entries.map(e => [e.date, e.type, e.desc, e.type === 'Income' ? e.amount : -e.amount])]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Transactions'); XLSX.writeFile(wb, 'transactions-report.xlsx');
    }
  };

  // BILLS REPORT
  const generateBills = (format: 'pdf' | 'excel') => {
    const rows = bills.map(b => { const t = tenants.find(t => t.id === b.tenantId); return [t?.name || '-', b.type, b.description, pdfCurrency(b.amount), formatDate(b.dueDate), b.paidDate ? formatDate(b.paidDate) : '-', b.status]; });
    if (format === 'pdf') {
      const doc = new jsPDF(); pdfHeader(doc, 'Bills Report');
      autoTable(doc, { startY: 40, head: [['Tenant', 'Type', 'Description', 'Amount', 'Due', 'Paid', 'Status']], body: rows, theme: 'striped', headStyles: { fillColor: [99, 102, 241] }, styles: { fontSize: 8 } });
      pdfFooter(doc); doc.save('bills-report.pdf');
    } else {
      const ws = XLSX.utils.aoa_to_sheet([['Bills Report'], ['Tenant', 'Type', 'Description', 'Amount', 'Due Date', 'Paid Date', 'Status'], ...bills.map(b => { const t = tenants.find(t => t.id === b.tenantId); return [t?.name, b.type, b.description, b.amount, b.dueDate, b.paidDate || '-', b.status]; })]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Bills'); XLSX.writeFile(wb, 'bills-report.xlsx');
    }
  };

  // COLLECTION REPORT
  const generateCollection = (format: 'pdf' | 'excel') => {
    const paid = payments.filter(p => p.status === 'Paid').sort((a, b) => b.date.localeCompare(a.date));
    if (format === 'pdf') {
      const doc = new jsPDF(); pdfHeader(doc, 'Collection Report');
      doc.setFontSize(11); doc.text(`Total Collected: ${pdfCurrency(paid.reduce((s, p) => s + p.amount, 0))}`, 14, 40);
      autoTable(doc, { startY: 46, head: [['Tenant', 'Room', 'Amount', 'Date', 'Method', 'Receipt']], body: paid.map(p => [p.tenantName, p.room, pdfCurrency(p.amount), formatDate(p.date), p.method, p.receiptNo || '-']), theme: 'striped', headStyles: { fillColor: [34, 197, 94] }, styles: { fontSize: 8 } });
      pdfFooter(doc); doc.save('collection-report.pdf');
    } else {
      const ws = XLSX.utils.aoa_to_sheet([['Collection Report'], ['Tenant', 'Room', 'Amount', 'Date', 'Method', 'Receipt'], ...paid.map(p => [p.tenantName, p.room, p.amount, p.date, p.method, p.receiptNo || '-'])]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Collections'); XLSX.writeFile(wb, 'collection-report.xlsx');
    }
  };

  // Dispatch generator
  const generate = (type: ReportType, format: 'pdf' | 'excel') => {
    switch (type) {
      case 'all-tenants': generateAllTenants(format); break;
      case 'tenant-wise': generateTenantWise(format); break;
      case 'monthly': generateMonthly(format); break;
      case 'last6months': generateLast6Months(format); break;
      case 'pnl': generatePnL(format); break;
      case 'transactions': generateTransactions(format); break;
      case 'bills': generateBills(format); break;
      case 'collection': generateCollection(format); break;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports Center</h1>
        <p className="text-gray-500 text-sm mt-1">Generate and export detailed reports</p>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {REPORT_CARDS.map(r => (
          <button key={r.key} onClick={() => setSelectedReport(r.key)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${selectedReport === r.key ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${r.color}`}><r.icon className="w-5 h-5" /></div>
              <ChevronRight className={`w-4 h-4 ml-auto ${selectedReport === r.key ? 'text-indigo-500' : 'text-gray-300'}`} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">{r.title}</h3>
            <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
          </button>
        ))}
      </div>

      {/* Generate Panel */}
      {selectedReport && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{REPORT_CARDS.find(r => r.key === selectedReport)?.title}</h3>

          {/* Extra inputs for specific reports */}
          {selectedReport === 'tenant-wise' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Tenant</label>
              <select value={selectedTenantId} onChange={e => setSelectedTenantId(e.target.value)} className="w-full max-w-md border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">Choose a tenant...</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name} - Room {t.room || '-'}</option>)}
              </select>
            </div>
          )}
          {selectedReport === 'monthly' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
              <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full max-w-md border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          )}

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-3">
            <button onClick={() => generate(selectedReport, 'pdf')} disabled={selectedReport === 'tenant-wise' && !selectedTenantId}
              className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 px-5 py-3 rounded-xl font-bold text-sm hover:bg-red-100 transition disabled:opacity-40 disabled:cursor-not-allowed">
              <FileText className="w-5 h-5" /> Download PDF
            </button>
            <button onClick={() => generate(selectedReport, 'excel')} disabled={selectedReport === 'tenant-wise' && !selectedTenantId}
              className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-5 py-3 rounded-xl font-bold text-sm hover:bg-green-100 transition disabled:opacity-40 disabled:cursor-not-allowed">
              <FileSpreadsheet className="w-5 h-5" /> Download Excel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
