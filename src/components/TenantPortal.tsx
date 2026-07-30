import { useState } from 'react';
import { Tenant, RentPayment, TenantBill, Property, MaintenanceRequest } from '../types';
import { formatDate, formatCurrency } from '../utils/helpers';
import { Share2, Copy, Eye, X, CheckCircle, AlertCircle, Building2, Mail, Wrench, MessageCircle } from 'lucide-react';

interface Props {
  tenants: Tenant[];
  payments: RentPayment[];
  bills: TenantBill[];
  properties: Property[];
  maintenance: MaintenanceRequest[];
  onToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export default function TenantPortal({ tenants, payments, bills, properties, maintenance, onToast }: Props) {
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const activeTenants = tenants.filter(t => t.status === 'Active' || t.status === 'Notice');
  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  // Generate tenant data for portal
  const getTenantPortalData = (t: Tenant) => {
    const tp = payments.filter(p => p.tenantId === t.id);
    const tb = bills.filter(b => b.tenantId === t.id);
    const prop = properties.find(p => p.id === t.propertyId);
    const tm = maintenance.filter(m => m.tenantId === t.id);
    const totalPaid = tp.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
    const totalDue = tp.filter(p => p.status !== 'Paid').reduce((s, p) => s + (p.dueAmount - p.amount), 0);
    const billsPending = tb.filter(b => b.status === 'Pending').reduce((s, b) => s + b.amount, 0);
    const billsPaid = tb.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);
    const paidPayments = tp.filter(p => p.status === 'Paid').sort((a, b) => b.date.localeCompare(a.date));
    const pendingPayments = tp.filter(p => p.status !== 'Paid');
    return { prop, totalPaid, totalDue, billsPending, billsPaid, paidPayments, pendingPayments, tb, tm };
  };

  // Generate shareable text message
  const generateShareText = (t: Tenant) => {
    const d = getTenantPortalData(t);
    const today = formatDate(new Date().toISOString().split('T')[0]);
    let msg = `RentFlow - Payment Summary\n`;
    msg += `Date: ${today}\n\n`;
    msg += `Dear ${t.name},\n\n`;
    msg += `Property: ${d.prop?.name || '-'}\n`;
    msg += `Room: ${t.room || '-'}\n`;
    msg += `Monthly Rent: ${formatCurrency(t.rent)}\n\n`;
    msg += `--- Payment Summary ---\n`;
    msg += `Total Paid: ${formatCurrency(d.totalPaid)}\n`;
    msg += `Rent Pending: ${formatCurrency(d.totalDue)}\n`;
    msg += `Bills Pending: ${formatCurrency(d.billsPending)}\n`;
    msg += `Outstanding: ${formatCurrency(d.totalDue + d.billsPending)}\n\n`;
    if (d.paidPayments.length > 0) {
      msg += `--- Recent Payments ---\n`;
      d.paidPayments.slice(0, 5).forEach(p => {
        msg += `${formatDate(p.date)} - Rs ${p.amount.toLocaleString()} via ${p.method} (${p.receiptNo || '-'})\n`;
      });
      msg += `\n`;
    }
    if (d.pendingPayments.length > 0) {
      msg += `--- Pending Dues ---\n`;
      d.pendingPayments.forEach(p => {
        msg += `Due: ${formatDate(p.dueDate)} - Rs ${(p.dueAmount - p.amount).toLocaleString()} (${p.status})\n`;
      });
      msg += `\n`;
    }
    msg += `For any maintenance requests or queries, please contact your property manager.\n\n`;
    msg += `- RentFlow Property Management`;
    return msg;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    onToast('Copied to clipboard');
  };

