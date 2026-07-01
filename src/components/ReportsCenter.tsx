import { useState } from 'react';
import { RentPayment, Expense, TenantBill, Tenant, Property } from '../types';
import { formatDate, getOrdinal } from '../utils/helpers';
import { FileText, FileSpreadsheet, Users, User, Calendar, TrendingUp, Receipt, Wallet, Download, ChevronRight } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Props { payments: RentPayment[]; expenses: Expense[]; bills: TenantBill[]; tenants: Tenant[]; properties: Property[]; }

type ReportType = 'all-tenants' | 'tenant-wise' | 'monthly' | 'last6months' | 'pnl' | 'transactions' | 'bills' | 'collection';

const REPORT_CARDS: { key: ReportType; title: string; desc: string; icon: any; color: string }[] = [
  { key: 'all-tenants', title: 'All Tenants Report', desc: 'Complete tenant master with rent, deposits, dues', icon: Users, color: 'bg-indigo-100 text-indigo-600' },
  { key: 'tenant-wise', title: 'Tenant-wise Report', desc: 'Select a tenant for detailed history', icon: User, color: 'bg-purple-100 text-purple-600' },
  { key: 'monthly', title: 'Monthly Report', desc: 'Income and expenses for a month', icon: Calendar, color: 'bg-blue-100 text-blue-600' },
  { key: 'last6months', title: 'Last 6 Months', desc: 'Half-yearly trends and summary', icon: TrendingUp, color: 'bg-green-100 text-green-600' },
  { key: 'pnl', title: 'Profit & Loss', desc: 'Revenue vs expenses breakdown', icon: Wallet, color: 'bg-emerald-100 text-emerald-600' },
  { key: 'transactions', title: 'Transactions', desc: 'All income and expense entries', icon: Receipt, color: 'bg-orange-100 text-orange-600' },
  { key: 'bills', title: 'Bills Report', desc: 'All tenant bills - paid and pending', icon: FileText, color: 'bg-amber-100 text-amber-600' },
  { key: 'collection', title: 'Collection Report', desc: 'Rent collection with receipts', icon: Download, color: 'bg-cyan-100 text-cyan-600' },
];

const cur = (n: number) => `Rs ${n.toLocaleString('en-IN')}`;
const cl = (s: string) => s.replace(/[^\x00-\x7F]/g, '');

// Styled PDF helpers
const HEAD = [99, 102, 241] as [number, number, number];
const GREEN = [22, 163, 74] as [number, number, number];
const RED = [220, 38, 38] as [number, number, number];
const GRAY = [100, 116, 139] as [number, number, number];

const addHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  const pw = doc.internal.pageSize.getWidth();
  // Brand bar
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pw, 32, 'F');
  doc.setFontSize(20); doc.setTextColor(255, 255, 255); doc.text('RentFlow', 14, 18);
  doc.setFontSize(10); doc.text('Property Management', 14, 26);
  doc.setFontSize(9); doc.text(formatDate(new Date().toISOString().split('T')[0]), pw - 14, 18, { align: 'right' });
  // Title
  doc.setFontSize(16); doc.setTextColor(30, 41, 59); doc.text(cl(title), 14, 46);
  if (subtitle) { doc.setFontSize(10); doc.setTextColor(...GRAY); doc.text(cl(subtitle), 14, 54); }
};

const addSection = (doc: jsPDF, y: number, title: string, color: [number, number, number] = HEAD): number => {
  doc.setFillColor(...color); doc.rect(14, y - 1, 4, 8, 'F');
  doc.setFontSize(12); doc.setTextColor(30, 41, 59); doc.text(title, 22, y + 5);
  return y + 12;
};

const addSummaryBox = (doc: jsPDF, y: number, items: [string, string][]): number => {
  const pw = doc.internal.pageSize.getWidth();
  const colW = (pw - 28) / 3;
  items.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 14 + col * colW;
    const yPos = y + row * 22;
    doc.setFillColor(248, 250, 252); doc.roundedRect(x, yPos, colW - 4, 18, 2, 2, 'F');
    doc.setFontSize(8); doc.setTextColor(...GRAY); doc.text(item[0], x + 4, yPos + 7);
    doc.setFontSize(11); doc.setTextColor(30, 41, 59); doc.text(item[1], x + 4, yPos + 14);
  });
  return y + Math.ceil(items.length / 3) * 22 + 6;
};

