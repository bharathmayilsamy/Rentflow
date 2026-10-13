import { useState, useEffect } from 'react';
import { generateId } from '../data';
import { formatDate } from '../utils/helpers';
import { Plus, X, Trash2, MessageCircle, AlertTriangle, Info, Bell, Megaphone, Copy } from 'lucide-react';
import { Tenant } from '../types';

interface Notice {
  id: string;
  title: string;
  message: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  date: string;
}

interface Props {
  tenants: Tenant[];
  onToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const PRIORITY_COLORS: Record<string, string> = { Low: 'bg-gray-100 text-gray-700 border-gray-200', Normal: 'bg-blue-50 text-blue-700 border-blue-200', High: 'bg-orange-50 text-orange-700 border-orange-200', Urgent: 'bg-red-50 text-red-700 border-red-200' };
const PRIORITY_ICONS: Record<string, any> = { Low: Info, Normal: Bell, High: AlertTriangle, Urgent: Megaphone };
const STORAGE_KEY = 'v-do_notices';

export default function NoticeBoard({ tenants, onToast }: Props) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', priority: 'Normal' as Notice['priority'] });

  useEffect(() => { try { const s = localStorage.getItem(STORAGE_KEY); if (s) setNotices(JSON.parse(s)); } catch {} }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(notices)); }, [notices]);

  const addNotice = () => {
    if (!form.title.trim()) { onToast('Enter a title', 'error'); return; }
    setNotices([{ id: generateId(), ...form, date: new Date().toISOString().split('T')[0] }, ...notices]);
    setShowForm(false); setForm({ title: '', message: '', priority: 'Normal' }); onToast('Notice posted');
  };

  const deleteNotice = (id: string) => { setNotices(notices.filter(n => n.id !== id)); onToast('Notice removed'); };

  const shareViaWhatsApp = (notice: Notice) => {
    const text = `*${notice.title}*\n\n${notice.message}\n\n- V-DO Property Management\n${formatDate(notice.date)}`;
    const activePhones = tenants.filter(t => t.status === 'Active' && t.phone).map(t => t.phone);
    if (activePhones.length > 0) {
      window.open(`https://wa.me/${activePhones[0].replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    }
    onToast('Open WhatsApp for each tenant to share');
  };

  const copyNotice = (notice: Notice) => {
    navigator.clipboard.writeText(`${notice.title}\n\n${notice.message}\n\n- V-DO Property Management`);
    onToast('Notice copied to clipboard');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900">Notice Board</h1><p className="text-gray-500 text-sm mt-1">Post announcements for tenants</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm"><Plus className="w-4 h-4" /> Post Notice</button>
      </div>

      {notices.length === 0 && (
        <div className="text-center py-16 text-gray-400"><Megaphone className="w-12 h-12 mx-auto mb-3 text-gray-200" /><p className="text-lg font-medium">No notices yet</p><p className="text-sm mt-1">Post announcements for your tenants</p></div>
      )}

      <div className="space-y-3">
        {notices.map(n => {
          const PIcon = PRIORITY_ICONS[n.priority] || Bell;
          return (
            <div key={n.id} className={`rounded-xl border p-4 ${PRIORITY_COLORS[n.priority]}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <PIcon className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm">{n.title}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-white/50">{n.priority}</span>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{n.message}</p>
                    <p className="text-[10px] text-gray-500 mt-2">{formatDate(n.date)}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => shareViaWhatsApp(n)} className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 transition" title="Share via WhatsApp"><MessageCircle className="w-4 h-4" /></button>
                  <button onClick={() => copyNotice(n)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition" title="Copy"><Copy className="w-4 h-4" /></button>
                  <button onClick={() => deleteNotice(n.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold">Post Notice</h2><button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g., Water maintenance tomorrow" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Message</label><textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Details..." /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Priority</label><select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none"><option>Low</option><option>Normal</option><option>High</option><option>Urgent</option></select></div>
              <div className="flex gap-3 pt-2"><button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button><button onClick={addNotice} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">Post Notice</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