  const shareViaWhatsApp = (t: Tenant) => {
    const text = generateShareText(t);
    const phone = t.phone?.replace(/\D/g, '') || '';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tenant Portal</h1>
        <p className="text-gray-500 text-sm mt-1">Share payment summaries & collect documents from tenants</p>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5">
        <h3 className="text-sm font-bold text-indigo-800 mb-3 flex items-center gap-2"><Share2 className="w-4 h-4" /> Share with Tenants</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0"><span className="text-sm font-bold text-indigo-600">1</span></div>
            <div><p className="text-sm font-medium text-gray-800">Select Tenant</p><p className="text-xs text-gray-500 mt-0.5">Choose who to share with</p></div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0"><span className="text-sm font-bold text-indigo-600">2</span></div>
            <div><p className="text-sm font-medium text-gray-800">Preview & Customize</p><p className="text-xs text-gray-500 mt-0.5">Check the summary before sharing</p></div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0"><span className="text-sm font-bold text-indigo-600">3</span></div>
            <div><p className="text-sm font-medium text-gray-800">Send via WhatsApp</p><p className="text-xs text-gray-500 mt-0.5">Or copy & share anywhere</p></div>
          </div>
        </div>
      </div>

      {/* Select Tenant */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Tenant</label>
        <select value={selectedTenantId} onChange={e => setSelectedTenantId(e.target.value)} className="w-full max-w-md border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="">Choose a tenant...</option>
          {activeTenants.map(t => <option key={t.id} value={t.id}>{t.name} - Room {t.room || '-'} ({t.phone || 'No phone'})</option>)}
        </select>
      </div>

      {/* Tenant Cards */}
      {!selectedTenantId && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeTenants.map(t => {
            const d = getTenantPortalData(t);
            return (
              <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: t.avatarColor }}>
                    {t.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-gray-900 truncate">{t.name}</h3>
                    <p className="text-xs text-gray-500">{d.prop?.name || '-'} | Room {t.room || '-'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-green-50 rounded-lg p-2 text-center"><p className="text-[10px] text-green-600">Paid</p><p className="text-sm font-bold text-green-700">{formatCurrency(d.totalPaid)}</p></div>
                  <div className="bg-red-50 rounded-lg p-2 text-center"><p className="text-[10px] text-red-600">Pending</p><p className="text-sm font-bold text-red-700">{formatCurrency(d.totalDue + d.billsPending)}</p></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSelectedTenantId(t.id); setShowPreview(true); }} className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-2.5 rounded-lg font-bold transition border border-indigo-100"><Eye className="w-3.5 h-3.5" /> Preview</button>
                  <button onClick={() => shareViaWhatsApp(t)} className="flex items-center justify-center gap-1.5 text-xs bg-green-50 text-green-700 hover:bg-green-100 py-2.5 px-3 rounded-lg font-bold transition border border-green-100"><MessageCircle className="w-3.5 h-3.5" /></button>
                  <button onClick={() => copyToClipboard(generateShareText(t))} className="flex items-center justify-center gap-1.5 text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 py-2.5 px-3 rounded-lg font-bold transition border border-gray-200"><Copy className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Tenant Detail + Share */}
      {selectedTenant && (() => {
        const d = getTenantPortalData(selectedTenant);
        return (
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                    {selectedTenant.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedTenant.name}</h2>
                    <p className="text-white/80 text-sm flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> {d.prop?.name || '-'} | Room {selectedTenant.room || '-'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="bg-white/10 rounded-lg p-2.5 text-center"><p className="text-lg font-bold">{formatCurrency(d.totalPaid)}</p><p className="text-[10px] text-white/70">Total Paid</p></div>
                  <div className="bg-white/10 rounded-lg p-2.5 text-center"><p className="text-lg font-bold">{formatCurrency(d.totalDue)}</p><p className="text-[10px] text-white/70">Rent Pending</p></div>
                  <div className="bg-white/10 rounded-lg p-2.5 text-center"><p className="text-lg font-bold">{formatCurrency(d.billsPending)}</p><p className="text-[10px] text-white/70">Bills Pending</p></div>
                  <div className="bg-white/10 rounded-lg p-2.5 text-center"><p className="text-lg font-bold">{formatCurrency(selectedTenant.rent)}</p><p className="text-[10px] text-white/70">Monthly Rent</p></div>
                </div>
              </div>

              {/* Payment History */}
              <div className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment History</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {d.paidPayments.length === 0 && d.pendingPayments.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No payment records</p>}
                  {d.pendingPayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                      <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500" /><div><p className="text-sm font-medium text-gray-900">Due: {formatDate(p.dueDate)}</p><p className="text-xs text-gray-500">{p.status}</p></div></div>
                      <p className="text-sm font-bold text-red-600">{formatCurrency(p.dueAmount - p.amount)}</p>
                    </div>
                  ))}
                  {d.paidPayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                      <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><div><p className="text-sm font-medium text-gray-900">Paid via {p.method}</p><p className="text-xs text-gray-500">{formatDate(p.date)} | {p.receiptNo || '-'}</p></div></div>
                      <p className="text-sm font-bold text-green-600">{formatCurrency(p.amount)}</p>
                    </div>
                  ))}
                </div>

                {/* Bills */}
                {d.tb.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Bills</h3>
                    <div className="space-y-1.5">
                      {d.tb.map(b => (
                        <div key={b.id} className={`flex items-center justify-between p-2.5 rounded-lg ${b.status === 'Paid' ? 'bg-green-50' : 'bg-orange-50'}`}>
                          <div><p className="text-xs font-medium text-gray-900">{b.type}: {b.description}</p><p className="text-[10px] text-gray-500">Due: {formatDate(b.dueDate)}</p></div>
                          <div className="text-right"><p className="text-xs font-bold">{formatCurrency(b.amount)}</p><span className={`text-[10px] ${b.status === 'Paid' ? 'text-green-600' : 'text-orange-600'}`}>{b.status}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Maintenance */}
                {d.tm.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Maintenance Requests</h3>
                    <div className="space-y-1.5">
                      {d.tm.map(m => (
                        <div key={m.id} className={`flex items-center justify-between p-2.5 rounded-lg ${m.status === 'Open' ? 'bg-yellow-50' : m.status === 'In Progress' ? 'bg-blue-50' : 'bg-green-50'}`}>
                          <div className="flex items-center gap-2"><Wrench className="w-3.5 h-3.5 text-gray-500" /><div><p className="text-xs font-medium text-gray-900">{m.category}: {m.description.slice(0, 40)}</p><p className="text-[10px] text-gray-500">{formatDate(m.createdDate)}</p></div></div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white">{m.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Share Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Share with {selectedTenant.name}</h3>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => shareViaWhatsApp(selectedTenant)} className="flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-green-700 transition shadow-sm">
                  <MessageCircle className="w-5 h-5" /> Send via WhatsApp
                </button>
                <button onClick={() => copyToClipboard(generateShareText(selectedTenant))} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-5 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition">
                  <Copy className="w-5 h-5" /> Copy Summary
                </button>
                {selectedTenant.email && (
                  <a href={`mailto:${selectedTenant.email}?subject=Payment Summary - RentFlow&body=${encodeURIComponent(generateShareText(selectedTenant))}`} className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-5 py-3 rounded-xl font-bold text-sm hover:bg-blue-100 transition">
                    <Mail className="w-5 h-5" /> Email
                  </a>
                )}
              </div>

              {/* Preview Text */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500">Message Preview</p>
                  <button onClick={() => copyToClipboard(generateShareText(selectedTenant))} className="text-xs text-indigo-600 font-medium">Copy</button>
                </div>
                <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-700 whitespace-pre-wrap font-mono max-h-[300px] overflow-y-auto">
                  {generateShareText(selectedTenant)}
                </pre>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Preview Modal */}
      {showPreview && selectedTenant && (() => {
        const d = getTenantPortalData(selectedTenant);
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/70">Tenant View Preview</p>
                  <h2 className="text-lg font-bold">{selectedTenant.name}</h2>
                </div>
                <button onClick={() => setShowPreview(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 rounded-lg p-3 text-center"><p className="text-xs text-green-600">Total Paid</p><p className="text-lg font-bold text-green-700">{formatCurrency(d.totalPaid)}</p></div>
                  <div className="bg-red-50 rounded-lg p-3 text-center"><p className="text-xs text-red-600">Outstanding</p><p className="text-lg font-bold text-red-700">{formatCurrency(d.totalDue + d.billsPending)}</p></div>
                </div>
                <div className="space-y-2">
                  {d.pendingPayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 bg-red-50 rounded-lg">
                      <div><p className="text-xs font-medium text-gray-900">Due: {formatDate(p.dueDate)}</p></div>
                      <p className="text-xs font-bold text-red-600">{formatCurrency(p.dueAmount - p.amount)}</p>
                    </div>
                  ))}
                  {d.paidPayments.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 bg-green-50 rounded-lg">
                      <div><p className="text-xs font-medium text-gray-900">{formatDate(p.date)} - {p.method}</p><p className="text-[10px] text-gray-500">{p.receiptNo || ''}</p></div>
                      <p className="text-xs font-bold text-green-600">{formatCurrency(p.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 flex gap-2">
                <button onClick={() => { shareViaWhatsApp(selectedTenant); setShowPreview(false); }} className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 transition"><MessageCircle className="w-4 h-4" /> WhatsApp</button>
                <button onClick={() => { copyToClipboard(generateShareText(selectedTenant)); setShowPreview(false); }} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition"><Copy className="w-4 h-4" /> Copy</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
