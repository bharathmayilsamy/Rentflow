import { useState, useMemo } from 'react';
import { MaintenanceRequest, MaintenanceCategory, MaintenancePriority, MaintenanceStatus, Property, Tenant } from '../types';
import { generateId } from '../data';
import { formatDate, formatCurrency } from '../utils/helpers';
import { Plus, X, AlertTriangle, Clock, CheckCircle, XCircle, Wrench, Search, Trash2, RotateCcw, Zap, Droplets, Paintbrush, Hammer, Monitor, Settings, Calendar } from 'lucide-react';

interface Props {
  requests: MaintenanceRequest[];
  setRequests: (r: MaintenanceRequest[]) => void;
  properties: Property[];
  tenants: Tenant[];
}

const CATEGORIES: MaintenanceCategory[] = ['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Appliance', 'General'];
const PRIORITIES: MaintenancePriority[] = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES: MaintenanceStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed'];

const PRIORITY_COLORS: Record<MaintenancePriority, string> = { Low: 'bg-gray-100 text-gray-600', Medium: 'bg-blue-100 text-blue-700', High: 'bg-orange-100 text-orange-700', Urgent: 'bg-red-100 text-red-700' };
const STATUS_COLORS: Record<MaintenanceStatus, string> = { Open: 'bg-yellow-100 text-yellow-700', 'In Progress': 'bg-blue-100 text-blue-700', Resolved: 'bg-green-100 text-green-700', Closed: 'bg-gray-100 text-gray-600' };
const STATUS_ICONS: Record<MaintenanceStatus, any> = { Open: AlertTriangle, 'In Progress': Clock, Resolved: CheckCircle, Closed: XCircle };
const CAT_ICONS: Record<string, any> = { Plumbing: Droplets, Electrical: Zap, Carpentry: Hammer, Painting: Paintbrush, Appliance: Monitor, General: Settings };

