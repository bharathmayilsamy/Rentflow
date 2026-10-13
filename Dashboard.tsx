import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, RadialBarChart, RadialBar } from 'recharts';
import { Property, Tenant, RentPayment, MaintenanceRequest, Expense, TenantBill } from '../types';
import { formatDate, daysUntil } from '../utils/helpers';
import { Building2, Wrench, TrendingUp, Wallet, CircleDollarSign, ArrowUpRight, ArrowDownRight, Receipt, AlertCircle, Users, DoorOpen, BarChart3, FileText, Percent, CheckCircle2, Clock, Zap, ChevronRight, Activity, PieChart as PieIcon, Layers, BellRing, X } from 'lucide-react';

interface Props { properties: Property[]; tenants: Tenant[]; payments: RentPayment[]; maintenance: MaintenanceRequest[]; expenses: Expense[]; bills: TenantBill[]; }

const COLORS = ['#22c55e', '#f97316', '#ef4444', '#6366f1', '#8b5cf6', '#06b6d4', '#eab308'];
const fmt = (n: number) => `Rs ${n.toLocaleString('en-IN')}`;
const fmtShort = (n: number) => n >= 100000 ? `Rs ${(n / 100000).toFixed(1)}L` : n >= 1000 ? `Rs ${(n / 1000).toFixed(1)}k` : `Rs ${n}`;

