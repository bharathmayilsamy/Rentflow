import { useState, useEffect, useRef, useCallback } from 'react';
import { TabKey, Property, Tenant, RentPayment, MaintenanceRequest, Expense, Reminder, Settings, TenantBill, User, AuthUser } from './types';
import { initialSettings } from './data';
import { supabase, signOut, onAuthStateChange } from './lib/supabase';
import { db_loadAllData, db_saveProperties, db_saveTenants, db_savePayments, db_saveMaintenance, db_saveExpenses, db_saveReminders, db_saveBills, db_saveUsers, db_saveSettings } from './lib/database';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Properties from './components/Properties';
import Tenants from './components/Tenants';
import RentCollection from './components/RentCollection';
import Maintenance from './components/Maintenance';
import Reports from './components/Reports';
import Reminders from './components/Reminders';
import SettingsPage from './components/Settings';
import Passbook from './components/Passbook';
import { LayoutDashboard, Building2, Users, Wallet, Wrench, Bell, Settings as SettingsIcon, Menu, X, Home, ChevronDown, UserPlus, UserCheck, UserX, Receipt, CreditCard, TrendingDown, BookOpen, Loader2 } from 'lucide-react';

type SubTab = 'dues' | 'collection' | 'expense' | 'tenant' | 'add-tenant' | 'old-tenants';

interface NavSection {
  key: string;
  label: string;
  icon: any;
  tab?: TabKey;
  children?: { key: SubTab | TabKey; label: string; icon: any }[];
}