export default function Maintenance({ requests, setRequests, properties, tenants }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<MaintenanceStatus | ''>('');
  const [filterPriority, setFilterPriority] = useState<MaintenancePriority | ''>('');
  const [search, setSearch] = useState('');
  
  const [form, setForm] = useState({
    tenantId: '', propertyId: '', room: '', category: 'General' as string,
    priority: 'Medium' as MaintenancePriority, description: '', repairCost: 0, customCat: '',
  });

  const filtered = useMemo(() => requests.filter(r => {
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterPriority && r.priority !== filterPriority) return false;
    if (search && !r.description.toLowerCase().includes(search.toLowerCase()) && !r.tenantName.toLowerCase().includes(search.toLowerCase()) && !r.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [requests, filterStatus, filterPriority, search]);

  const submit = () => {
    if (!form.description.trim()) return;
    const tenant = tenants.find(t => t.id === form.tenantId);
    const prop = properties.find(p => p.id === form.propertyId);
    const cat = form.customCat.trim() || form.category;
    setRequests([...requests, {
      id: generateId(), tenantId: form.tenantId || '', tenantName: tenant?.name || 'General / Common Area',
      propertyId: form.propertyId, propertyName: prop?.name || 'General', room: form.room || '-',
      category: cat as MaintenanceCategory, priority: form.priority, status: 'Open',
      description: form.description, repairCost: form.repairCost || 0,
      createdDate: new Date().toISOString().split('T')[0],
    }]);
    setShowForm(false);
    setForm({ tenantId: '', propertyId: '', room: '', category: 'General', priority: 'Medium', description: '', repairCost: 0, customCat: '' });
  };

  const updateStatus = (id: string, status: MaintenanceStatus) => {
    setRequests(requests.map(r => r.id === id ? { ...r, status, resolvedDate: (status === 'Resolved' || status === 'Closed') ? new Date().toISOString().split('T')[0] : r.resolvedDate } : r));
  };
  const updateCost = (id: string, cost: number) => { setRequests(requests.map(r => r.id === id ? { ...r, repairCost: cost } : r)); };
  const deleteRequest = (id: string) => { if (window.confirm('Delete this maintenance request?')) setRequests(requests.filter(r => r.id !== id)); };
  const reopenRequest = (id: string) => { setRequests(requests.map(r => r.id === id ? { ...r, status: 'Open' as MaintenanceStatus, resolvedDate: undefined } : r)); };

  // Stats
  const openCount = requests.filter(r => r.status === 'Open').length;
  const inProgressCount = requests.filter(r => r.status === 'In Progress').length;
  const resolvedCount = requests.filter(r => r.status === 'Resolved').length;
  const closedCount = requests.filter(r => r.status === 'Closed').length;
  const urgentCount = requests.filter(r => r.priority === 'Urgent' && (r.status === 'Open' || r.status === 'In Progress')).length;
  const totalCost = requests.reduce((s, r) => s + r.repairCost, 0);
  const thisMonthCost = requests.filter(r => r.createdDate?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, r) => s + r.repairCost, 0);
  

  // Category stats
  const catStats = useMemo(() => {
    const map: Record<string, { count: number; cost: number }> = {};
    requests.forEach(r => { if (!map[r.category]) map[r.category] = { count: 0, cost: 0 }; map[r.category].count++; map[r.category].cost += r.repairCost; });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [requests]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900">Maintenance</h1><p className="text-gray-500 text-sm mt-1">{requests.length} total requests | {openCount + inProgressCount} active</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm"><Plus className="w-4 h-4" /> New Request</button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-yellow-500" /><span className="text-xs text-gray-500">Open</span></div>
          <p className="text-2xl font-bold text-yellow-600">{openCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-blue-500" /><span className="text-xs text-gray-500">In Progress</span></div>
          <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-xs text-gray-500">Resolved</span></div>
          <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1"><XCircle className="w-4 h-4 text-gray-400" /><span className="text-xs text-gray-500">Closed</span></div>
          <p className="text-2xl font-bold text-gray-600">{closedCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1"><Zap className="w-4 h-4 text-red-500" /><span className="text-xs text-gray-500">Urgent</span></div>
          <p className="text-2xl font-bold text-red-600">{urgentCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1"><Wrench className="w-4 h-4 text-indigo-500" /><span className="text-xs text-gray-500">Total Cost</span></div>
          <p className="text-xl font-bold text-indigo-600">{formatCurrency(totalCost)}</p>
          <p className="text-[10px] text-gray-400">This month: {formatCurrency(thisMonthCost)}</p>
        </div>
      </div>

      {/* Category Breakdown */}
      {catStats.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">By Category</h3>
          <div className="flex flex-wrap gap-2">
            {catStats.map(([cat, data]) => {
              const CIcon = CAT_ICONS[cat] || Wrench;
              return (
                <div key={cat} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <CIcon className="w-4 h-4 text-indigo-500" />
                  <div><p className="text-xs font-bold text-gray-800">{cat}</p><p className="text-[10px] text-gray-500">{data.count} tickets | {formatCurrency(data.cost)}</p></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex-1 min-w-[180px]"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5">
          <button onClick={() => setFilterStatus('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${!filterStatus ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600'}`}>All</button>
          {STATUSES.map(s => <button key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterStatus === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600'}`}>{s}</button>)}
        </div>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as MaintenancePriority | '')} className="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="">All Priority</option>{PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        {(filterStatus || filterPriority || search) && <button onClick={() => { setFilterStatus(''); setFilterPriority(''); setSearch(''); }} className="text-xs text-indigo-600 font-medium px-2">Clear</button>}
      </div>

      {/* Request Cards */}
      <div className="space-y-3">
        {filtered.map(r => {
          const SIcon = STATUS_ICONS[r.status];
          const CIcon = CAT_ICONS[r.category] || Wrench;
          const isActive = r.status === 'Open' || r.status === 'In Progress';
          const isClosed = r.status === 'Closed' || r.status === 'Resolved';

          return (
            <div key={r.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${r.priority === 'Urgent' && isActive ? 'border-red-200' : 'border-gray-100'}`}>
              <div className={`h-1 ${r.priority === 'Urgent' ? 'bg-red-500' : r.priority === 'High' ? 'bg-orange-400' : r.status === 'Resolved' ? 'bg-green-500' : r.status === 'Closed' ? 'bg-gray-300' : 'bg-blue-400'}`} />
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Category icon */}
                  <div className={`p-2.5 rounded-xl shrink-0 ${isActive ? 'bg-indigo-50' : 'bg-gray-50'}`}>
                    <CIcon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className={`font-bold text-sm ${isClosed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{r.category} Issue</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${STATUS_COLORS[r.status]}`}><SIcon className="w-3 h-3" />{r.status}</span>
                    </div>
                    <p className={`text-sm mb-2 ${isClosed ? 'text-gray-400' : 'text-gray-600'}`}>{r.description}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1"><span className="font-medium text-gray-700">{r.tenantName}</span></span>
                      <span>{r.propertyName}</span>
                      {r.room !== '-' && <span>Room {r.room}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(r.createdDate)}</span>
                      {r.resolvedDate && <span className="text-green-600">Resolved: {formatDate(r.resolvedDate)}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400">Rs</span>
                      <input type="number" inputMode="numeric" value={r.repairCost || ''} onChange={e => updateCost(r.id, +e.target.value)}
                        className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0" />
                    </div>
                    <div className="flex gap-1">
                      {isActive && (
                        <select value={r.status} onChange={e => updateStatus(r.id, e.target.value as MaintenanceStatus)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-medium focus:ring-2 focus:ring-indigo-500 outline-none">
                          {STATUSES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      )}
                      {isClosed && (
                        <button onClick={() => reopenRequest(r.id)} className="flex items-center gap-1 text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg font-bold hover:bg-amber-100 transition">
                          <RotateCcw className="w-3 h-3" /> Reopen
                        </button>
                      )}
                      <button onClick={() => deleteRequest(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Wrench className="w-8 h-8 text-gray-300" /></div>
          <p className="text-lg font-medium">No maintenance requests</p>
          <p className="text-sm mt-1">Create a new request to get started</p>
        </div>
      )}

      {/* New Request Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold">New Maintenance Request</h2><button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <select value={form.tenantId} onChange={e => {
                  const t = tenants.find(t => t.id === e.target.value);
                  setForm({ ...form, tenantId: e.target.value, propertyId: t?.propertyId || form.propertyId, room: t?.room || '' });
                }} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">General / Common Area</option>
                  {tenants.filter(t => t.status === 'Active' || t.status === 'Notice').map(t => <option key={t.id} value={t.id}>{t.name} - Room {t.room || '-'}</option>)}
                </select>
              </div>
              {!form.tenantId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                  <select value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Select property</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value, customCat: '' })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    <option value="_custom">Custom...</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as MaintenancePriority })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none">
                    {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              {form.category === '_custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Category</label>
                  <input value={form.customCat} onChange={e => setForm({ ...form, customCat: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="e.g., CCTV, Lift, Intercom" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none" placeholder="Describe the issue in detail..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost (Rs)</label>
                <input type="number" inputMode="numeric" value={form.repairCost || ''} onChange={e => setForm({ ...form, repairCost: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="0" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button>
                <button onClick={submit} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">Submit Request</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