const addFooter = (doc: jsPDF) => {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240); doc.line(14, ph - 16, pw - 14, ph - 16);
    doc.setFontSize(7); doc.setTextColor(...GRAY);
    doc.text(`Page ${i} of ${pages}`, 14, ph - 10);
    doc.text('RentFlow - Property Management System', pw - 14, ph - 10, { align: 'right' });
  }
};

const tblStyle = (color: [number, number, number] = HEAD) => ({
  theme: 'grid' as const,
  headStyles: { fillColor: color, textColor: [255, 255, 255] as [number, number, number], fontSize: 8, fontStyle: 'bold' as const, cellPadding: 3 },
  bodyStyles: { fontSize: 8, cellPadding: 2.5 },
  alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
  styles: { lineColor: [226, 232, 240] as [number, number, number], lineWidth: 0.2 },
});

export default function ReportsCenter({ payments, expenses, bills, tenants, properties }: Props) {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const getTenantData = (t: Tenant) => {
    const tp = payments.filter(p => p.tenantId === t.id);
    const tb = bills.filter(b => b.tenantId === t.id);
    const prop = properties.find(p => p.id === t.propertyId);
    const totalPaid = tp.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
    const totalDue = tp.filter(p => p.status !== 'Paid').reduce((s, p) => s + (p.dueAmount - p.amount), 0);
    const bPaid = tb.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);
    const bPend = tb.filter(b => b.status === 'Pending').reduce((s, b) => s + b.amount, 0);
    const rentAdded = tp.reduce((s, p) => s + p.dueAmount, 0);
    const totalInvoice = rentAdded + tb.reduce((s, b) => s + b.amount, 0);
    return { prop, tp, tb, totalPaid, totalDue, bPaid, bPend, totalInvoice, rentAdded };
  };

  // ── ALL TENANTS ──
  const generateAllTenants = (format: 'pdf' | 'excel') => {
    const headers = ['Name', 'Phone', 'Status', 'Room', 'Property', 'Move-in', 'Due Day', 'Deposit', 'Total Invoice', 'Total Paid', 'Pending', 'Bills'];
    const rows = tenants.map(t => { const d = getTenantData(t); return [t.name, t.phone || '-', t.status, t.room || '-', d.prop?.name || '-', formatDate(t.leaseStart), getOrdinal(t.dueDay || 1), cur(t.deposit), cur(d.totalInvoice), cur(d.totalPaid), cur(d.totalDue), cur(d.bPaid + d.bPend)]; });
    if (format === 'pdf') {
      const doc = new jsPDF('landscape');
      addHeader(doc, 'All Tenants Report', `${tenants.length} tenants across ${properties.length} properties`);
      const y = addSummaryBox(doc, 58, [['Total Tenants', String(tenants.length)], ['Active', String(tenants.filter(t => t.status === 'Active').length)], ['Monthly Receivable', cur(tenants.filter(t => t.status === 'Active').reduce((s, t) => s + t.rent, 0))], ['Total Collected', cur(payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0))], ['Total Pending', cur(payments.filter(p => p.status !== 'Paid').reduce((s, p) => s + (p.dueAmount - p.amount), 0))], ['Bills Pending', cur(bills.filter(b => b.status === 'Pending').reduce((s, b) => s + b.amount, 0))]]);
      autoTable(doc, { startY: y, head: [headers], body: rows, ...tblStyle() });
      addFooter(doc); doc.save('all-tenants-report.pdf');
    } else {
      const ws = XLSX.utils.aoa_to_sheet([['All Tenants Report'], [], headers, ...tenants.map(t => { const d = getTenantData(t); return [t.name, t.phone, t.status, t.room, d.prop?.name, t.leaseStart, t.dueDay, t.deposit, d.totalInvoice, d.totalPaid, d.totalDue, d.bPaid + d.bPend]; })]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Tenants'); XLSX.writeFile(wb, 'all-tenants-report.xlsx');
    }
  };

  // ── TENANT-WISE ──
  const generateTenantWise = (format: 'pdf' | 'excel') => {
    const t = tenants.find(t => t.id === selectedTenantId); if (!t) return;
    const d = getTenantData(t);
    if (format === 'pdf') {
      const doc = new jsPDF();
      addHeader(doc, `${cl(t.name)} - Detailed Report`, `${d.prop?.name || ''} | Room ${t.room || '-'}`);
      let y = addSummaryBox(doc, 58, [['Monthly Rent', cur(t.rent)], ['Deposit', cur(t.deposit)], ['Due Day', `${getOrdinal(t.dueDay || 1)} monthly`], ['Rent Paid', cur(d.totalPaid)], ['Rent Pending', cur(d.totalDue)], ['Bills Pending', cur(d.bPend)], ['Total Invoice', cur(d.totalInvoice)], ['Outstanding', cur(d.totalDue + d.bPend)], ['Status', t.status]]);
      y = addSection(doc, y, 'Tenant Information');
      autoTable(doc, { startY: y, body: [['Name', t.name], ['Phone', t.phone || '-'], ['Email', t.email || '-'], ['Joined', formatDate(t.leaseStart)], ['Lease End', formatDate(t.leaseEnd)], ['ID Proof', t.idProof || '-'], ['Emergency', t.emergencyContact || '-'], ['EB No', t.ebConsumerNo || '-'], ['Water No', t.waterBillNo || '-'], ['Tax No', t.propertyTaxNo || '-']], theme: 'plain' as const, styles: { fontSize: 9, cellPadding: 2 }, columnStyles: { 0: { fontStyle: 'bold' as const, cellWidth: 35, textColor: GRAY } } });
      y = (doc as any).lastAutoTable.finalY + 6;
      y = addSection(doc, y, 'Rent Payments');
      autoTable(doc, { startY: y, head: [['Due Date', 'Due Amount', 'Paid', 'Paid Date', 'Method', 'Status', 'Receipt']], body: d.tp.map(p => [formatDate(p.dueDate), cur(p.dueAmount), cur(p.amount), p.date ? formatDate(p.date) : '-', p.method, p.status, p.receiptNo || '-']), ...tblStyle() });
      if (d.tb.length > 0) { y = (doc as any).lastAutoTable.finalY + 6; y = addSection(doc, y, 'Bills & Dues', GREEN);
        autoTable(doc, { startY: y, head: [['Type', 'Description', 'Amount', 'Due Date', 'Paid Date', 'Status']], body: d.tb.map(b => [b.type, b.description, cur(b.amount), formatDate(b.dueDate), b.paidDate ? formatDate(b.paidDate) : '-', b.status]), ...tblStyle(GREEN) }); }
      addFooter(doc); doc.save(`${t.name.replace(/\s+/g, '-')}-report.pdf`);
    } else {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Tenant Report - ' + t.name], [], ['Name', t.name], ['Phone', t.phone], ['Rent', t.rent], ['Deposit', t.deposit], ['Joined', t.leaseStart], [], ['Summary'], ['Rent Paid', d.totalPaid], ['Rent Pending', d.totalDue], ['Bills Paid', d.bPaid], ['Bills Pending', d.bPend]]), 'Summary');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Payments'], ['Due Date', 'Due', 'Paid', 'Date', 'Method', 'Status', 'Receipt'], ...d.tp.map(p => [p.dueDate, p.dueAmount, p.amount, p.date || '-', p.method, p.status, p.receiptNo || '-'])]), 'Payments');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Bills'], ['Type', 'Description', 'Amount', 'Due', 'Paid', 'Status'], ...d.tb.map(b => [b.type, b.description, b.amount, b.dueDate, b.paidDate || '-', b.status])]), 'Bills');
      XLSX.writeFile(wb, `${t.name.replace(/\s+/g, '-')}-report.xlsx`);
    }
  };

  // ── MONTHLY ──
  const generateMonthly = (format: 'pdf' | 'excel') => {
    const mp = payments.filter(p => p.status === 'Paid' && p.date?.startsWith(selectedMonth));
    const me = expenses.filter(e => e.date?.startsWith(selectedMonth));
    const mb = bills.filter(b => b.status === 'Paid' && b.paidDate?.startsWith(selectedMonth));
    const rentInc = mp.reduce((s, p) => s + p.amount, 0); const billInc = mb.reduce((s, b) => s + b.amount, 0);
    const income = rentInc + billInc; const exp = me.reduce((s, e) => s + e.amount, 0);
    if (format === 'pdf') {
      const doc = new jsPDF();
      addHeader(doc, `Monthly Report`, `Period: ${selectedMonth}`);
      let y = addSummaryBox(doc, 58, [['Rent Collected', cur(rentInc)], ['Bills Collected', cur(billInc)], ['Total Income', cur(income)], ['Total Expenses', cur(exp)], ['Net Profit', cur(income - exp)], ['Transactions', String(mp.length + mb.length + me.length)]]);
      y = addSection(doc, y, 'Rent Collections', GREEN);
      if (mp.length > 0) { autoTable(doc, { startY: y, head: [['Tenant', 'Room', 'Amount', 'Date', 'Method', 'Receipt']], body: mp.map(p => [p.tenantName, p.room, cur(p.amount), formatDate(p.date), p.method, p.receiptNo || '-']), ...tblStyle(GREEN) }); y = (doc as any).lastAutoTable.finalY + 6; }
      else { doc.setFontSize(9); doc.setTextColor(...GRAY); doc.text('No rent collections this month', 22, y + 2); y += 10; }
      if (mb.length > 0) { y = addSection(doc, y, 'Bills Collected', [234, 179, 8]); autoTable(doc, { startY: y, head: [['Tenant', 'Type', 'Description', 'Amount', 'Paid Date']], body: mb.map(b => { const t = tenants.find(t => t.id === b.tenantId); return [t?.name || '-', b.type, b.description, cur(b.amount), formatDate(b.paidDate!)]; }), ...tblStyle([234, 179, 8]) }); y = (doc as any).lastAutoTable.finalY + 6; }
      if (me.length > 0) { y = addSection(doc, y, 'Expenses', RED); autoTable(doc, { startY: y, head: [['Date', 'Property', 'Category', 'Description', 'Amount']], body: me.map(e => [formatDate(e.date), e.propertyName, e.category, e.description, cur(e.amount)]), ...tblStyle(RED) }); }
      addFooter(doc); doc.save(`monthly-report-${selectedMonth}.pdf`);
    } else {
      const ws = XLSX.utils.aoa_to_sheet([[`Monthly Report - ${selectedMonth}`], [], ['Rent Collected', rentInc], ['Bills Collected', billInc], ['Total Income', income], ['Total Expenses', exp], ['Net', income - exp], [], ['Collections'], ['Tenant', 'Room', 'Amount', 'Date', 'Method'], ...mp.map(p => [p.tenantName, p.room, p.amount, p.date, p.method]), [], ['Expenses'], ['Date', 'Property', 'Category', 'Description', 'Amount'], ...me.map(e => [e.date, e.propertyName, e.category, e.description, e.amount])]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Report'); XLSX.writeFile(wb, `monthly-report-${selectedMonth}.xlsx`);
    }
  };

  // ── LAST 6 MONTHS ──
  const generateLast6Months = (format: 'pdf' | 'excel') => {
    const months: string[] = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); months.push(d.toISOString().slice(0, 7)); }
    const data = months.map(m => { const inc = payments.filter(p => p.status === 'Paid' && p.date?.startsWith(m)).reduce((s, p) => s + p.amount, 0) + bills.filter(b => b.status === 'Paid' && b.paidDate?.startsWith(m)).reduce((s, b) => s + b.amount, 0); const exp = expenses.filter(e => e.date?.startsWith(m)).reduce((s, e) => s + e.amount, 0); return { month: m, income: inc, expense: exp, net: inc - exp }; });
    const tI = data.reduce((s, d) => s + d.income, 0); const tE = data.reduce((s, d) => s + d.expense, 0);
    if (format === 'pdf') {
      const doc = new jsPDF();
      addHeader(doc, 'Last 6 Months Report', `${months[0]} to ${months[5]}`);
      let y = addSummaryBox(doc, 58, [['Total Income', cur(tI)], ['Total Expense', cur(tE)], ['Net Profit/Loss', cur(tI - tE)], ['Avg Monthly Income', cur(Math.round(tI / 6))], ['Avg Monthly Expense', cur(Math.round(tE / 6))], ['Best Month', data.sort((a, b) => b.net - a.net)[0]?.month || '-']]);
      y = addSection(doc, y, 'Monthly Breakdown');
      autoTable(doc, { startY: y, head: [['Month', 'Income', 'Expense', 'Net Profit/Loss']], body: data.map(d => [d.month, cur(d.income), cur(d.expense), cur(d.net)]), ...tblStyle(), didParseCell: (data: any) => { if (data.section === 'body' && data.column.index === 3) { const val = parseFloat(data.cell.text[0]?.replace(/[^0-9-]/g, '') || '0'); data.cell.styles.textColor = val >= 0 ? [22, 163, 74] : [220, 38, 38]; data.cell.styles.fontStyle = 'bold'; } } });
      addFooter(doc); doc.save('last-6-months-report.pdf');
    } else {
      const ws = XLSX.utils.aoa_to_sheet([['Last 6 Months Report'], [], ['Month', 'Income', 'Expense', 'Net'], ...data.map(d => [d.month, d.income, d.expense, d.net]), [], ['Total', tI, tE, tI - tE]]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Report'); XLSX.writeFile(wb, 'last-6-months-report.xlsx');
    }
  };

  // ── P&L ──
  const generatePnL = (format: 'pdf' | 'excel') => {
    const tI = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0) + bills.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);
    const tE = expenses.reduce((s, e) => s + e.amount, 0);
    const incCat: Record<string, number> = {}; const expCat: Record<string, number> = {};
    payments.filter(p => p.status === 'Paid').forEach(p => { incCat['Rent'] = (incCat['Rent'] || 0) + p.amount; });
    bills.filter(b => b.status === 'Paid').forEach(b => { incCat[b.type + ' Bill'] = (incCat[b.type + ' Bill'] || 0) + b.amount; });
    expenses.forEach(e => { expCat[e.category] = (expCat[e.category] || 0) + e.amount; });
    if (format === 'pdf') {
      const doc = new jsPDF();
      addHeader(doc, 'Profit & Loss Statement', 'Complete financial overview');
      let y = addSummaryBox(doc, 58, [['Total Revenue', cur(tI)], ['Total Expenses', cur(tE)], ['Net Profit/Loss', cur(tI - tE)]]);
      y = addSection(doc, y, 'Income Breakdown', GREEN);
      autoTable(doc, { startY: y, head: [['Category', 'Amount', '% of Total']], body: Object.entries(incCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, cur(v), tI > 0 ? `${((v / tI) * 100).toFixed(1)}%` : '0%']), ...tblStyle(GREEN) });
      y = (doc as any).lastAutoTable.finalY + 6;
      y = addSection(doc, y, 'Expense Breakdown', RED);
      autoTable(doc, { startY: y, head: [['Category', 'Amount', '% of Total']], body: Object.entries(expCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, cur(v), tE > 0 ? `${((v / tE) * 100).toFixed(1)}%` : '0%']), ...tblStyle(RED) });
      addFooter(doc); doc.save('profit-loss-report.pdf');
    } else {
      const ws = XLSX.utils.aoa_to_sheet([['P&L Statement'], [], ['Revenue', tI], ['Expenses', tE], ['Net', tI - tE], [], ['Income'], ...Object.entries(incCat).map(([k, v]) => [k, v]), [], ['Expenses'], ...Object.entries(expCat).map(([k, v]) => [k, v])]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'PnL'); XLSX.writeFile(wb, 'profit-loss-report.xlsx');
    }
  };

  // ── TRANSACTIONS ──
  const generateTransactions = (format: 'pdf' | 'excel') => {
    const entries: { date: string; type: string; cat: string; desc: string; amount: number; balance: number }[] = [];
    payments.filter(p => p.status === 'Paid' && p.date).forEach(p => entries.push({ date: p.date, type: 'Income', cat: 'Rent', desc: `${p.tenantName} - Room ${p.room}`, amount: p.amount, balance: 0 }));
    bills.filter(b => b.status === 'Paid' && b.paidDate).forEach(b => { const t = tenants.find(t => t.id === b.tenantId); entries.push({ date: b.paidDate!, type: 'Income', cat: b.type, desc: `${b.description} - ${t?.name || ''}`, amount: b.amount, balance: 0 }); });
    expenses.forEach(e => entries.push({ date: e.date, type: 'Expense', cat: e.category, desc: e.description, amount: e.amount, balance: 0 }));
    entries.sort((a, b) => a.date.localeCompare(b.date));
    let bal = 0; entries.forEach(e => { bal += e.type === 'Income' ? e.amount : -e.amount; e.balance = bal; });
    const tI = entries.filter(e => e.type === 'Income').reduce((s, e) => s + e.amount, 0);
    const tE = entries.filter(e => e.type === 'Expense').reduce((s, e) => s + e.amount, 0);
    if (format === 'pdf') {
      const doc = new jsPDF();
      addHeader(doc, 'Transaction Report', `${entries.length} transactions`);
      let y = addSummaryBox(doc, 58, [['Total Income', cur(tI)], ['Total Expense', cur(tE)], ['Net Balance', cur(tI - tE)]]);
      y = addSection(doc, y, 'All Transactions');
      autoTable(doc, { startY: y, head: [['Date', 'Type', 'Category', 'Description', 'Amount', 'Balance']], body: entries.map(e => [formatDate(e.date), e.type, e.cat, cl(e.desc).slice(0, 35), `${e.type === 'Income' ? '+' : '-'} ${cur(e.amount)}`, cur(e.balance)]), ...tblStyle(),
        didParseCell: (data: any) => { if (data.section === 'body' && data.column.index === 1) { data.cell.styles.textColor = data.cell.text[0] === 'Income' ? [22, 163, 74] : [220, 38, 38]; data.cell.styles.fontStyle = 'bold'; } } });
      addFooter(doc); doc.save('transactions-report.pdf');
    } else {
      const ws = XLSX.utils.aoa_to_sheet([['Transactions'], ['Date', 'Type', 'Category', 'Description', 'Amount', 'Balance'], ...entries.map(e => [e.date, e.type, e.cat, e.desc, e.type === 'Income' ? e.amount : -e.amount, e.balance])]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Transactions'); XLSX.writeFile(wb, 'transactions-report.xlsx');
    }
  };

  // ── BILLS ──
  const generateBills = (format: 'pdf' | 'excel') => {
    const paid = bills.filter(b => b.status === 'Paid'); const pend = bills.filter(b => b.status === 'Pending');
    if (format === 'pdf') {
      const doc = new jsPDF();
      addHeader(doc, 'Bills Report', `${bills.length} bills | ${paid.length} paid, ${pend.length} pending`);
      let y = addSummaryBox(doc, 58, [['Total Bills', String(bills.length)], ['Paid', cur(paid.reduce((s, b) => s + b.amount, 0))], ['Pending', cur(pend.reduce((s, b) => s + b.amount, 0))]]);
      if (pend.length > 0) { y = addSection(doc, y, 'Pending Bills', RED); autoTable(doc, { startY: y, head: [['Tenant', 'Type', 'Description', 'Amount', 'Due Date']], body: pend.map(b => { const t = tenants.find(t => t.id === b.tenantId); return [t?.name || '-', b.type, b.description, cur(b.amount), formatDate(b.dueDate)]; }), ...tblStyle(RED) }); y = (doc as any).lastAutoTable.finalY + 6; }
      if (paid.length > 0) { y = addSection(doc, y, 'Paid Bills', GREEN); autoTable(doc, { startY: y, head: [['Tenant', 'Type', 'Description', 'Amount', 'Due Date', 'Paid Date']], body: paid.map(b => { const t = tenants.find(t => t.id === b.tenantId); return [t?.name || '-', b.type, b.description, cur(b.amount), formatDate(b.dueDate), formatDate(b.paidDate!)]; }), ...tblStyle(GREEN) }); }
      addFooter(doc); doc.save('bills-report.pdf');
    } else {
      const ws = XLSX.utils.aoa_to_sheet([['Bills Report'], ['Tenant', 'Type', 'Description', 'Amount', 'Due Date', 'Paid Date', 'Status'], ...bills.map(b => { const t = tenants.find(t => t.id === b.tenantId); return [t?.name, b.type, b.description, b.amount, b.dueDate, b.paidDate || '-', b.status]; })]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Bills'); XLSX.writeFile(wb, 'bills-report.xlsx');
    }
  };

  // ── COLLECTION ──
  const generateCollection = (format: 'pdf' | 'excel') => {
    const paid = payments.filter(p => p.status === 'Paid').sort((a, b) => b.date.localeCompare(a.date));
    const total = paid.reduce((s, p) => s + p.amount, 0);
    if (format === 'pdf') {
      const doc = new jsPDF();
      addHeader(doc, 'Collection Report', `${paid.length} payments received`);
      let y = addSummaryBox(doc, 58, [['Total Collected', cur(total)], ['Payments', String(paid.length)], ['Avg Payment', cur(paid.length > 0 ? Math.round(total / paid.length) : 0)]]);
      y = addSection(doc, y, 'Payment History', GREEN);
      autoTable(doc, { startY: y, head: [['Tenant', 'Room', 'Amount', 'Date', 'Method', 'Receipt No']], body: paid.map(p => [p.tenantName, p.room, cur(p.amount), formatDate(p.date), p.method, p.receiptNo || '-']), ...tblStyle(GREEN) });
      addFooter(doc); doc.save('collection-report.pdf');
    } else {
      const ws = XLSX.utils.aoa_to_sheet([['Collection Report'], ['Tenant', 'Room', 'Amount', 'Date', 'Method', 'Receipt'], ...paid.map(p => [p.tenantName, p.room, p.amount, p.date, p.method, p.receiptNo || '-'])]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Collections'); XLSX.writeFile(wb, 'collection-report.xlsx');
    }
  };

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
      <div><h1 className="text-2xl font-bold text-gray-900">Reports Center</h1><p className="text-gray-500 text-sm mt-1">Generate professional reports in PDF or Excel</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {REPORT_CARDS.map(r => (
          <button key={r.key} onClick={() => setSelectedReport(r.key)} className={`text-left p-4 rounded-xl border-2 transition-all ${selectedReport === r.key ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-2"><div className={`p-2 rounded-lg ${r.color}`}><r.icon className="w-5 h-5" /></div><ChevronRight className={`w-4 h-4 ml-auto ${selectedReport === r.key ? 'text-indigo-500' : 'text-gray-300'}`} /></div>
            <h3 className="font-bold text-gray-900 text-sm">{r.title}</h3><p className="text-xs text-gray-500 mt-1">{r.desc}</p>
          </button>
        ))}
      </div>
      {selectedReport && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{REPORT_CARDS.find(r => r.key === selectedReport)?.title}</h3>
          {selectedReport === 'tenant-wise' && (<div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">Select Tenant</label><select value={selectedTenantId} onChange={e => setSelectedTenantId(e.target.value)} className="w-full max-w-md border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">Choose a tenant...</option>{tenants.map(t => <option key={t.id} value={t.id}>{t.name} - Room {t.room || '-'}</option>)}</select></div>)}
          {selectedReport === 'monthly' && (<div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label><input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full max-w-md border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none" /></div>)}
          <div className="flex flex-wrap gap-3">
            <button onClick={() => generate(selectedReport, 'pdf')} disabled={selectedReport === 'tenant-wise' && !selectedTenantId} className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 px-5 py-3 rounded-xl font-bold text-sm hover:bg-red-100 transition disabled:opacity-40"><FileText className="w-5 h-5" /> Download PDF</button>
            <button onClick={() => generate(selectedReport, 'excel')} disabled={selectedReport === 'tenant-wise' && !selectedTenantId} className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-5 py-3 rounded-xl font-bold text-sm hover:bg-green-100 transition disabled:opacity-40"><FileSpreadsheet className="w-5 h-5" /> Download Excel</button>
          </div>
        </div>
      )}
    </div>
  );
}
