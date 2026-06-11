import { useState, useEffect } from 'react';
import { TabKey, Property, Tenant, RentPayment, MaintenanceRequest, Expense, Reminder, Settings, TenantBill, PassbookEntry, User, AuthUser } from './types';
import { initialProperties, initialTenants, initialPayments, initialMaintenanceRequests, initialExpenses, initialReminders, initialSettings, initialBills, initialPassbook, initialUsers } from './data';
import { supabase, signOut, onAuthStateChange } from './lib/supabase';
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
  { 
    key: 'money', 
    label: 'Money', 
    icon: Wallet,
    children: [
      { key: 'dues', label: 'Dues', icon: Receipt },
      { key: 'collection', label: 'Collection', icon: CreditCard },
      { key: 'expense', label: 'Expense', icon: TrendingDown },
    ]
  },
  { 
    key: 'people', 
    label: 'People', 
    icon: Users,
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

// Local storage keys
const STORAGE_KEYS = {
  properties: 'rentflow_properties',
  tenants: 'rentflow_tenants',
  payments: 'rentflow_payments',
  maintenance: 'rentflow_maintenance',
  expenses: 'rentflow_expenses',
  reminders: 'rentflow_reminders',
  settings: 'rentflow_settings',
  bills: 'rentflow_bills',
  passbook: 'rentflow_passbook',
  users: 'rentflow_users',
};

// Load from localStorage or use initial data
const loadFromStorage = <T,>(key: string, initialData: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialData;
  } catch {
    return initialData;
  }
};

// Save to localStorage
const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
};

