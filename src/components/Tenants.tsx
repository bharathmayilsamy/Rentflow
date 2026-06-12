import { useState } from 'react';
import { Tenant, TenantStatus, Property, TenantBill, BillType, BillStatus } from '../types';
import { generateId, getAvatarColor, getRentDueDate, getSuggestedRoomNumber } from '../data';
import { Plus, Edit2, Trash2, Eye, Search, X, Phone, Mail, Calendar, Receipt, Zap, Droplets, Wifi, Flame, Wrench, FileText, CheckCircle, Building2, MapPin } from 'lucide-react';

interface Props {
  tenants: Tenant[];
  setTenants: (t: Tenant[]) => void;
  properties: Property[];
  bills: TenantBill[];
  setBills: (b: TenantBill[]) => void;
  showAddModal?: boolean;
  setShowAddModal?: (show: boolean) => void;
  filterType?: 'active' | 'old';
  rentDueDay?: number;
}

const STATUS_COLORS: Record<TenantStatus, string> = { Active: 'bg-green-100 text-green-700', Inactive: 'bg-gray-100 text-gray-600', Notice: 'bg-orange-100 text-orange-700' };

const BILL_TYPES: BillType[] = ['Electricity', 'Water', 'Tax', 'Internet', 'Gas', 'Maintenance', 'Other'];

const BILL_ICONS: Record<BillType, any> = {
  Electricity: Zap,
  Water: Droplets,
  Tax: FileText,
  Internet: Wifi,
  Gas: Flame,
  Maintenance: Wrench,
  Other: Receipt,
};

const BILL_COLORS: Record<BillType, string> = {
  Electricity: 'bg-yellow-100 text-yellow-700',
  Water: 'bg-blue-100 text-blue-700',
  Tax: 'bg-purple-100 text-purple-700',
  Internet: 'bg-cyan-100 text-cyan-700',
  Gas: 'bg-orange-100 text-orange-700',
  Maintenance: 'bg-green-100 text-green-700',
  Other: 'bg-gray-100 text-gray-700',
};

const emptyTenant = (): Omit<Tenant, 'id' | 'avatarColor'> => ({
  name: '', email: '', phone: '', propertyId: '', room: '', rent: 0, deposit: 0,
  leaseStart: '', leaseEnd: '', idProof: '', emergencyContact: '', notes: '', status: 'Active' as TenantStatus,
});

const emptyBill = (): Omit<TenantBill, 'id' | 'tenantId'> => ({
  type: 'Electricity' as BillType,
  description: '',
  amount: 0,
  dueDate: '',
  status: 'Pending' as BillStatus,
});