export default function Dashboard({ properties, tenants, payments, maintenance, expenses, bills }: Props) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);
  const [activeAlert, setActiveAlert] = useState<'all' | 'overdue' | 'due' | 'lease' | 'maint'>('all');
  const [leaseModal, setLeaseModal] = useState<null | 'expired' | '30' | '60' | '90'>(null);

  // ── CORE DATA ──
  const activeTenants = tenants.filter(t => t.status === 'Active');
  const noticeTenants = tenants.filter(t => t.status === 'Notice');

  // Property
  const totalUnits = properties.reduce((s, p) => s + p.totalRooms, 0);
  const occupiedUnits = activeTenants.length;
  const vacantUnits = Math.max(totalUnits - occupiedUnits, 0);
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  // Financial
  const monthlyReceivable = activeTenants.reduce((s, t) => s + t.rent, 0);
  const totalCollected = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const totalOverdue = payments.filter(p => p.status !== 'Paid' && p.dueDate && p.dueDate < today).reduce((s, p) => s + (p.dueAmount - p.amount), 0);
  const totalPending = payments.filter(p => p.status !== 'Paid').reduce((s, p) => s + (p.dueAmount - p.amount), 0);
  const thisMonthPaid = payments.filter(p => p.status === 'Paid' && p.date?.startsWith(thisMonth)).reduce((s, p) => s + p.amount, 0);
  const thisMonthBills = bills.filter(b => b.status === 'Paid' && b.paidDate?.startsWith(thisMonth)).reduce((s, b) => s + b.amount, 0);
  const thisMonthExpenses = expenses.filter(e => e.date?.startsWith(thisMonth)).reduce((s, e) => s + e.amount, 0);
  const thisMonthIncome = thisMonthPaid + thisMonthBills;
  const thisMonthNet = thisMonthIncome - thisMonthExpenses;
  const collectionRate = monthlyReceivable > 0 ? Math.min(Math.round((thisMonthPaid / monthlyReceivable) * 100), 100) : 0;
  const avgRent = activeTenants.length > 0 ? Math.round(monthlyReceivable / activeTenants.length) : 0;
  const totalDeposits = activeTenants.reduce((s, t) => s + t.deposit, 0);
  const vacancyLoss = vacantUnits * avgRent;
  const totalExpensesAll = expenses.reduce((s, e) => s + e.amount, 0);
  const profitMargin = totalCollected > 0 ? Math.round(((totalCollected - totalExpensesAll) / totalCollected) * 100) : 0;
  const billsPending = bills.filter(b => b.status === 'Pending').reduce((s, b) => s + b.amount, 0);
  const billsCollected = bills.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);

  // Lease alerts
  const leaseExpiring30 = activeTenants.filter(t => t.leaseEnd && daysUntil(t.leaseEnd) >= 0 && daysUntil(t.leaseEnd) <= 30);
  const leaseExpiring60 = activeTenants.filter(t => t.leaseEnd && daysUntil(t.leaseEnd) > 30 && daysUntil(t.leaseEnd) <= 60);
  const leaseExpiring90 = activeTenants.filter(t => t.leaseEnd && daysUntil(t.leaseEnd) > 60 && daysUntil(t.leaseEnd) <= 90);
  const leaseExpired = activeTenants.filter(t => t.leaseEnd && daysUntil(t.leaseEnd) < 0);

  // Maintenance
  const openMaint = maintenance.filter(m => m.status === 'Open').length;
  const progressMaint = maintenance.filter(m => m.status === 'In Progress').length;
  const urgentMaint = maintenance.filter(m => m.priority === 'Urgent' && (m.status === 'Open' || m.status === 'In Progress'));

  // Overdue tenants
  const overdueTenantIds = [...new Set(payments.filter(p => p.status !== 'Paid' && p.dueDate && p.dueDate < today).map(p => p.tenantId))];
  // Due soon tenants (next 7 days)
  const dueSoonTenants = activeTenants.filter(t => {
    const nextDue = payments.filter(p => p.tenantId === t.id && p.status !== 'Paid' && p.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    return nextDue && daysUntil(nextDue.dueDate) <= 7;
  });

  // ── CHART DATA ──
  const paymentPie = useMemo(() => {
    const c = { Paid: 0, Pending: 0, Overdue: 0, Partial: 0 } as Record<string, number>;
    payments.forEach(p => { c[p.status] = (c[p.status] || 0) + 1; });
    return Object.entries(c).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [payments]);

  const monthlyTrend = useMemo(() => {
    const months: string[] = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); months.push(d.toISOString().slice(0, 7)); }
    return months.map(m => {
      const inc = payments.filter(p => p.status === 'Paid' && p.date?.startsWith(m)).reduce((s, p) => s + p.amount, 0) + bills.filter(b => b.status === 'Paid' && b.paidDate?.startsWith(m)).reduce((s, b) => s + b.amount, 0);
      const exp = expenses.filter(e => e.date?.startsWith(m)).reduce((s, e) => s + e.amount, 0);
      return { month: new Date(m + '-01').toLocaleString('default', { month: 'short' }), income: inc, expense: exp, net: inc - exp };
    });
  }, [payments, bills, expenses]);

  const collectionBars = useMemo(() => {
    const map: Record<string, { collected: number; dues: number }> = {};
    payments.forEach(p => { const k = (p.status === 'Paid' && p.date ? p.date : p.dueDate)?.slice(0, 7); if (!k) return; if (!map[k]) map[k] = { collected: 0, dues: 0 }; if (p.status === 'Paid') map[k].collected += p.amount; else map[k].dues += (p.dueAmount - p.amount); });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([k, v]) => ({ month: new Date(k + '-01').toLocaleString('default', { month: 'short' }), ...v }));
  }, [payments]);

  const billsPie = useMemo(() => {
    const map: Record<string, number> = {}; bills.forEach(b => { map[b.type] = (map[b.type] || 0) + b.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [bills]);

  const propPerformance = useMemo(() => properties.map(p => {
    const tenants = activeTenants.filter(t => t.propertyId === p.id);
    const collected = payments.filter(x => tenants.some(t => t.id === x.tenantId) && x.status === 'Paid').reduce((s, x) => s + x.amount, 0);
    const exp = expenses.filter(e => e.propertyId === p.id).reduce((s, e) => s + e.amount, 0);
    return { name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name, revenue: collected, expense: exp, net: collected - exp, occupancy: p.totalRooms > 0 ? Math.round((tenants.length / p.totalRooms) * 100) : 0, tenants: tenants.length, rooms: p.totalRooms };
  }).sort((a, b) => b.net - a.net), [properties, activeTenants, payments, expenses]);

  const occupancyRadial = [{ name: 'Occupancy', value: occupancyRate, fill: occupancyRate >= 80 ? '#22c55e' : occupancyRate >= 60 ? '#eab308' : '#ef4444' }];
  const collectionRadial = [{ name: 'Collection', value: collectionRate, fill: collectionRate >= 80 ? '#6366f1' : collectionRate >= 60 ? '#eab308' : '#ef4444' }];

  const recentActs = useMemo(() => {
    const a: { id: string; text: string; time: string; type: 'payment' | 'maint' | 'bill'; d: Date }[] = [];
    payments.filter(p => p.status === 'Paid' && p.date).forEach(p => a.push({ id: `p-${p.id}`, text: `${p.tenantName} paid ${fmt(p.amount)} via ${p.method}`, time: p.date, type: 'payment', d: new Date(p.date) }));
    bills.filter(b => b.status === 'Paid' && b.paidDate).forEach(b => { const t = tenants.find(t => t.id === b.tenantId); a.push({ id: `b-${b.id}`, text: `${t?.name || ''} paid ${b.type} bill ${fmt(b.amount)}`, time: b.paidDate!, type: 'bill', d: new Date(b.paidDate!) }); });
    maintenance.forEach(m => a.push({ id: `m-${m.id}`, text: `${m.status}: ${m.category} - ${m.tenantName}`, time: m.resolvedDate || m.createdDate, type: 'maint', d: new Date(m.resolvedDate || m.createdDate) }));
    return a.sort((x, y) => y.d.getTime() - x.d.getTime()).slice(0, 12);
  }, [payments, bills, maintenance, tenants]);

  const fmtAgo = (s: string) => { const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000); return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : d < 30 ? `${d}d ago` : formatDate(s); };

  // Alert counts
  const alertCounts = { all: overdueTenantIds.length + dueSoonTenants.length + leaseExpiring30.length + leaseExpired.length + urgentMaint.length, overdue: overdueTenantIds.length, due: dueSoonTenants.length, lease: leaseExpiring30.length + leaseExpired.length, maint: urgentMaint.length };

  // KPI component
  const Kpi = ({ label, value, icon: Icon, color, sub, up, down, accent }: any) => (
    <div className={`relative bg-white rounded-2xl border p-4 overflow-hidden transition-all hover:shadow-md ${accent ? accent : 'border-gray-100 shadow-sm'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`${color} p-2 rounded-xl shadow-sm`}><Icon className="w-4 h-4 text-white" /></div>
        {up && <ArrowUpRight className="w-4 h-4 text-emerald-500" />}
        {down && <ArrowDownRight className="w-4 h-4 text-red-500" />}
      </div>
      <div className="text-lg font-black text-gray-900 leading-tight truncate">{value}</div>
      <div className="text-[11px] text-gray-500 font-medium mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
            <p className="text-[10px] text-gray-400 font-medium">Occupancy</p>
            <p className={`text-sm font-black ${occupancyRate >= 80 ? 'text-emerald-600' : occupancyRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{occupancyRate}%</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
            <p className="text-[10px] text-gray-400 font-medium">Collection</p>
            <p className={`text-sm font-black ${collectionRate >= 80 ? 'text-indigo-600' : 'text-amber-600'}`}>{collectionRate}%</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
            <p className="text-[10px] text-gray-400 font-medium">Net This Month</p>
            <p className={`text-sm font-black ${thisMonthNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtShort(thisMonthNet)}</p>
          </div>
        </div>
      </div>

      {/* ── ALERT CENTER ── */}
      {alertCounts.all > 0 && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <BellRing className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Action Center</h3>
            <span className="ml-auto text-[10px] text-slate-400">{alertCounts.all} items need attention</span>
          </div>
          <div className="flex gap-1.5 mb-3 overflow-x-auto">
            {(['all', 'overdue', 'due', 'lease', 'maint'] as const).map(k => (
              <button key={k} onClick={() => setActiveAlert(k)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition ${activeAlert === k ? 'bg-white text-slate-900' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}>
                {k === 'all' ? 'All' : k === 'overdue' ? 'Overdue' : k === 'due' ? 'Due Soon' : k === 'lease' ? 'Lease' : 'Urgent'} ({alertCounts[k]})
              </button>
            ))}
          </div>
          <div className="space-y-1.5 max-h-[130px] overflow-y-auto">
            {activeAlert === 'all' || activeAlert === 'overdue' ? overdueTenantIds.slice(0, 3).map(id => {
              const t = tenants.find(t => t.id === id); if (!t) return null;
              const amt = payments.filter(p => p.tenantId === id && p.status !== 'Paid' && p.dueDate < today).reduce((s, p) => s + (p.dueAmount - p.amount), 0);
              return <div key={`o-${id}`} className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5"><AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" /><span className="text-xs text-red-200 font-medium flex-1 truncate">{t.name} — {fmt(amt)} overdue</span><span className="text-[10px] text-red-300/70">Act now</span></div>;
            }) : null}
            {activeAlert === 'all' || activeAlert === 'due' ? dueSoonTenants.slice(0, 3).map(t => {
              const nd = payments.filter(p => p.tenantId === t.id && p.status !== 'Paid' && p.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
              return <div key={`d-${t.id}`} className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5"><Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" /><span className="text-xs text-amber-200 font-medium flex-1 truncate">{t.name} — due in {daysUntil(nd.dueDate)}d ({formatDate(nd.dueDate)})</span><span className="text-[10px] text-amber-300/70">{fmt(nd.dueAmount - nd.amount)}</span></div>;
            }) : null}
            {activeAlert === 'all' || activeAlert === 'lease' ? [...leaseExpired.slice(0, 2), ...leaseExpiring30.slice(0, 2)].map(t => {
              const exp = daysUntil(t.leaseEnd) < 0;
              return <div key={`l-${t.id}`} className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-1.5"><FileText className="w-3.5 h-3.5 text-rose-400 shrink-0" /><span className="text-xs text-rose-200 font-medium flex-1 truncate">{t.name} — {exp ? 'lease expired' : `lease ends in ${daysUntil(t.leaseEnd)}d`}</span><span className="text-[10px] text-rose-300/70">{formatDate(t.leaseEnd)}</span></div>;
            }) : null}
            {activeAlert === 'all' || activeAlert === 'maint' ? urgentMaint.slice(0, 3).map(m => (
              <div key={`m-${m.id}`} className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-1.5"><Zap className="w-3.5 h-3.5 text-orange-400 shrink-0" /><span className="text-xs text-orange-200 font-medium flex-1 truncate">{m.category} — {m.tenantName}</span><span className="text-[10px] text-orange-300/70">{m.status}</span></div>
            )) : null}
          </div>
        </div>
      )}

      {/* ── HERO KPI ROW ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Kpi label="Properties" value={properties.length} icon={Building2} color="bg-blue-500" sub={`${totalUnits} units`} />
        <Kpi label="Occupancy" value={`${occupancyRate}%`} icon={BarChart3} color={occupancyRate >= 80 ? 'bg-emerald-500' : 'bg-amber-500'} sub={`${occupiedUnits}/${totalUnits} filled`} up={occupancyRate >= 80} />
        <Kpi label="Vacant Units" value={vacantUnits} icon={DoorOpen} color="bg-amber-500" sub={`Loss ${fmtShort(vacancyLoss)}/mo`} down={vacantUnits > 0} />
        <Kpi label="Monthly Revenue" value={fmtShort(monthlyReceivable)} icon={CircleDollarSign} color="bg-indigo-500" sub={`Avg ${fmtShort(avgRent)}/unit`} />
        <Kpi label="Collected (Mo)" value={fmtShort(thisMonthPaid)} icon={TrendingUp} color="bg-emerald-500" sub={`Bills: ${fmtShort(thisMonthBills)}`} up />
        <Kpi label="Outstanding" value={fmtShort(totalPending)} icon={AlertCircle} color="bg-red-500" sub={`${overdueTenantIds.length} overdue`} down={totalPending > 0} />
      </div>

      {/* ── SECONDARY KPI ROW ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Kpi label="Collection Rate" value={`${collectionRate}%`} icon={Percent} color="bg-purple-500" sub="This month" up={collectionRate >= 80} />
        <Kpi label="Active Tenants" value={activeTenants.length} icon={Users} color="bg-teal-500" sub={`${noticeTenants.length} on notice`} />
        <button onClick={() => setLeaseModal('expired')} disabled={leaseExpired.length === 0} className="text-left bg-white rounded-2xl border border-red-200 shadow-sm p-3.5 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          <div className="flex items-start justify-between mb-2">
            <div className="bg-red-600 p-2 rounded-xl shadow-sm"><FileText className="w-4 h-4 text-white" /></div>
            {leaseExpired.length > 0 && <ArrowDownRight className="w-4 h-4 text-red-500" />}
          </div>
          <div className="text-lg font-black text-red-600 leading-tight">{leaseExpired.length}</div>
          <div className="text-[11px] text-gray-500 font-medium mt-0.5">Expired Leases</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Tap to view</div>
        </button>
        <Kpi label="Open Maint." value={openMaint + progressMaint} icon={Wrench} color="bg-orange-500" sub={`${urgentMaint.length} urgent`} down={urgentMaint.length > 0} />
        <Kpi label="Net Profit (Mo)" value={fmtShort(thisMonthNet)} icon={Wallet} color={thisMonthNet >= 0 ? 'bg-emerald-600' : 'bg-red-600'} sub={`Exp: ${fmtShort(thisMonthExpenses)}`} up={thisMonthNet >= 0} down={thisMonthNet < 0} />
        <Kpi label="Deposits Held" value={fmtShort(totalDeposits)} icon={Layers} color="bg-slate-600" sub={`${activeTenants.length} tenants`} />
      </div>

      {/* ── LEASE EXPIRY TRACKER (clickable) ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-rose-500" /> Lease Expiry Tracker</h3>
          <span className="text-[10px] text-gray-400">Click a card to view tenants</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            { key: 'expired' as const, label: 'Expired', days: 'Overdue', list: leaseExpired, color: 'from-red-600 to-rose-600', badge: 'bg-red-100 text-red-700', urgent: true },
            { key: '30' as const, label: 'Expiring in 30 days', days: '0-30 days', list: leaseExpiring30, color: 'from-rose-500 to-orange-500', badge: 'bg-orange-100 text-orange-700', urgent: true },
            { key: '60' as const, label: 'Expiring in 60 days', days: '31-60 days', list: leaseExpiring60, color: 'from-amber-500 to-yellow-500', badge: 'bg-amber-100 text-amber-700', urgent: false },
            { key: '90' as const, label: 'Expiring in 90 days', days: '61-90 days', list: leaseExpiring90, color: 'from-blue-500 to-indigo-500', badge: 'bg-blue-100 text-blue-700', urgent: false },
          ]).map(card => (
            <button key={card.key} onClick={() => setLeaseModal(card.key)} disabled={card.list.length === 0}
              className={`text-left relative overflow-hidden rounded-xl p-4 transition-all ${card.list.length === 0 ? 'bg-gray-50 border border-gray-100 cursor-not-allowed opacity-60' : `bg-gradient-to-br ${card.color} text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer`}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="text-3xl font-black leading-none">{card.list.length}</div>
                {card.urgent && card.list.length > 0 && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              </div>
              <p className="text-[11px] font-bold opacity-90 leading-tight">{card.label}</p>
              <p className="text-[10px] opacity-70 mt-0.5">{card.days}</p>
              {card.list.length > 0 && <p className="text-[10px] font-semibold mt-2 opacity-90">Tap to view →</p>}
            </button>
          ))}
        </div>
      </div>

      {/* ── CHART ROW 1: Trend + Radials ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-500" /> Income vs Expense</h3>
            <span className="text-[10px] text-gray-400">Last 6 months</span>
          </div>
          {monthlyTrend.some(d => d.income > 0 || d.expense > 0) ? (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                  <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: any) => [fmt(Number(v)), '']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2.5} fill="url(#gi)" name="Income" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2.5} fill="url(#ge)" name="Expense" />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-[210px] text-gray-400 text-sm">No financial data yet</div>}
        </div>

        {/* Radial gauges */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Occupancy</h3>
          <ResponsiveContainer width="100%" height={150}>
            <RadialBarChart innerRadius="65%" outerRadius="100%" data={occupancyRadial} startAngle={90} endAngle={-270}>
              <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={10} />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#1e293b" fontSize="24" fontWeight="900">{occupancyRate}%</text>
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="text-center -mt-2">
            <p className="text-[11px] text-gray-500">{occupiedUnits} of {totalUnits} units</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{vacantUnits} vacant</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Collection</h3>
          <ResponsiveContainer width="100%" height={150}>
            <RadialBarChart innerRadius="65%" outerRadius="100%" data={collectionRadial} startAngle={90} endAngle={-270}>
              <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={10} />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#1e293b" fontSize="24" fontWeight="900">{collectionRate}%</text>
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="text-center -mt-2">
            <p className="text-[11px] text-gray-500">{fmtShort(thisMonthPaid)} of {fmtShort(monthlyReceivable)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{fmtShort(totalPending)} pending</p>
          </div>
        </div>
      </div>

      {/* ── CHART ROW 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-500" /> Collection vs Dues</h3>
          {collectionBars.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={collectionBars} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: any) => [fmt(Number(v)), '']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="collected" fill="#22c55e" radius={[4, 4, 0, 0]} name="Collected" />
                <Bar dataKey="dues" fill="#ef4444" radius={[4, 4, 0, 0]} name="Pending" />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-[180px] text-gray-400 text-sm">No data</div>}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><PieIcon className="w-4 h-4 text-orange-500" /> Bills Breakdown</h3>
          {billsPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={billsPie} cx="50%" cy="50%" innerRadius={38} outerRadius={65} paddingAngle={3} dataKey="value">
                  {billsPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [fmt(Number(v)), '']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-[180px] text-gray-400 text-sm">No bills</div>}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {billsPie.map((b, i) => <span key={b.name} className="flex items-center gap-1 text-[10px] text-gray-600"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{b.name}</span>)}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Receipt className="w-4 h-4 text-emerald-500" /> Payment Status</h3>
          {paymentPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={paymentPie} cx="50%" cy="50%" innerRadius={38} outerRadius={65} paddingAngle={3} dataKey="value">
                  {paymentPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-[180px] text-gray-400 text-sm">No payments</div>}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {paymentPie.map((p, i) => <span key={p.name} className="flex items-center gap-1 text-[10px] text-gray-600"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{p.name} ({p.value})</span>)}
          </div>
        </div>
      </div>

      {/* ── PROPERTY PERFORMANCE ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-500" /> Property Performance</h3>
          <span className="text-[10px] text-gray-400">Ranked by net profit</span>
        </div>
        {propPerformance.length > 0 ? (
          <div className="space-y-2.5">
            {propPerformance.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600' : 'bg-gray-100 text-gray-500'}`}>#{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-800 truncate">{p.name}</span>
                    <span className={`text-xs font-black ${p.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtShort(p.net)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${p.occupancy >= 90 ? 'bg-emerald-500' : p.occupancy >= 70 ? 'bg-blue-500' : p.occupancy >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(p.occupancy, 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500 shrink-0">{p.tenants}/{p.rooms} · {p.occupancy}%</span>
                    <span className="text-[10px] text-gray-400 shrink-0">Rev {fmtShort(p.revenue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="flex items-center justify-center h-[100px] text-gray-400 text-sm">Add properties to see performance</div>}
      </div>

      {/* ── BOTTOM: Activity + Snapshot ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-500" /> Recent Activity</h3>
            <span className="text-[10px] text-gray-400">{recentActs.length} recent events</span>
          </div>
          {recentActs.length > 0 ? (
            <div className="space-y-1 max-h-[280px] overflow-y-auto">
              {recentActs.map(a => (
                <div key={a.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 transition">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.type === 'payment' ? 'bg-emerald-50' : a.type === 'bill' ? 'bg-orange-50' : 'bg-blue-50'}`}>
                    {a.type === 'payment' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : a.type === 'bill' ? <Receipt className="w-4 h-4 text-orange-600" /> : <Wrench className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-800 font-medium leading-snug truncate">{a.text}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{fmtAgo(a.time)}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                </div>
              ))}
            </div>
          ) : <div className="flex items-center justify-center h-[120px] text-gray-400 text-sm">No activity yet</div>}
        </div>

        {/* Financial Snapshot */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 shadow-lg text-white">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Wallet className="w-4 h-4 text-indigo-400" /> Financial Snapshot</h3>
          <div className="space-y-2.5">
            {[
              ['Monthly Income', fmt(monthlyReceivable), 'text-emerald-400'],
              ['Annual Income', fmt(monthlyReceivable * 12), 'text-emerald-400'],
              ['Total Collected', fmt(totalCollected), 'text-emerald-400'],
              ['Total Expenses', fmt(totalExpensesAll), 'text-red-400'],
              ['Bills Collected', fmt(billsCollected), 'text-cyan-400'],
              ['Bills Pending', fmt(billsPending), 'text-orange-400'],
              ['Overdue Amount', fmt(totalOverdue), 'text-red-400'],
              ['Vacancy Loss', fmt(vacancyLoss), 'text-amber-400'],
              ['Profit Margin', `${profitMargin}%`, profitMargin >= 0 ? 'text-emerald-400' : 'text-red-400'],
              ['Net This Month', fmt(thisMonthNet), thisMonthNet >= 0 ? 'text-emerald-400' : 'text-red-400'],
            ].map(([l, v, c]) => (
              <div key={l} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                <span className="text-[11px] text-slate-300">{l}</span>
                <span className={`text-xs font-bold ${c}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-2">
            <div className="text-center"><p className="text-lg font-black text-white">{payments.length}</p><p className="text-[9px] text-slate-400">Payments</p></div>
            <div className="text-center"><p className="text-lg font-black text-white">{maintenance.length}</p><p className="text-[9px] text-slate-400">Maint. Tickets</p></div>
          </div>
        </div>
      </div>

      {/* ── LEASE EXPIRY MODAL ── */}
      {leaseModal && (() => {
        const cfg = {
          'expired': { list: leaseExpired, title: 'Expired Leases', sub: 'Leases past end date — action required', color: 'from-red-600 to-rose-600' },
          '30': { list: leaseExpiring30, title: 'Expiring in 30 Days', sub: 'Renewal needed within this month', color: 'from-rose-500 to-orange-500' },
          '60': { list: leaseExpiring60, title: 'Expiring in 60 Days', sub: 'Renewals between 31-60 days', color: 'from-amber-500 to-yellow-500' },
          '90': { list: leaseExpiring90, title: 'Expiring in 90 Days', sub: 'Renewals between 61-90 days', color: 'from-blue-500 to-indigo-500' },
        }[leaseModal];
        const totalRentAtRisk = cfg.list.reduce((s, t) => s + t.rent, 0);
        const totalDeposit = cfg.list.reduce((s, t) => s + t.deposit, 0);
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setLeaseModal(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className={`bg-gradient-to-r ${cfg.color} p-5 text-white`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-black">{cfg.title}</h3>
                    <p className="text-xs text-white/80 mt-0.5">{cfg.sub}</p>
                  </div>
                  <button onClick={() => setLeaseModal(null)} className="p-1.5 hover:bg-white/20 rounded-lg transition"><X className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-white/15 rounded-lg p-2 text-center backdrop-blur-sm">
                    <p className="text-lg font-black">{cfg.list.length}</p>
                    <p className="text-[10px] text-white/70">Tenants</p>
                  </div>
                  <div className="bg-white/15 rounded-lg p-2 text-center backdrop-blur-sm">
                    <p className="text-sm font-black">{fmtShort(totalRentAtRisk)}</p>
                    <p className="text-[10px] text-white/70">Rent/mo at risk</p>
                  </div>
                  <div className="bg-white/15 rounded-lg p-2 text-center backdrop-blur-sm">
                    <p className="text-sm font-black">{fmtShort(totalDeposit)}</p>
                    <p className="text-[10px] text-white/70">Deposits held</p>
                  </div>
                </div>
              </div>

              {/* Tenant list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {cfg.list.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium">No leases in this range</p>
                    <p className="text-xs mt-1">All good — nothing expiring here</p>
                  </div>
                ) : cfg.list.sort((a, b) => (a.leaseEnd || '').localeCompare(b.leaseEnd || '')).map(t => {
                  const d = daysUntil(t.leaseEnd);
                  const prop = properties.find(p => p.id === t.propertyId);
                  const unpaid = payments.filter(p => p.tenantId === t.id && p.status !== 'Paid').reduce((s, p) => s + (p.dueAmount - p.amount), 0);
                  return (
                    <div key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border ${d < 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'} hover:shadow-sm transition`}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ backgroundColor: t.avatarColor }}>
                        {t.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-900 truncate">{t.name}</p>
                          {t.room && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-semibold">Room {t.room}</span>}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">{prop?.name || 'Not assigned'}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-[10px] text-gray-500">📞 {t.phone || '—'}</span>
                          <span className="text-[10px] font-medium text-gray-600">Rent {fmt(t.rent)}/mo</span>
                          {unpaid > 0 && <span className="text-[10px] font-bold text-red-600">Due {fmt(unpaid)}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-[11px] font-black ${d < 0 ? 'text-red-600' : d <= 30 ? 'text-orange-600' : 'text-blue-600'}`}>
                          {d < 0 ? `${Math.abs(d)}d ago` : `${d} days left`}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(t.leaseEnd)}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">Joined {formatDate(t.leaseStart)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
