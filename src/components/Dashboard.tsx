import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { Property, Tenant, RentPayment, MaintenanceRequest, Expense, TenantBill } from '../types';
import { formatDate } from '../utils/helpers';
import { Building2, Wrench, TrendingUp, TrendingDown, CalendarClock, Wallet, CircleDollarSign, ArrowUpRight, ArrowDownRight, Receipt, AlertCircle, Users, DoorOpen, BarChart3, FileText, Percent } from 'lucide-react';

interface Props { properties: Property[]; tenants: Tenant[]; payments: RentPayment[]; maintenance: MaintenanceRequest[]; expenses: Expense[]; bills: TenantBill[]; }

const COLORS = ['#22c55e', '#f97316', '#ef4444', '#6366f1', '#8b5cf6', '#06b6d4'];
const fmt = (n: number) => `Rs ${n.toLocaleString('en-IN')}`;

export default function Dashboard({ properties, tenants, payments, maintenance, expenses, bills }: Props) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);

  // ── TENANT KPIs ──
  const activeTenants = tenants.filter(t => t.status === 'Active');
  const noticeTenants = tenants.filter(t => t.status === 'Notice');
  const inactiveTenants = tenants.filter(t => t.status === 'Inactive');
  const tenantsWithBalance = activeTenants.filter(t => payments.some(p => p.tenantId === t.id && p.status !== 'Paid'));

  // ── PROPERTY KPIs ──
  const totalUnits = properties.reduce((s, p) => s + p.totalRooms, 0);
  const occupiedUnits = activeTenants.length;
  const vacantUnits = Math.max(totalUnits - occupiedUnits, 0);
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const propertiesWithVacancy = properties.filter(p => {
    const occ = tenants.filter(t => t.propertyId === p.id && t.status === 'Active').length;
    return occ < p.totalRooms;
  }).length;

  // ── FINANCIAL KPIs ──
  const monthlyRentReceivable = activeTenants.reduce((s, t) => s + t.rent, 0);
  const annualRentIncome = monthlyRentReceivable * 12;
  const totalCollected = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const totalOverdue = payments.filter(p => p.status !== 'Paid' && p.dueDate && p.dueDate < today).reduce((s, p) => s + (p.dueAmount - p.amount), 0);
  const totalPending = payments.filter(p => p.status !== 'Paid').reduce((s, p) => s + (p.dueAmount - p.amount), 0);
  const thisMonthPaid = payments.filter(p => p.status === 'Paid' && p.date?.startsWith(thisMonth)).reduce((s, p) => s + p.amount, 0);
  const thisMonthBills = bills.filter(b => b.status === 'Paid' && b.paidDate?.startsWith(thisMonth)).reduce((s, b) => s + b.amount, 0);
  const thisMonthIncome = thisMonthPaid + thisMonthBills;
  const thisMonthExpenses = expenses.filter(e => e.date?.startsWith(thisMonth)).reduce((s, e) => s + e.amount, 0);
  const thisMonthNet = thisMonthIncome - thisMonthExpenses;
  const collectionRate = monthlyRentReceivable > 0 ? Math.round((thisMonthPaid / monthlyRentReceivable) * 100) : 0;
  const avgRentPerUnit = activeTenants.length > 0 ? Math.round(monthlyRentReceivable / activeTenants.length) : 0;
  const totalDeposits = activeTenants.reduce((s, t) => s + t.deposit, 0);
  const vacancyLoss = vacantUnits * avgRentPerUnit;
  const latePayments = payments.filter(p => p.status === 'Overdue').length;
  const totalExpensesAll = expenses.reduce((s, e) => s + e.amount, 0);
  const profitMargin = totalCollected > 0 ? Math.round(((totalCollected - totalExpensesAll) / totalCollected) * 100) : 0;

  // Bills
  const billsPending = bills.filter(b => b.status === 'Pending').reduce((s, b) => s + b.amount, 0);
  const billsCollected = bills.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);

  // ── LEASE KPIs ──
  const leaseExpiring30 = activeTenants.filter(t => { if (!t.leaseEnd) return false; const diff = Math.floor((new Date(t.leaseEnd).getTime() - now.getTime()) / 86400000); return diff >= 0 && diff <= 30; }).length;
  const leaseExpiring60 = activeTenants.filter(t => { if (!t.leaseEnd) return false; const diff = Math.floor((new Date(t.leaseEnd).getTime() - now.getTime()) / 86400000); return diff >= 0 && diff <= 60; }).length;
  const leaseExpiring90 = activeTenants.filter(t => { if (!t.leaseEnd) return false; const diff = Math.floor((new Date(t.leaseEnd).getTime() - now.getTime()) / 86400000); return diff >= 0 && diff <= 90; }).length;
  const expiredLeases = tenants.filter(t => t.leaseEnd && t.leaseEnd < today && t.status === 'Active').length;

  // ── MAINTENANCE KPIs ──
  const openMaint = maintenance.filter(m => m.status === 'Open').length;
  const inProgressMaint = maintenance.filter(m => m.status === 'In Progress').length;
  const resolvedMaint = maintenance.filter(m => m.status === 'Resolved' || m.status === 'Closed').length;
  const urgentMaint = maintenance.filter(m => m.priority === 'Urgent' && (m.status === 'Open' || m.status === 'In Progress')).length;
  const maintCostMonth = maintenance.filter(m => m.createdDate?.startsWith(thisMonth)).reduce((s, m) => s + m.repairCost, 0);

  // Counts
  const paidCount = payments.filter(p => p.status === 'Paid').length;
  const pendingCount = payments.filter(p => p.status === 'Pending').length;
  const overdueCount = payments.filter(p => p.status === 'Overdue').length;
  const partialCount = payments.filter(p => p.status === 'Partial').length;
  const nextMonthStr = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleString('default', { month: 'long' });

  // ── CHART DATA ──
  const paymentPieData = [{ name: 'Paid', value: paidCount }, { name: 'Pending', value: pendingCount }, { name: 'Overdue', value: overdueCount }, { name: 'Partial', value: partialCount }].filter(d => d.value > 0);

  const monthlyTrend = useMemo(() => {
    const months: string[] = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); months.push(d.toISOString().slice(0, 7)); }
    return months.map(m => {
      const inc = payments.filter(p => p.status === 'Paid' && p.date?.startsWith(m)).reduce((s, p) => s + p.amount, 0) + bills.filter(b => b.status === 'Paid' && b.paidDate?.startsWith(m)).reduce((s, b) => s + b.amount, 0);
      const exp = expenses.filter(e => e.date?.startsWith(m)).reduce((s, e) => s + e.amount, 0);
      return { month: new Date(m + '-01').toLocaleString('default', { month: 'short' }), income: inc, expense: exp, net: inc - exp };
    });
  }, [payments, bills, expenses]);

  const collectionData = useMemo(() => {
    const map: Record<string, { collected: number; dues: number }> = {};
    payments.forEach(p => { const key = (p.status === 'Paid' && p.date ? p.date : p.dueDate)?.slice(0, 7); if (!key) return; if (!map[key]) map[key] = { collected: 0, dues: 0 }; if (p.status === 'Paid') map[key].collected += p.amount; else map[key].dues += (p.dueAmount - p.amount); });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([key, val]) => ({ month: new Date(key + '-01').toLocaleString('default', { month: 'short' }), ...val }));
  }, [payments]);

  const billsPieData = useMemo(() => {
    const map: Record<string, number> = {}; bills.forEach(b => { map[b.type] = (map[b.type] || 0) + b.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [bills]);

  const rentDist = useMemo(() => activeTenants.map(t => ({ name: t.name.split(' ')[0], rent: t.rent })).sort((a, b) => b.rent - a.rent).slice(0, 8), [activeTenants]);

  const recentActs = useMemo(() => {
    const a: { id: string; text: string; time: string; type: 'payment' | 'maint' | 'bill'; sortDate: Date }[] = [];
    payments.filter(p => p.status === 'Paid' && p.date).forEach(p => a.push({ id: `p-${p.id}`, text: `${p.tenantName} paid Rs ${p.amount.toLocaleString()} via ${p.method}`, time: p.date, type: 'payment', sortDate: new Date(p.date) }));
    bills.filter(b => b.status === 'Paid' && b.paidDate).forEach(b => { const t = tenants.find(t => t.id === b.tenantId); a.push({ id: `b-${b.id}`, text: `${t?.name || ''} paid ${b.type} bill Rs ${b.amount.toLocaleString()}`, time: b.paidDate!, type: 'bill', sortDate: new Date(b.paidDate!) }); });
    maintenance.forEach(m => a.push({ id: `m-${m.id}`, text: `${m.status}: ${m.category} - ${m.tenantName}`, time: m.resolvedDate || m.createdDate, type: 'maint', sortDate: new Date(m.resolvedDate || m.createdDate) }));
    return a.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime()).slice(0, 10);
  }, [payments, bills, maintenance, tenants]);

  const fmtAgo = (s: string) => { const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000); return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : d < 30 ? `${d}d ago` : formatDate(s); };

  // KPI card helper
  const KPI = ({ label, value, icon: Icon, color, sub, up, down }: { label: string; value: string | number; icon: any; color: string; sub?: string; up?: boolean; down?: boolean }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3.5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-1.5">
        <div className={`${color} p-1.5 rounded-lg`}><Icon className="w-3.5 h-3.5 text-white" /></div>
        {up && <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />}
        {down && <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />}
      </div>
      <div className="text-base font-bold text-gray-900 truncate leading-tight">{value}</div>
      <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{label}</div>
      {sub && <div className="text-[9px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-2xl font-bold text-gray-900">Dashboard</h1><p className="text-gray-500 text-sm mt-1">Real-time property management overview</p></div>
        <div className="text-xs text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-100">{now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>

      {/* ── TOP 12 KPI ROW ── */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Key Metrics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          <KPI label="Total Properties" value={properties.length} icon={Building2} color="bg-blue-500" sub={`${totalUnits} units`} />
          <KPI label="Occupancy Rate" value={`${occupancyRate}%`} icon={BarChart3} color="bg-emerald-500" sub={`${occupiedUnits}/${totalUnits} units`} up={occupancyRate >= 80} />
          <KPI label="Vacant Units" value={vacantUnits} icon={DoorOpen} color="bg-amber-500" sub={`${propertiesWithVacancy} properties`} down={vacantUnits > 0} />
          <KPI label="Expected Revenue" value={fmt(monthlyRentReceivable)} icon={CircleDollarSign} color="bg-indigo-500" sub="/month" />
          <KPI label="Received This Month" value={fmt(thisMonthPaid)} icon={TrendingUp} color="bg-green-500" sub={`Bills: ${fmt(thisMonthBills)}`} up />
          <KPI label="Outstanding Rent" value={fmt(totalPending)} icon={AlertCircle} color="bg-red-500" sub={`${pendingCount + overdueCount} dues`} down={totalPending > 0} />
          <KPI label="Collection Rate" value={`${collectionRate}%`} icon={Percent} color="bg-purple-500" sub="This month" up={collectionRate >= 80} />
          <KPI label="Active Tenants" value={activeTenants.length} icon={Users} color="bg-teal-500" sub={`${noticeTenants.length} on notice`} />
          <KPI label="Lease Renewals" value={leaseExpiring30} icon={FileText} color="bg-rose-500" sub="Due within 30 days" down={leaseExpiring30 > 0} />
          <KPI label="Open Maintenance" value={openMaint + inProgressMaint} icon={Wrench} color="bg-orange-500" sub={`${urgentMaint} urgent`} down={urgentMaint > 0} />
          <KPI label="Net Profit" value={fmt(thisMonthNet)} icon={Wallet} color={thisMonthNet >= 0 ? 'bg-emerald-600' : 'bg-red-600'} sub="This month" up={thisMonthNet >= 0} down={thisMonthNet < 0} />
          <KPI label="Vacancy Loss" value={fmt(vacancyLoss)} icon={TrendingDown} color="bg-slate-500" sub="/month potential" down={vacancyLoss > 0} />
        </div>
      </div>

      {/* ── FORECAST ROW ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1 opacity-80"><CalendarClock className="w-4 h-4" /><span className="text-xs font-medium">{nextMonthStr} Forecast</span></div>
          <p className="text-2xl font-bold">{fmt(monthlyRentReceivable)}</p>
          <p className="text-[10px] opacity-70 mt-0.5">Expected rent + {fmt(billsPending)} bills</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1 opacity-80"><AlertCircle className="w-4 h-4" /><span className="text-xs font-medium">Overdue</span></div>
          <p className="text-2xl font-bold">{fmt(totalOverdue)}</p>
          <p className="text-[10px] opacity-70 mt-0.5">{overdueCount} overdue | {latePayments} late</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1 opacity-80"><Receipt className="w-4 h-4" /><span className="text-xs font-medium">Bills & Deposits</span></div>
          <p className="text-2xl font-bold">{fmt(billsPending)}</p>
          <p className="text-[10px] opacity-70 mt-0.5">Pending | Deposits held: {fmt(totalDeposits)}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1 opacity-80"><Wallet className="w-4 h-4" /><span className="text-xs font-medium">Cash Flow</span></div>
          <p className="text-2xl font-bold">{fmt(thisMonthNet)}</p>
          <p className="text-[10px] opacity-70 mt-0.5">Margin: {profitMargin}% | Expenses: {fmt(thisMonthExpenses)}</p>
        </div>
      </div>

      {/* ── DETAILED KPI SECTIONS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Financial */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><CircleDollarSign className="w-3.5 h-3.5" /> Financial</h4>
          <div className="space-y-2">
            {[['Monthly Income', fmt(monthlyRentReceivable)], ['Annual Income', fmt(annualRentIncome)], ['Avg Rent/Unit', fmt(avgRentPerUnit)], ['Total Collected', fmt(totalCollected)], ['Total Expenses', fmt(totalExpensesAll)], ['Bills Collected', fmt(billsCollected)]].map(([l, v]) => (
              <div key={l} className="flex justify-between"><span className="text-xs text-gray-500">{l}</span><span className="text-xs font-bold text-gray-800">{v}</span></div>
            ))}
          </div>
        </div>
        {/* Tenant */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Tenants</h4>
          <div className="space-y-2">
            {[['Active', String(activeTenants.length)], ['On Notice', String(noticeTenants.length)], ['Inactive', String(inactiveTenants.length)], ['With Balance', String(tenantsWithBalance.length)], ['Deposits Held', fmt(totalDeposits)], ['Total', String(tenants.length)]].map(([l, v]) => (
              <div key={l} className="flex justify-between"><span className="text-xs text-gray-500">{l}</span><span className="text-xs font-bold text-gray-800">{v}</span></div>
            ))}
          </div>
        </div>
        {/* Lease */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Leases</h4>
          <div className="space-y-2">
            {[['Expiring 30 days', String(leaseExpiring30)], ['Expiring 60 days', String(leaseExpiring60)], ['Expiring 90 days', String(leaseExpiring90)], ['Expired (Active)', String(expiredLeases)], ['Vacancy Loss', fmt(vacancyLoss)]].map(([l, v]) => (
              <div key={l} className="flex justify-between"><span className="text-xs text-gray-500">{l}</span><span className={`text-xs font-bold ${Number(v) > 0 && l !== 'Vacancy Loss' ? 'text-red-600' : 'text-gray-800'}`}>{v}</span></div>
            ))}
          </div>
        </div>
        {/* Maintenance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" /> Maintenance</h4>
          <div className="space-y-2">
            {[['Open', String(openMaint)], ['In Progress', String(inProgressMaint)], ['Resolved/Closed', String(resolvedMaint)], ['Urgent', String(urgentMaint)], ['Cost This Month', fmt(maintCostMonth)], ['Total Requests', String(maintenance.length)]].map(([l, v]) => (
              <div key={l} className="flex justify-between"><span className="text-xs text-gray-500">{l}</span><span className={`text-xs font-bold ${l === 'Urgent' && Number(v) > 0 ? 'text-red-600' : 'text-gray-800'}`}>{v}</span></div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CHARTS ROW 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Income vs Expense (6 months)</h3>
          {monthlyTrend.some(d => d.income > 0 || d.expense > 0) ? (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                  <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`Rs ${Number(v).toLocaleString()}`, '']} />
                <Area type="monotone" dataKey="income" stroke="#22c55e" fill="url(#gi)" strokeWidth={2} name="Income" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#ge)" strokeWidth={2} name="Expense" />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-[230px] text-gray-400 text-sm">No data yet</div>}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Status</h3>
          {paymentPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart><Pie data={paymentPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                  {paymentPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-1 justify-center">{paymentPieData.map((e, i) => <div key={e.name} className="flex items-center gap-1 text-[10px]"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} /><span className="text-gray-600">{e.name} ({e.value})</span></div>)}</div>
            </>
          ) : <div className="flex items-center justify-center h-[160px] text-gray-400 text-sm">No data</div>}
        </div>
      </div>

      {/* ── CHARTS ROW 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Collection vs Dues</h3>
          {collectionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={collectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`Rs ${Number(v).toLocaleString()}`, '']} />
                <Bar dataKey="collected" fill="#22c55e" radius={[3, 3, 0, 0]} name="Collected" />
                <Bar dataKey="dues" fill="#ef4444" radius={[3, 3, 0, 0]} name="Pending" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-[190px] text-gray-400 text-sm">No data</div>}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Bills Breakdown</h3>
          {billsPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <PieChart><Pie data={billsPieData} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                {billsPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip formatter={(v: any) => [`Rs ${Number(v).toLocaleString()}`, '']} /></PieChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-[190px] text-gray-400 text-sm">No bills</div>}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Rent by Tenant</h3>
          {rentDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={rentDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={55} />
                <Tooltip formatter={(v: any) => [`Rs ${Number(v).toLocaleString()}`, 'Rent']} />
                <Bar dataKey="rent" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-[190px] text-gray-400 text-sm">No tenants</div>}
        </div>
      </div>

      {/* ── BOTTOM ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Property Occupancy</h3>
          {properties.length > 0 ? (
            <div className="space-y-2.5">
              {properties.map(p => {
                const occ = tenants.filter(t => t.propertyId === p.id && t.status === 'Active').length;
                const pct = p.totalRooms > 0 ? Math.min(Math.round((occ / p.totalRooms) * 100), 100) : 0;
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between mb-1"><span className="text-xs text-gray-700 truncate max-w-[180px]">{p.name}</span><span className="text-[10px] font-medium text-gray-500">{occ}/{p.totalRooms} ({pct}%)</span></div>
                    <div className="w-full bg-gray-100 rounded-full h-2"><div className={`h-2 rounded-full ${pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-blue-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          ) : <div className="flex items-center justify-center h-[100px] text-gray-400 text-sm">Add properties</div>}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h3>
          {recentActs.length > 0 ? (
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {recentActs.map(a => (
                <div key={a.id} className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-gray-50">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.type === 'payment' ? 'bg-green-500' : a.type === 'bill' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                  <div><p className="text-[11px] text-gray-700 leading-snug">{a.text}</p><p className="text-[9px] text-gray-400 mt-0.5">{fmtAgo(a.time)}</p></div>
                </div>
              ))}
            </div>
          ) : <div className="flex items-center justify-center h-[100px] text-gray-400 text-sm">No activity</div>}
        </div>
      </div>
    </div>
  );
}