const NAV_SECTIONS: NavSection[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, tab: 'dashboard' },
  { key: 'properties', label: 'Properties', icon: Building2, tab: 'properties' },
  { key: 'money', label: 'Money', icon: Wallet,
    children: [
      { key: 'dues', label: 'Dues', icon: Receipt },
      { key: 'collection', label: 'Collection', icon: CreditCard },
      { key: 'expense', label: 'Expense', icon: TrendingDown },
    ]
  },
  { key: 'people', label: 'People', icon: Users,
    children: [
      { key: 'tenant', label: 'Tenants', icon: UserCheck },
      { key: 'add-tenant', label: 'Add Tenant', icon: UserPlus },
      { key: 'old-tenants', label: 'Old Tenants', icon: UserX },
    ]
  },
  { key: 'passbook', label: 'Passbook', icon: BookOpen, tab: 'passbook' },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench, tab: 'maintenance' },
  { key: 'reminders', label: 'Reminders', icon: Bell, tab: 'reminders' },
  { key: 'settings', label: 'Settings', icon: SettingsIcon, tab: 'settings' },
];

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<SubTab | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['money', 'people']);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // START WITH EMPTY DATA - only load from Supabase
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [bills, setBills] = useState<TenantBill[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [showAddTenant, setShowAddTenant] = useState(false);
  const [tenantFilter, setTenantFilter] = useState<'active' | 'old'>('active');
  const [dbReady, setDbReady] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Debounce timer refs
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const debouncedSave = useCallback((key: string, saveFn: () => Promise<void>, delay = 1000) => {
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => { saveFn(); }, delay);
  }, []);

  // Auth check on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            role: session.user.user_metadata?.role || 'Owner',
          });
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();

    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          role: session.user.user_metadata?.role || 'Owner',
        });
        setIsAuthenticated(true);
        setDataLoaded(false); // Reset to load fresh data
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setDbReady(false);
        setDataLoaded(false);
        // Clear all data on logout
        setProperties([]);
        setTenants([]);
        setPayments([]);
        setMaintenance([]);
        setExpenses([]);
        setReminders([]);
        setBills([]);
        setUsers([]);
        setSettings(initialSettings);
      }
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  // Load data from Supabase after login
  useEffect(() => {
    if (!isAuthenticated || !currentUser || dataLoaded) return;

    const loadData = async () => {
      try {
        console.log('Loading data from Supabase for user:', currentUser.id);
        const data = await db_loadAllData();

        // Load whatever is in Supabase (could be empty, that's OK)
        setProperties(data.properties || []);
        setTenants(data.tenants || []);
        setPayments(data.payments || []);
        setMaintenance(data.maintenance || []);
        setExpenses(data.expenses || []);
        setReminders(data.reminders || []);
        setBills(data.bills || []);
        setUsers(data.users || []);
        if (data.settings) setSettings(data.settings);

        console.log('Data loaded:', {
          properties: data.properties?.length || 0,
          tenants: data.tenants?.length || 0,
        });
      } catch (err) {
        console.error('Failed to load from Supabase:', err);
      } finally {
        setDataLoaded(true);
        setDbReady(true);
      }
    };
    loadData();
  }, [isAuthenticated, currentUser, dataLoaded]);

  // Save to Supabase when data changes (only after initial load is complete)
  useEffect(() => { if (dbReady && dataLoaded) debouncedSave('properties', () => db_saveProperties(properties)); }, [properties, dbReady, dataLoaded, debouncedSave]);
  useEffect(() => { if (dbReady && dataLoaded) debouncedSave('tenants', () => db_saveTenants(tenants)); }, [tenants, dbReady, dataLoaded, debouncedSave]);
  useEffect(() => { if (dbReady && dataLoaded) debouncedSave('payments', () => db_savePayments(payments)); }, [payments, dbReady, dataLoaded, debouncedSave]);
  useEffect(() => { if (dbReady && dataLoaded) debouncedSave('maintenance', () => db_saveMaintenance(maintenance)); }, [maintenance, dbReady, dataLoaded, debouncedSave]);
  useEffect(() => { if (dbReady && dataLoaded) debouncedSave('expenses', () => db_saveExpenses(expenses)); }, [expenses, dbReady, dataLoaded, debouncedSave]);
  useEffect(() => { if (dbReady && dataLoaded) debouncedSave('reminders', () => db_saveReminders(reminders)); }, [reminders, dbReady, dataLoaded, debouncedSave]);
  useEffect(() => { if (dbReady && dataLoaded) debouncedSave('bills', () => db_saveBills(bills)); }, [bills, dbReady, dataLoaded, debouncedSave]);
  useEffect(() => { if (dbReady && dataLoaded) debouncedSave('users', () => db_saveUsers(users)); }, [users, dbReady, dataLoaded, debouncedSave]);
  useEffect(() => { if (dbReady && dataLoaded) debouncedSave('settings', () => db_saveSettings(settings)); }, [settings, dbReady, dataLoaded, debouncedSave]);

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setDataLoaded(false); // Trigger data load
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setDbReady(false);
    setDataLoaded(false);
    setActiveTab('dashboard');
    // Clear all data
    setProperties([]);
    setTenants([]);
    setPayments([]);
    setMaintenance([]);
    setExpenses([]);
    setReminders([]);
    setBills([]);
    setUsers([]);
    setSettings(initialSettings);
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const navigate = (tab: TabKey, subTab?: SubTab) => {
    setActiveTab(tab);
    setActiveSubTab(subTab || null);
    setSidebarOpen(false);
    if (subTab === 'add-tenant') { setShowAddTenant(true); setTenantFilter('active'); }
    else if (subTab === 'tenant') { setShowAddTenant(false); setTenantFilter('active'); }
    else if (subTab === 'old-tenants') { setShowAddTenant(false); setTenantFilter('old'); }
    else { setShowAddTenant(false); }
  };

  const handleSubNavClick = (subKey: SubTab | TabKey) => {
    if (subKey === 'dues' || subKey === 'collection' || subKey === 'expense') navigate('rent', subKey as SubTab);
    else if (subKey === 'tenant' || subKey === 'add-tenant' || subKey === 'old-tenants') navigate('tenants', subKey as SubTab);
  };

  const getPageTitle = () => {
    if (activeSubTab === 'dues') return 'Dues';
    if (activeSubTab === 'collection') return 'Collection';
    if (activeSubTab === 'expense') return 'Expenses';
    if (activeSubTab === 'tenant') return 'Tenants';
    if (activeSubTab === 'add-tenant') return 'Add Tenant';
    if (activeSubTab === 'old-tenants') return 'Old Tenants';
    return NAV_SECTIONS.find(s => s.tab === activeTab)?.label || 'Dashboard';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard properties={properties} tenants={tenants} payments={payments} maintenance={maintenance} />;
      case 'properties': return <Properties properties={properties} setProperties={setProperties} tenants={tenants} />;
      case 'tenants': return <Tenants tenants={tenants} setTenants={setTenants} properties={properties} bills={bills} setBills={setBills} payments={payments} settings={settings} showAddModal={showAddTenant} setShowAddModal={setShowAddTenant} filterType={tenantFilter} />;
      case 'rent': return <RentCollection payments={payments} setPayments={setPayments} tenants={tenants} properties={properties} expenses={expenses} setExpenses={setExpenses} activeSubTab={activeSubTab as 'dues' | 'collection' | 'expense' | null} />;
      case 'passbook': return <Passbook payments={payments} expenses={expenses} bills={bills} tenants={tenants} properties={properties} />;
      case 'maintenance': return <Maintenance requests={maintenance} setRequests={setMaintenance} properties={properties} tenants={tenants} />;
      case 'reports': return <Reports expenses={expenses} setExpenses={setExpenses} properties={properties} payments={payments} tenants={tenants} bills={bills} />;
      case 'reminders': return <Reminders reminders={reminders} setReminders={setReminders} tenants={tenants} />;
      case 'settings': return <SettingsPage settings={settings} setSettings={setSettings} users={users} setUsers={setUsers} currentUserRole={currentUser?.role || 'Staff'} onLogout={handleLogout} />;
      default: return null;
    }
  };

  const isSubActive = (subKey: SubTab | TabKey) => activeSubTab === subKey;
  const isSectionActive = (section: NavSection) => {
    if (section.tab) return activeTab === section.tab;
    if (section.children) return section.children.some(child => isSubActive(child.key));
    return false;
  };

  const pendingDuesCount = payments.filter(p => p.status === 'Pending' || p.status === 'Overdue').length;
  const openMaintenanceCount = maintenance.filter(m => m.status === 'Open').length;
  const pendingRemindersCount = reminders.filter(r => r.status === 'Pending').length;
  const activeTenantsCount = tenants.filter(t => t.status === 'Active').length;
  const oldTenantsCount = tenants.filter(t => t.status === 'Inactive').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30 mb-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-white">RentFlow</h1>
          <p className="text-slate-400 mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50/80 flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-900 to-slate-800 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col shadow-2xl`}>
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10 shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Home className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">RentFlow</h1>
            <p className="text-[10px] text-slate-400 -mt-0.5 tracking-wide">Property Management</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto p-1.5 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {NAV_SECTIONS.map(section => {
            const isExpanded = expandedSections.includes(section.key);
            const isActive = isSectionActive(section);
            const hasChildren = section.children && section.children.length > 0;
            return (
              <div key={section.key}>
                <button
                  onClick={() => { if (hasChildren) toggleSection(section.key); else if (section.tab) navigate(section.tab); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive && !hasChildren ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/30' : isActive && hasChildren ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                >
                  <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20' : 'bg-white/5'}`}>
                    <section.icon className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-left">{section.label}</span>
                  {section.key === 'maintenance' && openMaintenanceCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">{openMaintenanceCount}</span>}
                  {section.key === 'reminders' && pendingRemindersCount > 0 && <span className="bg-orange-500 text-white text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">{pendingRemindersCount}</span>}
                  {hasChildren && <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}><ChevronDown className="w-4 h-4 text-slate-400" /></span>}
                </button>
                {hasChildren && (
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-slate-700 pl-3">
                      {section.children?.map(child => {
                        const childActive = isSubActive(child.key);
                        return (
                          <button key={child.key} onClick={() => handleSubNavClick(child.key)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${childActive ? 'bg-indigo-500/20 text-indigo-400 border-l-2 border-indigo-400 -ml-[14px] pl-[22px]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                            <child.icon className={`w-4 h-4 ${childActive ? 'text-indigo-400' : ''}`} />
                            <span className="flex-1 text-left">{child.label}</span>
                            {child.key === 'dues' && pendingDuesCount > 0 && <span className="bg-red-500/20 text-red-400 text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">{pendingDuesCount}</span>}
                            {child.key === 'tenant' && activeTenantsCount > 0 && <span className="bg-green-500/20 text-green-400 text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">{activeTenantsCount}</span>}
                            {child.key === 'old-tenants' && oldTenantsCount > 0 && <span className="bg-slate-500/20 text-slate-400 text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">{oldTenantsCount}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
              {currentUser?.name.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{currentUser?.name || 'User'}</p>
              <p className="text-xs text-slate-400 truncate">{currentUser?.role || 'Staff'}</p>
            </div>
            {!dbReady && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 shrink-0 sticky top-0 z-30 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-1 hover:bg-gray-100 rounded-xl mr-3">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h2>
          <div className="ml-auto flex items-center gap-3">
            {dbReady && <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> {currentUser?.name} • Synced</div>}
            {!dbReady && <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full"><Loader2 className="w-3 h-3 animate-spin" /> Syncing...</div>}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {renderContent()}
          <footer className="mt-12 pb-4 text-center border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-500">Built with ❤️ by <span className="font-semibold text-indigo-600">Bharath</span></p>
            <p className="text-xs text-gray-400 mt-1">RentFlow — Complete Property Management Solution © {new Date().getFullYear()}</p>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