export default function Tenants({ tenants, setTenants, properties, bills, setBills, showAddModal, setShowAddModal, filterType = 'active', rentDueDay = 1 }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<TenantStatus | ''>('');
  const [filterProperty, setFilterProperty] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<Tenant | null>(null);
  const [showBillForm, setShowBillForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignTenantId, setAssignTenantId] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState({ propertyId: '', room: '' });
  const [billTenantId, setBillTenantId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyTenant());
  const [billForm, setBillForm] = useState(emptyBill());

  // Handle external modal trigger
  const isFormOpen = showAddModal !== undefined ? showAddModal : showForm;
  const setIsFormOpen = (open: boolean) => {
    if (setShowAddModal) setShowAddModal(open);
    setShowForm(open);
  };

  // Filter tenants based on filterType (active or old/inactive)
  const baseFiltered = filterType === 'old' 
    ? tenants.filter(t => t.status === 'Inactive')
    : tenants.filter(t => t.status !== 'Inactive');

  const filtered = baseFiltered.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterProperty && t.propertyId !== filterProperty) return false;
    return true;
  });

  const openAdd = () => {
    setForm({ ...emptyTenant(), room: properties.length > 0 ? getSuggestedRoomNumber(properties[0].id, tenants) : '100' });
    setEditingId(null);
    setIsFormOpen(true);
  };
  const openEdit = (t: Tenant) => {
    setForm({ name: t.name, email: t.email, phone: t.phone, propertyId: t.propertyId, room: t.room, rent: t.rent, deposit: t.deposit, leaseStart: t.leaseStart, leaseEnd: t.leaseEnd, idProof: t.idProof, emergencyContact: t.emergencyContact, notes: t.notes, status: t.status });
    setEditingId(t.id);
    setIsFormOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      setTenants(tenants.map(t => t.id === editingId ? { ...t, ...form } : t));
    } else {
      setTenants([...tenants, { id: generateId(), avatarColor: getAvatarColor(), ...form }]);
    }
    setIsFormOpen(false);
  };

  const remove = (id: string) => {
    setTenants(tenants.filter(t => t.id !== id));
    setBills(bills.filter(b => b.tenantId !== id));
  };

  const getPropertyName = (pid: string) => properties.find(p => p.id === pid)?.name || 'Unknown';
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const getTenantBills = (tenantId: string) => bills.filter(b => b.tenantId === tenantId);
  const getPendingBillsCount = (tenantId: string) => bills.filter(b => b.tenantId === tenantId && b.status === 'Pending').length;
  const getPendingBillsTotal = (tenantId: string) => bills.filter(b => b.tenantId === tenantId && b.status === 'Pending').reduce((s, b) => s + b.amount, 0);
  const getTotalDue = (tenant: Tenant) => tenant.rent + getPendingBillsTotal(tenant.id);

  const openAssign = (tenant: Tenant) => {
    setAssignTenantId(tenant.id);
    setAssignForm({
      propertyId: tenant.propertyId || '',
      room: tenant.room || getSuggestedRoomNumber(tenant.propertyId || properties[0]?.id || '', tenants),
    });
    setShowAssignForm(true);
  };

  const saveAssign = () => {
    if (!assignTenantId || !assignForm.propertyId) return;
    const room = assignForm.room || getSuggestedRoomNumber(assignForm.propertyId, tenants);
    setTenants(tenants.map(t =>
      t.id === assignTenantId ? { ...t, propertyId: assignForm.propertyId, room } : t
    ));
    setShowAssignForm(false);
    setAssignTenantId(null);
  };

  const openAddBill = (tenantId: string) => {
    setBillTenantId(tenantId);
    setBillForm(emptyBill());
    setShowBillForm(true);
  };

  const saveBill = () => {
    if (!billTenantId || !billForm.description.trim()) return;
    setBills([...bills, { id: generateId(), tenantId: billTenantId, ...billForm }]);
    setShowBillForm(false);
    setBillTenantId(null);
  };

  const markBillPaid = (billId: string) => {
    setBills(bills.map(b => b.id === billId ? { ...b, status: 'Paid' as BillStatus, paidDate: new Date().toISOString().split('T')[0] } : b));
  };

  const deleteBill = (billId: string) => {
    setBills(bills.filter(b => b.id !== billId));
  };

  const getTitle = () => {
    if (filterType === 'old') return 'Old Tenants';
    return 'Tenants';
  };

  const getSubtitle = () => {
    if (filterType === 'old') return 'View inactive/past tenants';
    return 'Manage your tenants, leases, and bills';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getTitle()}</h1>
          <p className="text-gray-500 text-sm mt-1">{getSubtitle()}</p>
        </div>
        {filterType !== 'old' && (
          <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm">
            <Plus className="w-4 h-4" /> Add Tenant
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenants..." className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as TenantStatus | '')} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="">All Status</option>
          <option>Active</option>
          <option>Inactive</option>
          <option>Notice</option>
        </select>
        <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="">All Properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Tenant Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(t => {
          const pendingCount = getPendingBillsCount(t.id);
          const pendingTotal = getPendingBillsTotal(t.id);
          const totalDue = getTotalDue(t);
          const dueDate = getRentDueDate(rentDueDay);
          return (
            <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowDetail(t)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: t.avatarColor }}>
                    {getInitials(t.name)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                  </div>
                </div>
                <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowDetail(t)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition" title="View Details"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition" title="Edit Tenant"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => openAddBill(t.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-green-600 transition" title="Add Bill"><Receipt className="w-4 h-4" /></button>
                  <button onClick={() => remove(t.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition" title="Delete Tenant"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Property & Room assignment info */}
              <div className="mb-3 p-2.5 bg-indigo-50 rounded-lg border border-indigo-100">
                <div className="flex items-center gap-2 text-sm text-indigo-800">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-medium">{t.propertyId ? getPropertyName(t.propertyId) : 'Not assigned'}</span>
                  {t.room && <span className="text-indigo-600">• Room {t.room}</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-indigo-600 mt-1">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>Rent due: {dueDate}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-gray-600">
                <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" /> {t.email || '—'}</p>
                <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" /> {t.phone || '—'}</p>
              </div>
              
              {pendingCount > 0 && (
                <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-red-700">{pendingCount} pending bill{pendingCount > 1 ? 's' : ''}</span>
                    <span className="text-xs font-bold text-red-700">₹{pendingTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}
              
              <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Rent</span>
                  <span className="text-sm font-semibold text-gray-700">₹{t.rent.toLocaleString()}</span>
                </div>
                {pendingTotal > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Bills</span>
                    <span className="text-sm font-semibold text-red-600">+ ₹{pendingTotal.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <span className="text-sm font-medium text-gray-700">Total Due</span>
                  <span className="text-lg font-bold text-indigo-600">₹{totalDue.toLocaleString()}</span>
                </div>
                {filterType !== 'old' && (
                  <button
                    onClick={() => openAssign(t)}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
                  >
                    <MapPin className="w-3 h-3" /> Assign to Property
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No tenants found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      )}

      {/* Detail Modal with Bills */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Tenant Details</h2>
              <button onClick={() => setShowDetail(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: showDetail.avatarColor }}>
                {getInitials(showDetail.name)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{showDetail.name}</h3>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[showDetail.status]}`}>{showDetail.status}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                ['Email', showDetail.email],
                ['Phone', showDetail.phone],
                ['Property', getPropertyName(showDetail.propertyId)],
                ['Room', showDetail.room || '—'],
                ['Rent Due Date', getRentDueDate(rentDueDay)],
                ['Monthly Rent', `₹${showDetail.rent.toLocaleString()}`],
                ['Pending Bills', `₹${getPendingBillsTotal(showDetail.id).toLocaleString()}`],
                ['Total Due', `₹${getTotalDue(showDetail).toLocaleString()}`],
                ['Deposit', `₹${showDetail.deposit.toLocaleString()}`],
                ['Lease Start', showDetail.leaseStart],
                ['Lease End', showDetail.leaseEnd],
                ['ID Proof', showDetail.idProof],
                ['Emergency Contact', showDetail.emergencyContact],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{val || '—'}</p>
                </div>
              ))}
            </div>
            {showDetail.notes && (
              <div className="mb-6 p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-gray-700">{showDetail.notes}</p>
              </div>
            )}

            {/* Bills Section */}
            <div className="border-t border-gray-100 pt-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Bills & Dues</h4>
                <button onClick={() => openAddBill(showDetail.id)} className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition font-medium">
                  <Plus className="w-3 h-3" /> Add Bill
                </button>
              </div>
              <div className="space-y-2">
                {getTenantBills(showDetail.id).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No bills added yet</p>
                ) : (
                  getTenantBills(showDetail.id).map(bill => {
                    const BIcon = BILL_ICONS[bill.type];
                    return (
                      <div key={bill.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${BILL_COLORS[bill.type]}`}>
                            <BIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{bill.description}</p>
                            <p className="text-xs text-gray-500">{bill.type} • Due: {bill.dueDate}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">₹{bill.amount.toLocaleString()}</span>
                          {bill.status === 'Pending' ? (
                            <>
                              <button onClick={() => markBillPaid(bill.id)} className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 transition" title="Mark Paid">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button onClick={() => deleteBill(bill.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle className="w-3 h-3" /> Paid</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Tenant Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsFormOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Tenant' : 'Add Tenant'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name*</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Enter name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Phone number" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                <select value={form.propertyId} onChange={e => {
                  const pid = e.target.value;
                  setForm({ ...form, propertyId: pid, room: pid ? getSuggestedRoomNumber(pid, tenants.filter(t => t.id !== editingId)) : form.room });
                }} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Select Property</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                <input value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="e.g. 100, 101" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent (₹)</label>
                <input type="number" value={form.rent} onChange={e => setForm({ ...form, rent: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deposit (₹)</label>
                <input type="number" value={form.deposit} onChange={e => setForm({ ...form, deposit: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TenantStatus })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>Notice</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lease Start</label>
                <input type="date" value={form.leaseStart} onChange={e => setForm({ ...form, leaseStart: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lease End</label>
                <input type="date" value={form.leaseEnd} onChange={e => setForm({ ...form, leaseEnd: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Proof</label>
                <input value={form.idProof} onChange={e => setForm({ ...form, idProof: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Aadhar / PAN / etc" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                <input value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Emergency phone" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none" placeholder="Any additional notes..." />
              </div>
            </div>
            <div className="flex gap-3 pt-4 mt-2">
              <button onClick={() => setIsFormOpen(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button>
              <button onClick={save} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">
                {editingId ? 'Update' : 'Add'} Tenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign to Property Modal */}
      {showAssignForm && assignTenantId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAssignForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Assign to Property</h2>
              <button onClick={() => setShowAssignForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl mb-4">
              <p className="text-sm text-gray-500">Tenant: <span className="font-medium text-gray-900">{tenants.find(t => t.id === assignTenantId)?.name}</span></p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property*</label>
                <select
                  value={assignForm.propertyId}
                  onChange={e => setAssignForm({
                    propertyId: e.target.value,
                    room: getSuggestedRoomNumber(e.target.value, tenants.filter(t => t.id !== assignTenantId)),
                  })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Select Property</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                <input
                  value={assignForm.room}
                  onChange={e => setAssignForm({ ...assignForm, room: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="e.g. 100, 101"
                />
                <p className="text-xs text-gray-400 mt-1">Auto-suggested based on existing rooms in property</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAssignForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button>
                <button onClick={saveAssign} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">Assign</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Bill Modal */}
      {showBillForm && billTenantId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowBillForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Add Bill / Due</h2>
              <button onClick={() => setShowBillForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl mb-4">
              <p className="text-sm text-gray-500">Tenant: <span className="font-medium text-gray-900">{tenants.find(t => t.id === billTenantId)?.name}</span></p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill Type</label>
                <select value={billForm.type} onChange={e => setBillForm({ ...billForm, type: e.target.value as BillType })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  {BILL_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description*</label>
                <input value={billForm.description} onChange={e => setBillForm({ ...billForm, description: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="e.g., January 2025 Electricity Bill" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input type="number" value={billForm.amount} onChange={e => setBillForm({ ...billForm, amount: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" value={billForm.dueDate} onChange={e => setBillForm({ ...billForm, dueDate: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowBillForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button>
                <button onClick={saveBill} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">Add Bill</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
