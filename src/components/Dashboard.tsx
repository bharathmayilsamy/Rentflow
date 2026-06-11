import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Property, Tenant, RentPayment, MaintenanceRequest } from '../types';
import { revenueData, recentActivities } from '../data';
import { Building2, Users, DollarSign, Wrench, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  properties: Property[];
  tenants: Tenant[];
  payments: RentPayment[];
  maintenance: MaintenanceRequest[];
}

const COLORS = ['#22c55e', '#f97316', '#ef4444', '#6366f1'];

export default function Dashboard({ properties, tenants, payments, maintenance }: Props) {
  const totalProperties = properties.length;
  const totalTenants = tenants.filter(t => t.status === 'Active').length;
  const totalCollected = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const openIssues = maintenance.filter(m => m.status === 'Open' || m.status === 'In Progress').length;

  const paidCount = payments.filter(p => p.status === 'Paid').length;
  const pendingCount = payments.filter(p => p.status === 'Pending').length;
  const overdueCount = payments.filter(p => p.status === 'Overdue').length;
  const partialCount = payments.filter(p => p.status === 'Partial').length;

  const paymentPieData = [
    { name: 'Paid', value: paidCount },
    { name: 'Pending', value: pendingCount },
    { name: 'Overdue', value: overdueCount },
    { name: 'Partial', value: partialCount },
  ].filter(d => d.value > 0);

  const totalIncome = revenueData.reduce((s, d) => s + d.income, 0);
  const totalExpense = revenueData.reduce((s, d) => s + d.expense, 0);
  const netProfit = totalIncome - totalExpense;

  const kpis = [
    { label: 'Properties', value: totalProperties, icon: Building2, color: 'bg-blue-500', change: '+2 this month' },
    { label: 'Active Tenants', value: totalTenants, icon: Users, color: 'bg-green-500', change: '+3 this month' },
    { label: 'Collected', value: `₹${totalCollected.toLocaleString()}`, icon: DollarSign, color: 'bg-purple-500', change: '+12% vs last month' },
    { label: 'Open Issues', value: openIssues, icon: Wrench, color: 'bg-orange-500', change: '2 urgent' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back! Here's your property overview.</p>
        </div>
        <div className="text-sm text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`${kpi.color} p-2.5 rounded-lg`}>
                <kpi.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{kpi.change}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
            <div className="text-sm text-gray-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Line Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, '']} />
              <Line type="monotone" dataKey="income" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} name="Income" />
              <Line type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} dot={{ fill: '#f43f5e', r: 4 }} name="Expense" />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Status Pie */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={paymentPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {paymentPieData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {paymentPieData.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-gray-600">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-700">Total Income</span>
              </div>
              <span className="font-semibold text-green-700">₹{totalIncome.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-sm text-gray-700">Total Expense</span>
              </div>
              <span className="font-semibold text-red-700">₹{totalExpense.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-600" />
                <span className="text-sm text-gray-700">Net Profit</span>
              </div>
              <span className="font-semibold text-indigo-700">₹{netProfit.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Property Occupancy */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Occupancy</h3>
          <div className="space-y-3">
            {properties.map((p) => {
              const pct = Math.round((p.occupiedRooms / p.totalRooms) * 100);
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 truncate max-w-[160px]">{p.name}</span>
                    <span className="text-xs font-medium text-gray-500">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-blue-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-[260px] overflow-y-auto">
            {recentActivities.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${a.type === 'payment' ? 'bg-green-500' : a.type === 'maintenance' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 leading-snug">{a.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
