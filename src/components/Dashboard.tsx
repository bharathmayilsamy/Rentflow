import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { Property, Tenant, RentPayment, MaintenanceRequest, Expense, TenantBill } from '../types';
import { Building2, Wrench, TrendingUp, TrendingDown, CalendarClock, Wallet, CircleDollarSign, ArrowUpRight, ArrowDownRight, Receipt, AlertCircle } from 'lucide-react';

interface Props {
  properties: Property[];
  tenants: Tenant[];
  payments: RentPayment[];
  maintenance: MaintenanceRequest[];
  expenses: Expense[];
  bills: TenantBill[];
}

const COLORS = ['#22c55e', '#f97316', '#ef4444', '#6366f1', '#8b5cf6', '#06b6d4'];

export default function Dashboard({ properties, tenants, payments, maintenance, expenses, bills }: Props) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const activeTenants = tenants.filter(t => t.status === 'Active');

  // ── Core KPIs ──
  const totalCollected = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  // Only unpaid balance — NOT total dueAmount of all records
  const totalPending = payments.filter(p => p.status !== 'Paid').reduce((s, p) => s + (p.dueAmount - p.amount), 0);
  const totalOverdue = payments.filter(p => p.status !== 'Paid' && p.dueDate && p.dueDate < today).reduce((s, p) => s + (p.dueAmount - p.amount), 0);
  // totalUpcoming available if needed later
  // const totalUpcoming = payments.filter(p => p.status !== 'Paid' && (!p.dueDate || p.dueDate >= today)).reduce((s, p) => s + (p.dueAmount - p.amount), 0);
  const openIssues = maintenance.filter(m => m.status === 'Open' || m.status === 'In Progress').length;
  const monthlyRentReceivable = activeTenants.reduce((s, t) => s + t.rent, 0);

  // Bills
  const billsPending = bills.filter(b => b.status === 'Pending').reduce((s, b) => s + b.amount, 0);
  const billsCollected = bills.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);

  // Expenses
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // This month
  const thisMonthPaid = payments.filter(p => p.status === 'Paid' && p.date?.startsWith(today.slice(0, 7))).reduce((s, p) => s + p.amount, 0);
  const thisMonthBills = bills.filter(b => b.status === 'Paid' && b.paidDate?.startsWith(today.slice(0, 7))).reduce((s, b) => s + b.amount, 0);
  const thisMonthExpenses = expenses.filter(e => e.date?.startsWith(today.slice(0, 7))).reduce((s, e) => s + e.amount, 0);
  const thisMonthIncome = thisMonthPaid + thisMonthBills;
  const thisMonthNet = thisMonthIncome - thisMonthExpenses;

  // Counts
  const paidCount = payments.filter(p => p.status === 'Paid').length;
  const pendingCount = payments.filter(p => p.status === 'Pending').length;
  const overdueCount = payments.filter(p => p.status === 'Overdue').length;
  const partialCount = payments.filter(p => p.status === 'Partial').length;

  // Next month
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthStr = nextMonth.toLocaleString('default', { month: 'long' });

  // ── Chart Data ──

  // Payment status pie
  const paymentPieData = [
    { name: 'Paid', value: paidCount }, { name: 'Pending', value: pendingCount },
    { name: 'Overdue', value: overdueCount }, { name: 'Partial', value: partialCount },
  ].filter(d => d.value > 0);

  // Monthly income vs expense area chart (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); months.push(d.toISOString().slice(0, 7)); }
    return months.map(m => {
      const income = payments.filter(p => p.status === 'Paid' && p.date?.startsWith(m)).reduce((s, p) => s + p.amount, 0)
        + bills.filter(b => b.status === 'Paid' && b.paidDate?.startsWith(m)).reduce((s, b) => s + b.amount, 0);
      const expense = expenses.filter(e => e.date?.startsWith(m)).reduce((s, e) => s + e.amount, 0);
      return { month: new Date(m + '-01').toLocaleString('default', { month: 'short' }), income, expense, net: income - expense };
    });
  }, [payments, bills, expenses]);

  // Collection vs Dues bar chart
  const collectionData = useMemo(() => {
    const map: Record<string, { collected: number; dues: number }> = {};
    payments.forEach(p => {
      const dateStr = p.status === 'Paid' && p.date ? p.date : p.dueDate;
      if (!dateStr) return;
      const key = dateStr.slice(0, 7);
      if (!map[key]) map[key] = { collected: 0, dues: 0 };
      if (p.status === 'Paid') map[key].collected += p.amount;
      else map[key].dues += (p.dueAmount - p.amount);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([key, val]) => ({
      month: new Date(key + '-01').toLocaleString('default', { month: 'short' }), ...val,
    }));
  }, [payments]);

  // Bills breakdown pie
  const billsPieData = useMemo(() => {
    const map: Record<string, number> = {};
    bills.forEach(b => { map[b.type] = (map[b.type] || 0) + b.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [bills]);

  // Tenant rent distribution
  const rentDistribution = useMemo(() => {
    return activeTenants.map(t => ({ name: t.name.split(' ')[0], rent: t.rent })).sort((a, b) => b.rent - a.rent).slice(0, 8);
  }, [activeTenants]);

  // Recent activity
  const recentActivities = useMemo(() => {
    const acts: { id: string; text: string; time: string; type: 'payment' | 'maintenance' | 'bill'; sortDate: Date }[] = [];
    payments.filter(p => p.status === 'Paid' && p.date).forEach(p => acts.push({ id: `p-${p.id}`, text: `${p.tenantName} paid Rs ${p.amount.toLocaleString()} via ${p.method}`, time: p.date, type: 'payment', sortDate: new Date(p.date) }));
    bills.filter(b => b.status === 'Paid' && b.paidDate).forEach(b => { const t = tenants.find(t => t.id === b.tenantId); acts.push({ id: `b-${b.id}`, text: `${t?.name || ''} paid ${b.type} bill Rs ${b.amount.toLocaleString()}`, time: b.paidDate!, type: 'bill', sortDate: new Date(b.paidDate!) }); });
    maintenance.forEach(m => acts.push({ id: `m-${m.id}`, text: `${m.status}: ${m.category} - ${m.tenantName}`, time: m.resolvedDate || m.createdDate, type: 'maintenance', sortDate: new Date(m.resolvedDate || m.createdDate) }));
    return acts.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime()).slice(0, 10);
  }, [payments, bills, maintenance, tenants]);

  const fmtAgo = (s: string) => { const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000); return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : d < 30 ? `${d}d ago` : s; };
  const fmt = (n: number) => `Rs ${n.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-2xl font-bold text-gray-900">Dashboard</h1><p className="text-gray-500 text-sm mt-1">Real-time overview of your properties</p></div>
        <div className="text-sm text-gray-500">{now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      {/* Row 1 - KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Properties', value: properties.length, icon: Building2, color: 'bg-blue-500', sub: `${activeTenants.length} tenants` },
          { label: 'Collected', value: fmt(totalCollected), icon: TrendingUp, color: 'bg-green-500', sub: 'All rent payments', up: true },
          { label: 'Overdue', value: fmt(totalOverdue), icon: AlertCircle, color: 'bg-red-500', sub: `${overdueCount} overdue`, down: true },
          { label: 'This Month', value: fmt(thisMonthIncome), icon: Wallet, color: 'bg-purple-500', sub: `Net: ${fmt(thisMonthNet)}` },
          { label: 'Receivable', value: fmt(monthlyRentReceivable), icon: CircleDollarSign, color: 'bg-indigo-500', sub: '/month' },
          { label: 'Issues', value: openIssues, icon: Wrench, color: 'bg-orange-500', sub: `${maintenance.filter(m => m.priority === 'Urgent').length} urgent` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className={`${kpi.color} p-2 rounded-lg`}><kpi.icon className="w-4 h-4 text-white" /></div>
              {(kpi as any).up && <ArrowUpRight className="w-4 h-4 text-green-500" />}
              {(kpi as any).down && <ArrowDownRight className="w-4 h-4 text-red-500" />}
            </div>
            <div className="text-lg font-bold text-gray-900 truncate">{kpi.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Row 2 - Forecast + Dues Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-1 opacity-80"><CalendarClock className="w-4 h-4" /><span className="text-xs font-medium">{nextMonthStr} Forecast</span></div>
          <p className="text-2xl font-bold">{fmt(monthlyRentReceivable)}</p>
          <p className="text-[10px] opacity-70 mt-1">Expected rent</p>
        </div>
        <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-1 opacity-80"><TrendingDown className="w-4 h-4" /><span className="text-xs font-medium">Total Pending</span></div>
          <p className="text-2xl font-bold">{fmt(totalPending)}</p>
          <p className="text-[10px] opacity-70 mt-1">{pendingCount + overdueCount} unpaid dues</p>
        </div>
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-1 opacity-80"><Receipt className="w-4 h-4" /><span className="text-xs font-medium">Bills</span></div>
          <p className="text-2xl font-bold">{fmt(billsPending)}</p>
          <p className="text-[10px] opacity-70 mt-1">Pending | Collected: {fmt(billsCollected)}</p>
        </div>
        <div className="bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-1 opacity-80"><Wallet className="w-4 h-4" /><span className="text-xs font-medium">Expenses</span></div>
          <p className="text-2xl font-bold">{fmt(totalExpenses)}</p>
          <p className="text-[10px] opacity-70 mt-1">This month: {fmt(thisMonthExpenses)}</p>
        </div>
      </div>

      {/* Row 3 - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expense Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Income vs Expense (6 months)</h3>
          {monthlyTrend.some(d => d.income > 0 || d.expense > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                  <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`Rs ${Number(v).toLocaleString()}`, '']} />
                <Area type="monotone" dataKey="income" stroke="#22c55e" fill="url(#gi)" strokeWidth={2} name="Income" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#ge)" strokeWidth={2} name="Expense" />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">No data yet</div>}
        </div>

        {/* Payment Status Pie */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Payment Status</h3>
          {paymentPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart><Pie data={paymentPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={70} paddingAngle={4} dataKey="value">
                  {paymentPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">{paymentPieData.map((e, i) => <div key={e.name} className="flex items-center gap-1.5 text-xs"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} /><span className="text-gray-600">{e.name} ({e.value})</span></div>)}</div>
            </>
          ) : <div className="flex items-center justify-center h-[170px] text-gray-400 text-sm">No data</div>}
        </div>
      </div>

      {/* Row 4 - More Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collection vs Dues */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Collection vs Dues</h3>
          {collectionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={collectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`Rs ${Number(v).toLocaleString()}`, '']} />
                <Bar dataKey="collected" fill="#22c55e" radius={[4, 4, 0, 0]} name="Collected" />
                <Bar dataKey="dues" fill="#ef4444" radius={[4, 4, 0, 0]} name="Pending" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">No data</div>}
        </div>

        {/* Bills Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Bills Breakdown</h3>
          {billsPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart><Pie data={billsPieData} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                  {billsPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Tooltip formatter={(v: any) => [`Rs ${Number(v).toLocaleString()}`, '']} /></PieChart>
              </ResponsiveContainer>
            </>
          ) : <div className="flex items-center justify-center h-[170px] text-gray-400 text-sm">No bills data</div>}
        </div>

        {/* Tenant Rent Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Rent by Tenant</h3>
          {rentDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={rentDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={60} />
                <Tooltip formatter={(v: any) => [`Rs ${Number(v).toLocaleString()}`, 'Rent']} />
                <Bar dataKey="rent" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">No tenants</div>}
        </div>
      </div>

      {/* Row 5 - Occupancy + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Property Occupancy */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Property Occupancy</h3>
          {properties.length > 0 ? (
            <div className="space-y-3">
              {properties.map(p => {
                const occ = tenants.filter(t => t.propertyId === p.id && t.status === 'Active').length;
                const pct = p.totalRooms > 0 ? Math.min(Math.round((occ / p.totalRooms) * 100), 100) : 0;
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between mb-1"><span className="text-sm text-gray-700 truncate max-w-[180px]">{p.name}</span><span className="text-xs font-medium text-gray-500">{occ}/{p.totalRooms}</span></div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5"><div className={`h-2.5 rounded-full ${pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-blue-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          ) : <div className="flex items-center justify-center h-[120px] text-gray-400 text-sm">Add properties</div>}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {recentActivities.length > 0 ? (
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto">
              {recentActivities.map(a => (
                <div key={a.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.type === 'payment' ? 'bg-green-500' : a.type === 'bill' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                  <div><p className="text-xs text-gray-700 leading-snug">{a.text}</p><p className="text-[10px] text-gray-400 mt-0.5">{fmtAgo(a.time)}</p></div>
                </div>
              ))}
            </div>
          ) : <div className="flex items-center justify-center h-[120px] text-gray-400 text-sm">No activity yet</div>}
        </div>
      </div>
    </div>
  );
}
