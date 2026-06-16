import { useState, useMemo } from 'react';
import { Tenant, TenantStatus, Property, TenantBill, BillType, BillStatus, RentPayment, Settings } from '../types';
import { generateId, getAvatarColor } from '../data';
import { formatDate, formatCurrency, daysUntil, getOrdinal, getNextDueDateStr } from '../utils/helpers';
import { Plus, Edit2, Trash2, Eye, Search, X, Phone, Calendar, Receipt, Zap, Droplets, Wifi, Flame, Wrench, FileText, CheckCircle, Building2, Clock, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight, History, CircleDollarSign, Banknote, MinusCircle, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  tenants: Tenant[];
  setTenants: (t: Tenant[]) => void;
  properties: Property[];
  bills: TenantBill[];
  setBills: (b: TenantBill[]) => void;
  payments: RentPayment[];
  setPayments: (p: RentPayment[]) => void;
  settings: Settings;
  showAddModal?: boolean;
  setShowAddModal?: (show: boolean) => void;
  filterType?: 'active' | 'old';
  onToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const STATUS_COLORS: Record<TenantStatus, string> = { Active: 'bg-emerald-100 text-emerald-700', Inactive: 'bg-gray-100 text-gray-600', Notice: 'bg-amber-100 text-amber-700' };
const DEFAULT_BILL_TYPES: string[] = ['Electricity', 'Water', 'Tax', 'Internet', 'Gas', 'Maintenance', 'Other'];
const BILL_ICONS: Record<string, any> = { Electricity: Zap, Water: Droplets, Tax: FileText, Internet: Wifi, Gas: Flame, Maintenance: Wrench, Other: Receipt };
const BILL_COLORS: Record<string, string> = { Electricity: 'bg-yellow-100 text-yellow-700', Water: 'bg-blue-100 text-blue-700', Tax: 'bg-purple-100 text-purple-700', Internet: 'bg-cyan-100 text-cyan-700', Gas: 'bg-orange-100 text-orange-700', Maintenance: 'bg-green-100 text-green-700', Other: 'bg-gray-100 text-gray-700' };

const emptyTenant = (): Omit<Tenant, 'id' | 'avatarColor'> => ({
  name: '', email: '', phone: '', propertyId: '', room: '', rent: 0, deposit: 0,
  leaseStart: new Date().toISOString().split('T')[0], leaseEnd: '', idProof: '', emergencyContact: '', notes: '', status: 'Active' as TenantStatus, dueDay: 1, ebConsumerNo: '', waterBillNo: '', propertyTaxNo: '',
});
const emptyBill = (): Omit<TenantBill, 'id' | 'tenantId'> => ({ type: 'Electricity' as BillType, description: '', amount: 0, dueDate: '', status: 'Pending' as BillStatus });

export default function Tenants({ tenants, setTenants, properties, bills, setBills, payments, setPayments, settings, showAddModal, setShowAddModal, filterType = 'active', onToast }: Props) {
  const [search, setSearch] = useState('');
  const [filterProperty, setFilterProperty] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<Tenant | null>(null);
  const [showBillForm, setShowBillForm] = useState(false);
  const [billTenantId, setBillTenantId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyTenant());
  const [billForm, setBillForm] = useState(emptyBill());
  const [detailTab, setDetailTab] = useState<'info' | 'payments' | 'bills'>('info');

  const isFormOpen = showAddModal !== undefined ? showAddModal : showForm;
  const setIsFormOpen = (open: boolean) => { if (setShowAddModal) setShowAddModal(open); setShowForm(open); };

  const baseFiltered = filterType === 'old' ? tenants.filter(t => t.status === 'Inactive') : tenants.filter(t => t.status !== 'Inactive');
  const filtered = baseFiltered.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.phone.includes(search)) return false;
    if (filterProperty && t.propertyId !== filterProperty) return false;
    return true;
  });

  const openAdd = () => { setForm(emptyTenant()); setEditingId(null); setIsFormOpen(true); };
  const openEdit = (t: Tenant) => {
    setForm({ name: t.name, email: t.email, phone: t.phone, propertyId: t.propertyId, room: t.room, rent: t.rent, deposit: t.deposit, leaseStart: t.leaseStart, leaseEnd: t.leaseEnd, idProof: t.idProof, emergencyContact: t.emergencyContact, notes: t.notes, status: t.status, dueDay: t.dueDay || 1, ebConsumerNo: t.ebConsumerNo || '', waterBillNo: t.waterBillNo || '', propertyTaxNo: t.propertyTaxNo || '' });
    setEditingId(t.id); setIsFormOpen(true);
  };
  const save = () => {
    if (!form.name.trim()) return;
    const finalRoom = form.room || (form.propertyId ? String(tenants.filter(t => t.propertyId === form.propertyId).length + 1).padStart(3, '0') : '');
    if (editingId) { setTenants(tenants.map(t => t.id === editingId ? { ...t, ...form, room: finalRoom } : t)); onToast('Tenant updated successfully'); }
    else { setTenants([...tenants, { id: generateId(), avatarColor: getAvatarColor(), ...form, room: finalRoom }]); onToast('Tenant added successfully'); }
    setIsFormOpen(false);
  };
  const remove = (id: string) => {
    const tenant = tenants.find(t => t.id === id);
    if (!window.confirm(`Are you sure you want to delete "${tenant?.name}"?\n\nThis will remove all their bills and payment records.`)) return;
    setTenants(tenants.filter(t => t.id !== id));
    setBills(bills.filter(b => b.tenantId !== id));
    onToast(`${tenant?.name} removed`);
  };
  const getPropertyName = (pid: string) => properties.find(p => p.id === pid)?.name || 'Not Assigned';
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const billTypes = settings.customBillTypes?.length > 0 ? settings.customBillTypes : DEFAULT_BILL_TYPES;

  // Quick add rent due for a tenant
  const addRentDue = (t: Tenant) => {
    const dueDate = getNextDueDateStr(t.dueDay || 1);
    // Check if a pending due already exists for this period
    const existing = payments.find(p => p.tenantId === t.id && p.status !== 'Paid' && p.dueDate === dueDate);
    if (existing) { onToast('Rent due already exists for this period', 'info'); return; }
    setPayments([...payments, {
      id: generateId(), tenantId: t.id, tenantName: t.name, propertyId: t.propertyId, room: t.room,
      amount: 0, dueAmount: t.rent, method: 'UPI', status: 'Pending', date: '', dueDate, receiptNo: '',
    }]);
    onToast(`Rent ₹${t.rent.toLocaleString()} due added → Passbook updated`);
  };

  // Remove most recent unpaid rent due
  const removeRentDue = (tenantId: string) => {
    const unpaid = payments.filter(p => p.tenantId === tenantId && p.status === 'Pending').sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    if (unpaid.length === 0) { onToast('No pending rent to remove', 'info'); return; }
    setPayments(payments.filter(p => p.id !== unpaid[0].id));
    onToast('Rent due removed');
  };

  const openAddBill = (tenantId: string) => { setBillTenantId(tenantId); setBillForm(emptyBill()); setShowBillForm(true); };
  const saveBill = () => {
    if (!billTenantId || !billForm.description.trim()) return;
    setBills([...bills, { id: generateId(), tenantId: billTenantId, ...billForm }]);
    setShowBillForm(false);
    onToast(`Bill added → Passbook updated`);
  };
  const markBillPaid = (billId: string) => { setBills(bills.map(b => b.id === billId ? { ...b, status: 'Paid' as BillStatus, paidDate: new Date().toISOString().split('T')[0] } : b)); onToast('Bill marked as paid → Passbook updated'); };
  const deleteBill = (billId: string) => { setBills(bills.filter(b => b.id !== billId)); onToast('Bill removed'); };

  const exportTenantPDF = (t: Tenant) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const tp = payments.filter(p => p.tenantId === t.id).sort((a, b) => (a.date || a.dueDate).localeCompare(b.date || b.dueDate));
    const tb = bills.filter(b => b.tenantId === t.id);
    const prop = properties.find(p => p.id === t.propertyId);
    const totalPaid = tp.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
    const totalDueAmt = tp.filter(p => p.status !== 'Paid').reduce((s, p) => s + (p.dueAmount - p.amount), 0);
    const bPaid = tb.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);
    const bPend = tb.filter(b => b.status === 'Pending').reduce((s, b) => s + b.amount, 0);

    doc.setFontSize(20); doc.setTextColor(99, 102, 241); doc.text('RentFlow', 14, 20);
    doc.setFontSize(14); doc.setTextColor(0); doc.text(`${t.name} — Transaction History`, 14, 30);
    doc.setFontSize(10); doc.setTextColor(128, 128, 128); doc.text(`Generated: ${formatDate(new Date().toISOString().split('T')[0])}`, 14, 38);

    autoTable(doc, { startY: 45, body: [['Property', prop?.name || '—'], ['Room', t.room || '—'], ['Rent', formatCurrency(t.rent)], ['Deposit', formatCurrency(t.deposit)], ['Joined', formatDate(t.leaseStart)], ['Due Day', `${getOrdinal(t.dueDay || 1)} monthly`]], theme: 'plain', styles: { fontSize: 10 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 } } });

    let y = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(12); doc.setTextColor(0); doc.text('Summary', 14, y);
    autoTable(doc, { startY: y + 4, head: [['', 'Amount']], body: [['Rent Paid', formatCurrency(totalPaid)], ['Rent Pending', formatCurrency(totalDueAmt)], ['Bills Paid', formatCurrency(bPaid)], ['Bills Pending', formatCurrency(bPend)], ['Total Outstanding', formatCurrency(totalDueAmt + bPend)]], theme: 'striped', headStyles: { fillColor: [99, 102, 241] } });

    y = (doc as any).lastAutoTable.finalY + 8;
    doc.text('Rent Payments', 14, y);
    autoTable(doc, { startY: y + 4, head: [['Due Date', 'Due', 'Paid', 'Date', 'Method', 'Status', 'Receipt']], body: tp.map(p => [formatDate(p.dueDate), formatCurrency(p.dueAmount), formatCurrency(p.amount), p.date ? formatDate(p.date) : '—', p.method, p.status, p.receiptNo || '—']), theme: 'striped', headStyles: { fillColor: [99, 102, 241] }, styles: { fontSize: 8 } });

    if (tb.length > 0) { y = (doc as any).lastAutoTable.finalY + 8; doc.text('Bills', 14, y);
      autoTable(doc, { startY: y + 4, head: [['Type', 'Description', 'Amount', 'Due', 'Paid', 'Status']], body: tb.map(b => [b.type, b.description, formatCurrency(b.amount), formatDate(b.dueDate), b.paidDate ? formatDate(b.paidDate) : '—', b.status]), theme: 'striped', headStyles: { fillColor: [34, 197, 94] }, styles: { fontSize: 8 } }); }

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(128, 128, 128); doc.text(`Page ${i}/${pages} | RentFlow — ${t.name}`, pw / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' }); }
    doc.save(`${t.name.replace(/\s+/g, '-')}-history.pdf`);
    onToast(`PDF exported for ${t.name}`);
  };

  // Stats helpers
  const getTenantStats = (tenantId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const tp = payments.filter(p => p.tenantId === tenantId);
    const tb = bills.filter(b => b.tenantId === tenantId);
    const totalPaid = tp.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
    const unpaid = tp.filter(p => p.status !== 'Paid');
    const overdue = unpaid.filter(p => p.dueDate && p.dueDate < today).reduce((s, p) => s + (p.dueAmount - p.amount), 0);
    const overdueCount = unpaid.filter(p => p.dueDate && p.dueDate < today).length;
    const overdueDays = unpaid.filter(p => p.dueDate && p.dueDate < today).map(p => daysUntil(p.dueDate)).sort((a, b) => a - b)[0];
    const upcoming = unpaid.filter(p => !p.dueDate || p.dueDate >= today).reduce((s, p) => s + (p.dueAmount - p.amount), 0);
    const nextDuePayment = unpaid.filter(p => !p.dueDate || p.dueDate >= today).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))[0];
    const billsPaid = tb.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);
    const billsPending = tb.filter(b => b.status === 'Pending').reduce((s, b) => s + b.amount, 0);
    const lastPaid = tp.filter(p => p.status === 'Paid' && p.date).sort((a, b) => b.date.localeCompare(a.date))[0];
    const hasPendingDue = unpaid.length > 0;
    return { totalPaid, overdue, overdueCount, overdueDays, upcoming, nextDuePayment, billsPaid, billsPending, lastPaid, paymentCount: tp.length, billCount: tb.length, hasPendingDue };
  };

  const grandStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const ids = baseFiltered.map(t => t.id);
    const totalRent = baseFiltered.reduce((s, t) => s + t.rent, 0);
    const totalCollected = payments.filter(p => ids.includes(p.tenantId) && p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
    const unpaid = payments.filter(p => ids.includes(p.tenantId) && p.status !== 'Paid');
    const totalOverdue = unpaid.filter(p => p.dueDate && p.dueDate < today).reduce((s, p) => s + (p.dueAmount - p.amount), 0);
    const totalBillsPending = bills.filter(b => ids.includes(b.tenantId) && b.status === 'Pending').reduce((s, b) => s + b.amount, 0);
    return { totalRent, totalCollected, totalOverdue, totalBillsPending };
  }, [baseFiltered, payments, bills]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{filterType === 'old' ? 'Old Tenants' : 'Tenants'}</h1>
          <p className="text-gray-500 text-sm mt-1">{filterType === 'old' ? 'Inactive/past tenants' : `${baseFiltered.length} tenant${baseFiltered.length !== 1 ? 's' : ''} • ${formatCurrency(grandStats.totalRent)}/month`}</p>
        </div>
        {filterType !== 'old' && <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm"><Plus className="w-4 h-4" /> Add Tenant</button>}
      </div>

      {/* Stats */}
      {filterType !== 'old' && baseFiltered.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3"><div className="p-2.5 bg-green-100 rounded-xl"><TrendingUp className="w-5 h-5 text-green-600" /></div><div><p className="text-xs text-gray-500">Total Collected</p><p className="text-lg font-bold text-green-600">{formatCurrency(grandStats.totalCollected)}</p></div></div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3"><div className="p-2.5 bg-red-100 rounded-xl"><AlertCircle className="w-5 h-5 text-red-600" /></div><div><p className="text-xs text-gray-500">Overdue</p><p className="text-lg font-bold text-red-600">{formatCurrency(grandStats.totalOverdue)}</p></div></div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3"><div className="p-2.5 bg-orange-100 rounded-xl"><Receipt className="w-5 h-5 text-orange-600" /></div><div><p className="text-xs text-gray-500">Bills Pending</p><p className="text-lg font-bold text-orange-600">{formatCurrency(grandStats.totalBillsPending)}</p></div></div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3"><div className="p-2.5 bg-indigo-100 rounded-xl"><CircleDollarSign className="w-5 h-5 text-indigo-600" /></div><div><p className="text-xs text-gray-500">Monthly Receivable</p><p className="text-lg font-bold text-indigo-600">{formatCurrency(grandStats.totalRent)}</p></div></div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex-1 min-w-[200px]"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
        <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">All Properties</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </div>

      {/* Tenant Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(t => {
          const stats = getTenantStats(t.id);
          const nextDueDate = stats.nextDuePayment?.dueDate || getNextDueDateStr(t.dueDay || 1);
          const dueDays = daysUntil(nextDueDate);
          const isDueSoon = dueDays <= 5 && dueDays >= 0;
          const hasOverdue = stats.overdue > 0;
          const totalOwed = stats.upcoming + stats.billsPending + stats.overdue;

          return (
            <div key={t.id} className={`bg-white rounded-2xl shadow-sm border hover:shadow-lg transition-all duration-200 overflow-hidden ${hasOverdue ? 'border-red-200' : isDueSoon ? 'border-amber-200' : 'border-gray-100'}`}>
              <div className={`h-1 ${hasOverdue ? 'bg-red-500' : isDueSoon ? 'bg-amber-400' : stats.lastPaid ? 'bg-emerald-500' : 'bg-gray-200'}`} />
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: t.avatarColor }}>{getInitials(t.name)}</div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${t.status === 'Active' ? 'bg-emerald-500' : t.status === 'Notice' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{t.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                        {t.room && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-semibold">Room {t.room}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    <button onClick={() => { setShowDetail(t); setDetailTab('info'); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition" title="View"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition" title="Edit"><Edit2 className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* Property & Contact */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-sm"><Building2 className="w-3.5 h-3.5 text-indigo-500" /><span className={`truncate ${t.propertyId ? 'text-gray-700' : 'text-red-500 italic'}`}>{getPropertyName(t.propertyId)}</span></div>
                  {t.phone && <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-3.5 h-3.5 text-gray-400" />{t.phone}</div>}
                </div>

                {/* Overdue Warning */}
                {hasOverdue && (
                  <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-100 rounded-xl mb-3">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-red-700">Overdue by {Math.abs(stats.overdueDays || 0)} days</p>
                      <p className="text-[10px] text-red-600">{stats.overdueCount} payment{stats.overdueCount > 1 ? 's' : ''} • {formatCurrency(stats.overdue)}</p>
                    </div>
                  </div>
                )}

                {/* Payment Status */}
                <div className="flex items-center gap-2 mb-3">
                  {stats.lastPaid ? (
                    <div className="flex-1 flex items-center gap-1.5 p-2 bg-emerald-50 rounded-lg">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-xs text-emerald-700 font-medium">Paid {formatDate(stats.lastPaid.date)}</span>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">No payment yet</span>
                    </div>
                  )}
                  <div className={`flex items-center gap-1.5 p-2 rounded-lg ${hasOverdue ? 'bg-red-50' : isDueSoon ? 'bg-amber-50' : 'bg-indigo-50'}`}>
                    <Calendar className={`w-3.5 h-3.5 ${hasOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : 'text-indigo-500'}`} />
                    <span className={`text-xs font-medium ${hasOverdue ? 'text-red-700' : isDueSoon ? 'text-amber-700' : 'text-indigo-600'}`}>{getOrdinal(t.dueDay || 1)}</span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                  {stats.overdue > 0 && (
                    <div className="flex items-center justify-between"><span className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Overdue</span><span className="text-sm font-semibold text-red-600">{formatCurrency(stats.overdue)}</span></div>
                  )}
                  {stats.upcoming > 0 && (
                    <div className="flex items-center justify-between"><span className="text-xs text-indigo-600 flex items-center gap-1"><Clock className="w-3 h-3" /> Due {formatDate(nextDueDate)}</span><span className="text-sm font-semibold text-indigo-600">{formatCurrency(stats.upcoming)}</span></div>
                  )}
                  {stats.upcoming === 0 && stats.overdue === 0 && (
                    <div className="flex items-center justify-between"><span className="text-xs text-gray-500">Rent</span><span className="text-sm font-semibold text-gray-800">{formatCurrency(t.rent)}</span></div>
                  )}
                  {stats.billsPending > 0 && (
                    <div className="flex items-center justify-between"><span className="text-xs text-orange-600 flex items-center gap-1"><Receipt className="w-3 h-3" /> Bills</span><span className="text-sm font-semibold text-orange-600">{formatCurrency(stats.billsPending)}</span></div>
                  )}
                  <div className="flex items-center justify-between pt-1.5 border-t border-gray-200">
                    <span className="text-sm font-bold text-gray-700">{totalOwed > 0 ? 'Total Due' : 'Rent'}</span>
                    <span className={`text-lg font-black ${stats.overdue > 0 ? 'text-red-600' : totalOwed > 0 ? 'text-indigo-600' : 'text-gray-800'}`}>{formatCurrency(totalOwed > 0 ? totalOwed : t.rent)}</span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2 mt-3 pt-2">
                  <button onClick={() => addRentDue(t)} className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-2 rounded-lg font-medium transition" title="Add rent due">
                    <Banknote className="w-3.5 h-3.5" /> Add Rent
                  </button>
                  {stats.hasPendingDue && (
                    <button onClick={() => removeRentDue(t.id)} className="flex items-center justify-center gap-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 py-2 px-3 rounded-lg font-medium transition" title="Remove last pending rent">
                      <MinusCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => openAddBill(t.id)} className="flex items-center justify-center gap-1 text-xs bg-orange-50 text-orange-700 hover:bg-orange-100 py-2 px-3 rounded-lg font-medium transition" title="Add bill">
                    <Receipt className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setShowDetail(t); setDetailTab('payments'); }} className="flex items-center justify-center gap-1 text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 py-2 px-3 rounded-lg font-medium transition" title="View history">
                    <History className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => exportTenantPDF(t)} className="p-2 rounded-lg hover:bg-indigo-50 text-gray-300 hover:text-indigo-500 transition" title="Export PDF"><FileDown className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(t.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400"><div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Building2 className="w-8 h-8 text-gray-300" /></div><p className="text-lg font-medium">{filterType === 'old' ? 'No old tenants' : 'No tenants yet'}</p></div>
      )}

      {/* Detail Modal */}
      {showDetail && (() => {
        const stats = getTenantStats(showDetail.id);
        const tenantPayments = payments.filter(p => p.tenantId === showDetail.id).sort((a, b) => (b.date || b.dueDate).localeCompare(a.date || a.dueDate));
        const tenantBills = bills.filter(b => b.tenantId === showDetail.id).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">{getInitials(showDetail.name)}</div>
                    <div><h3 className="text-xl font-bold">{showDetail.name}</h3><div className="flex items-center gap-2 mt-1 text-white/80 text-sm"><Building2 className="w-3.5 h-3.5" /> {getPropertyName(showDetail.propertyId)} {showDetail.room && `• Room ${showDetail.room}`}</div></div>
                  </div>
                  <button onClick={() => setShowDetail(null)} className="p-1.5 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-white/10 rounded-lg p-2.5 text-center"><p className="text-lg font-bold">{formatCurrency(stats.totalPaid)}</p><p className="text-[10px] text-white/70">Total Paid</p></div>
                  <div className="bg-white/10 rounded-lg p-2.5 text-center"><p className="text-lg font-bold">{formatCurrency(stats.overdue + stats.upcoming + stats.billsPending)}</p><p className="text-[10px] text-white/70">Outstanding</p></div>
                  <div className="bg-white/10 rounded-lg p-2.5 text-center"><p className="text-lg font-bold">{formatCurrency(showDetail.rent)}</p><p className="text-[10px] text-white/70">Monthly Rent</p></div>
                </div>
              </div>
              <div className="flex border-b border-gray-200">
                {['info', 'payments', 'bills'].map(tab => (
                  <button key={tab} onClick={() => setDetailTab(tab as any)} className={`flex-1 py-3 text-sm font-medium transition ${detailTab === tab ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    {tab === 'info' ? 'Details' : tab === 'payments' ? `Payments (${stats.paymentCount})` : `Bills (${stats.billCount})`}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {detailTab === 'info' && (
                  <div className="grid grid-cols-2 gap-4">
                    {[['Phone', showDetail.phone], ['Email', showDetail.email], ['Due Day', `${getOrdinal(showDetail.dueDay || 1)} of every month`], ['Join Date', formatDate(showDetail.leaseStart)], ['Lease End', formatDate(showDetail.leaseEnd)], ['Rent', formatCurrency(showDetail.rent)], ['Deposit', formatCurrency(showDetail.deposit)], ['ID Proof', showDetail.idProof], ['Emergency', showDetail.emergencyContact], ['Status', showDetail.status], ['EB Consumer No.', showDetail.ebConsumerNo], ['Water Bill No.', showDetail.waterBillNo], ['Property Tax No.', showDetail.propertyTaxNo]].map(([label, val]) => (
                      <div key={label as string}><p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{label as string}</p><p className="text-sm font-medium text-gray-900 mt-0.5">{(val as string) || '—'}</p></div>
                    ))}
                    {showDetail.notes && <div className="col-span-2 p-3 bg-gray-50 rounded-xl"><p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1">Notes</p><p className="text-sm text-gray-700">{showDetail.notes}</p></div>}
                  </div>
                )}
                {detailTab === 'payments' && (
                  <div className="space-y-2">
                    {tenantPayments.length === 0 ? <p className="text-center text-gray-400 py-8">No payments</p> :
                    tenantPayments.map(p => (
                      <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl ${p.status === 'Paid' ? 'bg-emerald-50' : p.status === 'Overdue' ? 'bg-red-50' : 'bg-amber-50'}`}>
                        <div className="flex items-center gap-3">
                          {p.status === 'Paid' ? <ArrowUpRight className="w-5 h-5 text-emerald-600" /> : <ArrowDownRight className="w-5 h-5 text-red-500" />}
                          <div><p className="text-sm font-medium text-gray-900">{p.status === 'Paid' ? `Paid via ${p.method}` : `Due: ${formatDate(p.dueDate)}`}</p><p className="text-xs text-gray-500">{p.date ? formatDate(p.date) : 'Pending'} {p.receiptNo && `• ${p.receiptNo}`}</p></div>
                        </div>
                        <div className="text-right"><p className={`text-sm font-bold ${p.status === 'Paid' ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(p.status === 'Paid' ? p.amount : p.dueAmount - p.amount)}</p><span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${p.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : p.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span></div>
                      </div>
                    ))}
                  </div>
                )}
                {detailTab === 'bills' && (
                  <div>
                    <div className="flex justify-end mb-3"><button onClick={() => openAddBill(showDetail.id)} className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition font-medium"><Plus className="w-3 h-3" /> Add Bill</button></div>
                    <div className="space-y-2">
                      {tenantBills.length === 0 ? <p className="text-center text-gray-400 py-8">No bills</p> :
                      tenantBills.map(bill => {
                        const BIcon = BILL_ICONS[bill.type] || Receipt;
                        return (
                          <div key={bill.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${BILL_COLORS[bill.type] || 'bg-gray-100 text-gray-600'}`}><BIcon className="w-4 h-4" /></div><div><p className="text-sm font-medium text-gray-900">{bill.description}</p><p className="text-xs text-gray-500">{bill.type} • Due: {formatDate(bill.dueDate)}</p></div></div>
                            <div className="flex items-center gap-2"><span className="text-sm font-bold">{formatCurrency(bill.amount)}</span>
                              {bill.status === 'Pending' ? (<><button onClick={() => markBillPaid(bill.id)} className="p-1.5 rounded-lg hover:bg-green-100 text-green-600"><CheckCircle className="w-4 h-4" /></button><button onClick={() => deleteBill(bill.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500"><Trash2 className="w-4 h-4" /></button></>) : <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle className="w-3 h-3" /> Paid</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add/Edit Tenant Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setIsFormOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold">{editingId ? 'Edit Tenant' : 'Add Tenant'}</h2><button onClick={() => setIsFormOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name*</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Enter name" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Assign Property</label><select value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">Select</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Room No.</label><input value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Auto if empty" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent (₹)</label><input type="number" value={form.rent} onChange={e => setForm({ ...form, rent: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Deposit (₹)</label><input type="number" value={form.deposit} onChange={e => setForm({ ...form, deposit: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Monthly Due Day (1-31)</label><input type="number" min={1} max={31} value={form.dueDay} onChange={e => setForm({ ...form, dueDay: Math.min(31, Math.max(1, +e.target.value)) })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TenantStatus })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"><option>Active</option><option>Inactive</option><option>Notice</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label><input type="date" value={form.leaseStart} onChange={e => setForm({ ...form, leaseStart: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Lease End</label><input type="date" value={form.leaseEnd} onChange={e => setForm({ ...form, leaseEnd: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">ID Proof</label><input value={form.idProof} onChange={e => setForm({ ...form, idProof: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label><input value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div className="sm:col-span-2 pt-2 border-t border-gray-100"><p className="text-sm font-semibold text-gray-700 mb-2">Utility Account Numbers</p></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">EB Consumer No.</label><input value={form.ebConsumerNo} onChange={e => setForm({ ...form, ebConsumerNo: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Electricity board number" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Water Bill No.</label><input value={form.waterBillNo} onChange={e => setForm({ ...form, waterBillNo: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Water connection number" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Property Tax No.</label><input value={form.propertyTaxNo} onChange={e => setForm({ ...form, propertyTaxNo: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Property tax number" /></div>
              <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none" /></div>
            </div>
            <div className="flex gap-3 pt-4"><button onClick={() => setIsFormOpen(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button><button onClick={save} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">{editingId ? 'Update' : 'Add'} Tenant</button></div>
          </div>
        </div>
      )}

      {/* Add Bill Modal */}
      {showBillForm && billTenantId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowBillForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold">Add Bill</h2><button onClick={() => setShowBillForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="p-3 bg-indigo-50 rounded-xl mb-4"><p className="text-sm font-medium text-indigo-700">{tenants.find(t => t.id === billTenantId)?.name}</p></div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Bill Type</label><select value={billForm.type} onChange={e => setBillForm({ ...billForm, type: e.target.value as BillType })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">{billTypes.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description*</label><input value={billForm.description} onChange={e => setBillForm({ ...billForm, description: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label><input type="number" value={billForm.amount} onChange={e => setBillForm({ ...billForm, amount: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label><input type="date" value={billForm.dueDate} onChange={e => setBillForm({ ...billForm, dueDate: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
              <div className="flex gap-3 pt-2"><button onClick={() => setShowBillForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button><button onClick={saveBill} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">Add Bill</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