function App() {
  // Auth State
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // App State
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<SubTab | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['money', 'people']);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Data State - Load from localStorage with fallback to initial data
  const [properties, setProperties] = useState<Property[]>(() => loadFromStorage(STORAGE_KEYS.properties, initialProperties));
  const [tenants, setTenants] = useState<Tenant[]>(() => loadFromStorage(STORAGE_KEYS.tenants, initialTenants));
  const [payments, setPayments] = useState<RentPayment[]>(() => loadFromStorage(STORAGE_KEYS.payments, initialPayments));
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>(() => loadFromStorage(STORAGE_KEYS.maintenance, initialMaintenanceRequests));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadFromStorage(STORAGE_KEYS.expenses, initialExpenses));
  const [reminders, setReminders] = useState<Reminder[]>(() => loadFromStorage(STORAGE_KEYS.reminders, initialReminders));
  const [settings, setSettings] = useState<Settings>(() => loadFromStorage(STORAGE_KEYS.settings, initialSettings));
  const [bills, setBills] = useState<TenantBill[]>(() => loadFromStorage(STORAGE_KEYS.bills, initialBills));
  const [passbook, setPassbook] = useState<PassbookEntry[]>(() => loadFromStorage(STORAGE_KEYS.passbook, initialPassbook));
  const [users, setUsers] = useState<User[]>(() => loadFromStorage(STORAGE_KEYS.users, initialUsers));
  
  // UI State
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [tenantFilter, setTenantFilter] = useState<'active' | 'old'>('active');

  // Save data to localStorage whenever it changes
  useEffect(() => { saveToStorage(STORAGE_KEYS.properties, properties); }, [properties]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.tenants, tenants); }, [tenants]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.payments, payments); }, [payments]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.maintenance, maintenance); }, [maintenance]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.expenses, expenses); }, [expenses]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.reminders, reminders); }, [reminders]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.settings, settings); }, [settings]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.bills, bills); }, [bills]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.passbook, passbook); }, [passbook]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.users, users); }, [users]);

  // Check auth state on mount
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
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          role: session.user.user_metadata?.role || 'Owner',
        });
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveTab('dashboard');
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const navigate = (tab: TabKey, subTab?: SubTab) => {
    setActiveTab(tab);
    setActiveSubTab(subTab || null);
    setSidebarOpen(false);
    
    if (subTab === 'add-tenant') {
      setShowAddTenant(true);
      setTenantFilter('active');
    } else if (subTab === 'tenant') {
      setShowAddTenant(false);
      setTenantFilter('active');
    } else if (subTab === 'old-tenants') {
      setShowAddTenant(false);
      setTenantFilter('old');
    } else {
      setShowAddTenant(false);
    }
  };

  const handleSubNavClick = (subKey: SubTab | TabKey) => {
    if (subKey === 'dues' || subKey === 'collection' || subKey === 'expense') {
      navigate('rent', subKey as SubTab);
    } else if (subKey === 'tenant' || subKey === 'add-tenant' || subKey === 'old-tenants') {
      navigate('tenants', subKey as SubTab);
    }
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
      case 'dashboard': 
        return <Dashboard properties={properties} tenants={tenants} payments={payments} maintenance={maintenance} />;
      case 'properties': 
        return <Properties properties={properties} setProperties={setProperties} />;
      case 'tenants': 
        return (
          <Tenants 
            tenants={tenants} 
            setTenants={setTenants} 
            properties={properties} 
            bills={bills} 
            setBills={setBills}
            showAddModal={showAddTenant}
            setShowAddModal={setShowAddTenant}
            filterType={tenantFilter}
          />
        );
      case 'rent': 
        return (
          <RentCollection 
            payments={payments} 
            setPayments={setPayments} 
            tenants={tenants} 
            properties={properties}
            expenses={expenses}
            setExpenses={setExpenses}
            activeSubTab={activeSubTab as 'dues' | 'collection' | 'expense' | null}
          />
        );
      case 'passbook':
        return (
          <Passbook
            passbook={passbook}
            setPassbook={setPassbook}
            properties={properties}
            tenants={tenants}
          />
        );
      case 'maintenance': 
        return <Maintenance requests={maintenance} setRequests={setMaintenance} properties={properties} tenants={tenants} />;
      case 'reports': 
        return <Reports expenses={expenses} setExpenses={setExpenses} properties={properties} payments={payments} tenants={tenants} bills={bills} />;
      case 'reminders': 
        return <Reminders reminders={reminders} setReminders={setReminders} tenants={tenants} />;
      case 'settings': 
        return (
          <SettingsPage 
            settings={settings} 
            setSettings={setSettings}
            users={users}
            setUsers={setUsers}
            currentUserRole={currentUser?.role || 'Staff'}
            onLogout={handleLogout}
          />
        );
      default: 
        return null;
    }
  };

  const isSubActive = (subKey: SubTab | TabKey) => {
    return activeSubTab === subKey;
  };

  const isSectionActive = (section: NavSection) => {
    if (section.tab) return activeTab === section.tab;
    if (section.children) {
      return section.children.some(child => isSubActive(child.key));
    }
    return false;
  };

  // Count badges
  const pendingDuesCount = payments.filter(p => p.status === 'Pending' || p.status === 'Overdue').length;
  const openMaintenanceCount = maintenance.filter(m => m.status === 'Open').length;
  const pendingRemindersCount = reminders.filter(r => r.status === 'Pending').length;
  const activeTenantsCount = tenants.filter(t => t.status === 'Active').length;
  const oldTenantsCount = tenants.filter(t => t.status === 'Inactive').length;

  // Loading state
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

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50/80 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-900 to-slate-800 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col shadow-2xl`}>
        {/* Logo */}
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

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {NAV_SECTIONS.map(section => {
            const isExpanded = expandedSections.includes(section.key);
            const isActive = isSectionActive(section);
            const hasChildren = section.children && section.children.length > 0;

            return (
              <div key={section.key}>
                <button
                  onClick={() => {
                    if (hasChildren) {
                      toggleSection(section.key);
                    } else if (section.tab) {
                      navigate(section.tab);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive && !hasChildren
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                      : isActive && hasChildren
                      ? 'bg-white/10 text-white'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20' : 'bg-white/5'}`}>
                    <section.icon className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-left">{section.label}</span>
                  
                  {section.key === 'maintenance' && openMaintenanceCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">
                      {openMaintenanceCount}
                    </span>
                  )}
                  {section.key === 'reminders' && pendingRemindersCount > 0 && (
                    <span className="bg-orange-500 text-white text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">
                      {pendingRemindersCount}
                    </span>
                  )}
                  
                  {hasChildren && (
                    <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </span>
                  )}
                </button>

                {hasChildren && (
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-slate-700 pl-3">
                      {section.children?.map(child => {
                        const childActive = isSubActive(child.key);
                        return (
                          <button
                            key={child.key}
                            onClick={() => handleSubNavClick(child.key)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                              childActive
                                ? 'bg-indigo-500/20 text-indigo-400 border-l-2 border-indigo-400 -ml-[14px] pl-[22px]'
                                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                            }`}
                          >
                            <child.icon className={`w-4 h-4 ${childActive ? 'text-indigo-400' : ''}`} />
                            <span className="flex-1 text-left">{child.label}</span>
                            
                            {child.key === 'dues' && pendingDuesCount > 0 && (
                              <span className="bg-red-500/20 text-red-400 text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">
                                {pendingDuesCount}
                              </span>
                            )}
                            {child.key === 'tenant' && (
                              <span className="bg-green-500/20 text-green-400 text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">
                                {activeTenantsCount}
                              </span>
                            )}
                            {child.key === 'old-tenants' && oldTenantsCount > 0 && (
                              <span className="bg-slate-500/20 text-slate-400 text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">
                                {oldTenantsCount}
                              </span>
                            )}
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

        {/* Sidebar Footer - User Info */}
        <div className="p-4 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
              {currentUser?.name.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{currentUser?.name || 'User'}</p>
              <p className="text-xs text-slate-400 truncate">{currentUser?.role || 'Staff'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 shrink-0 sticky top-0 z-30 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-1 hover:bg-gray-100 rounded-xl mr-3">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {getPageTitle()}
          </h2>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {currentUser?.name} • {currentUser?.role}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {renderContent()}

          {/* Footer */}
          <footer className="mt-12 pb-4 text-center border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-500">
              Built with ❤️ by <span className="font-semibold text-indigo-600">Bharath</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              RentFlow — Complete Property Management Solution © {new Date().getFullYear()}
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
