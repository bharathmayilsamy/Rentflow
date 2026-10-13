import { useState } from 'react';
import { Reminder, ReminderType, ReminderChannel, ReminderStatus, Tenant } from '../types';
import { generateId } from '../data';
import { Plus, X, Send, Clock, MessageCircle, Mail, Phone, Bell, CheckCircle } from 'lucide-react';

interface Props {
  reminders: Reminder[];
  setReminders: (r: Reminder[]) => void;
  tenants: Tenant[];
}

const TYPES: ReminderType[] = ['Rent Due', 'Lease Renewal', 'Maintenance', 'Custom'];
const CHANNELS: ReminderChannel[] = ['WhatsApp', 'SMS', 'Email', 'In-App'];

const CHANNEL_ICONS: Record<ReminderChannel, any> = {
  WhatsApp: MessageCircle,
  SMS: Phone,
  Email: Mail,
  'In-App': Bell,
};

const CHANNEL_COLORS: Record<ReminderChannel, string> = {
  WhatsApp: 'bg-green-100 text-green-700',
  SMS: 'bg-blue-100 text-blue-700',
  Email: 'bg-purple-100 text-purple-700',
  'In-App': 'bg-orange-100 text-orange-700',
};

export default function Reminders({ reminders, setReminders, tenants }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ReminderStatus | ''>('');
  const [form, setForm] = useState({
    tenantId: '', type: 'Rent Due' as ReminderType, channel: 'WhatsApp' as ReminderChannel,
    message: '', scheduledDate: '',
  });

  const filtered = reminders.filter(r => !filterStatus || r.status === filterStatus);
  const pendingCount = reminders.filter(r => r.status === 'Pending').length;
  const sentCount = reminders.filter(r => r.status === 'Sent').length;

  const addReminder = () => {
    if (!form.message.trim()) return;
    const tenant = tenants.find(t => t.id === form.tenantId);
    setReminders([...reminders, {
      id: generateId(),
      tenantId: form.tenantId,
      tenantName: tenant?.name || 'Unknown',
      type: form.type,
      channel: form.channel,
      message: form.message,
      scheduledDate: form.scheduledDate || new Date().toISOString().split('T')[0],
      status: 'Pending',
    }]);
    setShowForm(false);
    setForm({ tenantId: '', type: 'Rent Due', channel: 'WhatsApp', message: '', scheduledDate: '' });
  };

  const markAsSent = (id: string) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, status: 'Sent' as ReminderStatus } : r));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automated Reminders</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage notification reminders</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm">
          <Plus className="w-4 h-4" /> New Reminder
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total Reminders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{reminders.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            <p className="text-sm text-gray-500">Pending</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-sm text-gray-500">Sent</p>
          </div>
          <p className="text-2xl font-bold text-green-600 mt-1">{sentCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button onClick={() => setFilterStatus('')} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${!filterStatus ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>All</button>
        <button onClick={() => setFilterStatus('Pending')} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filterStatus === 'Pending' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Pending</button>
        <button onClick={() => setFilterStatus('Sent')} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filterStatus === 'Sent' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Sent</button>
      </div>

      {/* Reminder Cards */}
      <div className="space-y-3">
        {filtered.map(r => {
          const CIcon = CHANNEL_ICONS[r.channel];
          return (
            <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${CHANNEL_COLORS[r.channel]}`}>
                    <CIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{r.tenantName}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">{r.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'Sent' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{r.message}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Via: {r.channel}</span>
                      <span>Scheduled: {r.scheduledDate}</span>
                    </div>
                  </div>
                </div>
                {r.status === 'Pending' && (
                  <button onClick={() => markAsSent(r.id)} className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition font-medium shrink-0 ml-3">
                    <Send className="w-3 h-3" /> Mark Sent
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No reminders found</p>
        </div>
      )}

      {/* Add Reminder Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Create Reminder</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
                <select value={form.tenantId} onChange={e => setForm({ ...form, tenantId: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Select tenant</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ReminderType })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                  <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value as ReminderChannel })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    {CHANNELS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                <input type="date" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message*</label>
                <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none" placeholder="Reminder message..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button>
                <button onClick={addReminder} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">Create Reminder</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
