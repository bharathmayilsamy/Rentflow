import { useState } from 'react';
import { MaintenanceRequest, MaintenanceCategory, MaintenancePriority, MaintenanceStatus, Property, Tenant } from '../types';
import { generateId } from '../data';
import { Plus, X, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  requests: MaintenanceRequest[];
  setRequests: (r: MaintenanceRequest[]) => void;
  properties: Property[];
  tenants: Tenant[];
}

const CATEGORIES: MaintenanceCategory[] = ['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Appliance', 'General'];
const PRIORITIES: MaintenancePriority[] = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES: MaintenanceStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed'];

const PRIORITY_COLORS: Record<MaintenancePriority, string> = {
  Low: 'bg-gray-100 text-gray-600',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-orange-100 text-orange-700',
  Urgent: 'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<MaintenanceStatus, string> = {
  Open: 'bg-yellow-100 text-yellow-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Resolved: 'bg-green-100 text-green-700',
  Closed: 'bg-gray-100 text-gray-600',
};

const STATUS_ICONS: Record<MaintenanceStatus, any> = {
  Open: AlertTriangle,
  'In Progress': Clock,
  Resolved: CheckCircle,
  Closed: XCircle,
};

export default function Maintenance({ requests, setRequests, properties, tenants }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<MaintenanceStatus | ''>('');
  const [form, setForm] = useState({
    tenantId: '', propertyId: '', room: '', category: 'General' as MaintenanceCategory,
    priority: 'Medium' as MaintenancePriority, description: '', repairCost: 0,
  });

  const filtered = requests.filter(r => !filterStatus || r.status === filterStatus);

  const submit = () => {
    if (!form.description.trim()) return;
    const tenant = tenants.find(t => t.id === form.tenantId);
    const prop = properties.find(p => p.id === form.propertyId);
    setRequests([...requests, {
      id: generateId(),
      tenantId: form.tenantId,
      tenantName: tenant?.name || 'Unknown',
      propertyId: form.propertyId,
      propertyName: prop?.name || 'Unknown',
      room: form.room,
      category: form.category,
      priority: form.priority,
      status: 'Open',
      description: form.description,
      repairCost: form.repairCost,
      createdDate: new Date().toISOString().split('T')[0],
    }]);
    setShowForm(false);
    setForm({ tenantId: '', propertyId: '', room: '', category: 'General', priority: 'Medium', description: '', repairCost: 0 });
  };

  const updateStatus = (id: string, status: MaintenanceStatus) => {
    setRequests(requests.map(r => r.id === id ? { ...r, status, resolvedDate: status === 'Resolved' ? new Date().toISOString().split('T')[0] : r.resolvedDate } : r));
  };

  const updateCost = (id: string, cost: number) => {
    setRequests(requests.map(r => r.id === id ? { ...r, repairCost: cost } : r));
  };

  const openCount = requests.filter(r => r.status === 'Open').length;
  const inProgressCount = requests.filter(r => r.status === 'In Progress').length;
  const resolvedCount = requests.filter(r => r.status === 'Resolved' || r.status === 'Closed').length;
  const totalCost = requests.reduce((s, r) => s + r.repairCost, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance & Complaints</h1>
          <p className="text-gray-500 text-sm mt-1">Track and manage maintenance requests</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm">
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Open</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{openCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">In Progress</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{inProgressCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Resolved/Closed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{resolvedCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total Repair Cost</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">₹{totalCost.toLocaleString()}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button onClick={() => setFilterStatus('')} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${!filterStatus ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>All</button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{s}</button>
        ))}
      </div>

      {/* Request Cards */}
      <div className="space-y-4">
        {filtered.map(r => {
          const SIcon = STATUS_ICONS[r.status];
          return (
            <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <SIcon className="w-4 h-4" />
                    <h3 className="font-semibold text-gray-900">{r.category} Issue</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{r.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>Tenant: {r.tenantName}</span>
                    <span>Property: {r.propertyName}</span>
                    <span>Room: {r.room}</span>
                    <span>Created: {r.createdDate}</span>
                    {r.resolvedDate && <span>Resolved: {r.resolvedDate}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Cost: ₹</span>
                      <input type="number" value={r.repairCost} onChange={e => updateCost(r.id, +e.target.value)} className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <select value={r.status} onChange={e => updateStatus(r.id, e.target.value as MaintenanceStatus)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none">
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No maintenance requests found</p>
        </div>
      )}

      {/* Add Request Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">New Maintenance Request</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
                <select value={form.tenantId} onChange={e => {
                  const t = tenants.find(t => t.id === e.target.value);
                  setForm({ ...form, tenantId: e.target.value, propertyId: t?.propertyId || '', room: t?.room || '' });
                }} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Select tenant</option>
                  {tenants.filter(t => t.status === 'Active').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as MaintenanceCategory })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as MaintenancePriority })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description*</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none" placeholder="Describe the issue..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button>
                <button onClick={submit} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">Submit Request</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
