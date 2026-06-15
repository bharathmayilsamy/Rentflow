import { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Property, Tenant, RentPayment, MaintenanceRequest } from '../types';
import { Building2, Users, DollarSign, Wrench, TrendingUp, TrendingDown, CalendarClock, Wallet, CircleDollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Props { properties: Property[]; tenants: Tenant[]; payments: RentPayment[]; maintenance: MaintenanceRequest[]; }

const COLORS = ['#22c55e', '#f97316', '#ef4444', '#6366f1'];

export default function Dashboard({ properties, tenants, payments, maintenance }: Props) {
  const activeTenants = tenants.filter(t => t.status === 'Active');
  const totalCollected = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status !== 'Paid').reduce((s, p) => s + (p.dueAmount - p.amount), 0);
  const totalDueAmount = payments.reduce((s, p) => s + p.dueAmount, 0);
  const openIssues = maintenance.filter(m => m.status === 'Open' || m.status === 'In Progress').length;

  // Rent receivable = all active tenants' rent
  const monthlyRentReceivable = activeTenants.reduce((s, t) => s + t.rent, 0);

  // Next month calculations
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthStr = nextMonth.toLocaleString('default', { month: 'long' });
  const expectedNextMonth = monthlyRentReceivable;

  // Payments this month
  const thisMonthPaid = payments.filter(p => {
    if (p.status !== 'Paid' || !p.date) return false;
    const d = new Date(p.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, p) => s + p.amount, 0);

  // Pie data
  const paidCount = payments.filter(p => p.status === 'Paid').length;
  const pendingCount = payments.filter(p => p.status === 'Pending').length;
  const overdueCount = payments.filter(p => p.status === 'Overdue').length;
  const partialCount = payments.filter(p => p.status === 'Partial').length;
  const paymentPieData = [
    { name: 'Paid', value: paidCount }, { name: 'Pending', value: pendingCount },
    { name: 'Overdue', value: overdueCount }, { name: 'Partial', value: partialCount },
  ].filter(d => d.value > 0);

  // Revenue chart from actual payments
  const revenueData = useMemo(() => {
    const monthMap: Record<string, number> = {};
    payments.forEach(p => {
      if (p.status === 'Paid' && p.date) {
        const d = new Date(p.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthMap[key] = (monthMap[key] || 0) + p.amount;
      }
    });
    return Object.entries(monthMap).sort((a, b) => a[0].localeCompare(b[0])).slice(-7).map(([key, val]) => {
      const [y, m] = key.split('-');
      return { month: new Date(+y, +m - 1).toLocaleString('default', { month: 'short' }), amount: val };
    });
  }, [payments]);

  // Collection vs Dues bar chart
  const collectionData = useMemo(() => {
    const map: Record<string, { collected: number; dues: number }> = {};
    payments.forEach(p => {
      const dateStr = p.status === 'Paid' && p.date ? p.date : p.dueDate;
      if (!dateStr) return;
      const d = new Date(dateStr);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = { collected: 0, dues: 0 };
      if (p.status === 'Paid') map[key].collected += p.amount;
      else map[key].dues += (p.dueAmount - p.amount);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([key, val]) => {
      const [y, m] = key.split('-');
      return { month: new Date(+y, +m - 1).toLocaleString('default', { month: 'short' }), ...val };
    });
  }, [payments]);

  // Recent activity
  const recentActivities = useMemo(() => {
    const activities: { id: string; text: string; time: string; type: 'payment' | 'maintenance' | 'tenant'; sortDate: Date }[] = [];
    payments.filter(p => p.status === 'Paid' && p.date).forEach(p => {
      activities.push({ id: `p-${p.id}`, text: `${p.tenantName} paid ₹${p.amount.toLocaleString()} via ${p.method}`, time: p.date, type: 'payment', sortDate: new Date(p.date) });
    });
    maintenance.forEach(m => {
      activities.push({ id: `m-${m.id}`, text: `${m.status}: ${m.category} issue from ${m.tenantName}`, time: m.resolvedDate || m.createdDate, type: 'maintenance', sortDate: new Date(m.resolvedDate || m.createdDate) });
    });
    return activities.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime()).slice(0, 8);
  }, [payments, maintenance]);

  const formatTimeAgo = (dateStr: string) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return 'Today'; if (days === 1) return 'Yesterday'; if (days < 30) return `${days}d ago`;
    return dateStr;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-2xl font-bold text-gray-900">Dashboard</h1><p className="text-gray-500 text-sm mt-1">Real-time overview of your properties</p></div>
        <div className="text-sm text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      {/* Row 1 - Main KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Properties', value: properties.length, icon: Building2, color: 'bg-blue-500', sub: `${activeTenants.length} tenants` },
          { label: 'Total Collected', value: `₹${totalCollected.toLocaleString()}`, icon: TrendingUp, color: 'bg-green-500', sub: 'All time', arrow: true },
          { label: 'Total Pending', value: `₹${totalPending.toLocaleString()}`, icon: TrendingDown, color: 'bg-red-500', sub: `${pendingCount + overdueCount} dues`, arrowDown: true },
          { label: 'This Month', value: `₹${thisMonthPaid.toLocaleString()}`, icon: Wallet, color: 'bg-purple-500', sub: 'Collected' },
          { label: 'Rent Receivable', value: `₹${monthlyRentReceivable.toLocaleString()}`, icon: CircleDollarSign, color: 'bg-indigo-500', sub: '/month' },
          { label: 'Open Issues', value: openIssues, icon: Wrench, color: 'bg-orange-500', sub: `${maintenance.filter(m => m.priority === 'Urgent').length} urgent` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className={`${kpi.color} p-2 rounded-lg`}><kpi.icon className="w-4 h-4 text-white" /></div>
              {(kpi as any).arrow && <ArrowUpRight className="w-4 h-4 text-green-500" />}
              {(kpi as any).arrowDown && <ArrowDownRight className="w-4 h-4 text-red-500" />}
            </div>
            <div className="text-xl font-bold text-gray-900 truncate">{kpi.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Row 2 - Next Month Forecast */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2 opacity-80"><CalendarClock className="w-5 h-5" /><span className="text-sm font-medium">{nextMonthStr} Forecast</span></div>
          <p className="text-3xl font-bold">₹{expectedNextMonth.toLocaleString()}</p>
          <p className="text-xs opacity-70 mt-1">Expected rent collection</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2 opacity-80"><DollarSign className="w-5 h-5" /><span className="text-sm font-medium">Total Dues</span></div>
          <p className="text-3xl font-bold">₹{totalDueAmount.toLocaleString()}</p>
          <p className="text-xs opacity-70 mt-1">{payments.length} payment records</p>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2 opacity-80"><Users className="w-5 h-5" /><span className="text-sm font-medium">Overdue Tenants</span></div>
          <p className="text-3xl font-bold">{overdueCount}</p>
          <p className="text-xs opacity-70 mt-1">₹{payments.filter(p => p.status === 'Overdue').reduce((s, p) => s + p.dueAmount, 0).toLocaleString()} overdue</p>
        </div>
      </div>

      {/* Row 3 - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Collection vs Dues</h3>
          {collectionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={collectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, '']} />
                <Bar dataKey="collected" fill="#22c55e" radius={[4, 4, 0, 0]} name="Collected" />
                <Bar dataKey="dues" fill="#ef4444" radius={[4, 4, 0, 0]} name="Pending" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-[260px] text-gray-400">No data yet</div>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
          {paymentPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={paymentPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                    {paymentPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie><Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {paymentPieData.map((e, i) => <div key={e.name} className="flex items-center gap-1.5 text-xs"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} /><span className="text-gray-600">{e.name} ({e.value})</span></div>)}
              </div>
            </>
          ) : <div className="flex items-center justify-center h-[180px] text-gray-400 text-sm">No data</div>}
        </div>
      </div>

      {/* Row 4 - Revenue Trend + Occupancy + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, '']} />
                <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 3 }} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Record payments to see trends</div>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Occupancy</h3>
          {properties.length > 0 ? (
            <div className="space-y-3">
              {properties.map(p => {
                const occ = tenants.filter(t => t.propertyId === p.id && t.status === 'Active').length;
                const pct = p.totalRooms > 0 ? Math.min(Math.round((occ / p.totalRooms) * 100), 100) : 0;
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between mb-1"><span className="text-sm text-gray-700 truncate max-w-[140px]">{p.name}</span><span className="text-xs font-medium text-gray-500">{occ}/{p.totalRooms}</span></div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5"><div className={`h-2.5 rounded-full ${pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-blue-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          ) : <div className="flex items-center justify-center h-[140px] text-gray-400 text-sm">Add properties</div>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {recentActivities.length > 0 ? (
            <div className="space-y-2.5 max-h-[240px] overflow-y-auto">
              {recentActivities.map(a => (
                <div key={a.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.type === 'payment' ? 'bg-green-500' : a.type === 'maintenance' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                  <div><p className="text-xs text-gray-700 leading-snug">{a.text}</p><p className="text-[10px] text-gray-400 mt-0.5">{formatTimeAgo(a.time)}</p></div>
                </div>
              ))}
            </div>
          ) : <div className="flex items-center justify-center h-[140px] text-gray-400 text-sm">No activity yet</div>}
        </div>
      </div>
    </div>
  );
}
