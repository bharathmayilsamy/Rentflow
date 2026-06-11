import { useState } from 'react';
import { Settings as SettingsType, LateFeeType, User, UserRole } from '../types';
import { generateId } from '../data';
import { Save, Bell, User as UserIcon, Sliders, DollarSign, Users, Plus, Edit2, Trash2, X, Shield, LogOut } from 'lucide-react';

interface Props {
  settings: SettingsType;
  setSettings: (s: SettingsType) => void;
  users: User[];
  setUsers: (u: User[]) => void;
  currentUserRole: UserRole;
  onLogout: () => void;
}

const ROLES: UserRole[] = ['Owner', 'Manager', 'Staff', 'Accountant'];
const ROLE_COLORS: Record<UserRole, string> = {
  Owner: 'bg-purple-100 text-purple-700',
  Manager: 'bg-blue-100 text-blue-700',
  Staff: 'bg-green-100 text-green-700',
  Accountant: 'bg-orange-100 text-orange-700',
};

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];

export default function SettingsPage({ settings, setSettings, users, setUsers, currentUserRole, onLogout }: Props) {
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<'general' | 'users'>('general');
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Staff' as UserRole,
  });

  const update = (partial: Partial<SettingsType>) => {
    setSettings({ ...settings, ...partial });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const openAddUser = () => {
    setUserForm({ name: '', email: '', phone: '', role: 'Staff' });
    setEditingUserId(null);
    setShowUserForm(true);
  };

  const openEditUser = (user: User) => {
    setUserForm({ name: user.name, email: user.email, phone: user.phone, role: user.role });
    setEditingUserId(user.id);
    setShowUserForm(true);
  };

  const saveUser = () => {
    if (!userForm.name.trim() || !userForm.email.trim()) return;

    if (editingUserId) {
      setUsers(users.map(u => u.id === editingUserId ? { ...u, ...userForm } : u));
    } else {
      const newUser: User = {
        id: generateId(),
        ...userForm,
        avatar: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        isActive: true,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setUsers([...users, newUser]);
    }
    setShowUserForm(false);
  };

  const deleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const toggleUserStatus = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u));
  };

  const canManageUsers = currentUserRole === 'Owner' || currentUserRole === 'Manager';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure your preferences and manage users</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onLogout} className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
            <LogOut className="w-4 h-4" /> Logout
          </button>
          {activeSection === 'general' && (
            <button onClick={handleSave} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm">
              <Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 w-fit">
        <button
          onClick={() => setActiveSection('general')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeSection === 'general' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          General Settings
        </button>
        <button
          onClick={() => setActiveSection('users')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeSection === 'users' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          <Users className="w-4 h-4" /> User Management
        </button>
      </div>

      {activeSection === 'general' && (
        <div className="max-w-4xl space-y-6">
          {/* Late Fee Automation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-red-100 p-2.5 rounded-lg">
                <DollarSign className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Late Fee Automation</h2>
                <p className="text-sm text-gray-500">Automatically charge late fees on overdue rent</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">Enable Late Fee</p>
                  <p className="text-xs text-gray-500 mt-0.5">Automatically apply late fees to overdue payments</p>
                </div>
                <button
                  onClick={() => update({ lateFeeEnabled: !settings.lateFeeEnabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${settings.lateFeeEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.lateFeeEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {settings.lateFeeEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (days)</label>
                    <input type="number" value={settings.gracePeriod} onChange={e => update({ gracePeriod: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fee Type</label>
                    <select value={settings.lateFeeType} onChange={e => update({ lateFeeType: e.target.value as LateFeeType })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option>Fixed</option>
                      <option>Percentage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fee Amount ({settings.lateFeeType === 'Fixed' ? '₹' : '%'})</label>
                    <input type="number" value={settings.lateFeeAmount} onChange={e => update({ lateFeeAmount: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Cap (₹)</label>
                    <input type="number" value={settings.maxCap} onChange={e => update({ maxCap: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-blue-100 p-2.5 rounded-lg">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
                <p className="text-sm text-gray-500">Choose how you receive notifications</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { key: 'notifyWhatsApp' as const, label: 'WhatsApp', desc: 'Receive notifications via WhatsApp' },
                { key: 'notifySMS' as const, label: 'SMS', desc: 'Receive SMS notifications' },
                { key: 'notifyEmail' as const, label: 'Email', desc: 'Receive email notifications' },
                { key: 'notifyInApp' as const, label: 'In-App', desc: 'Show in-app notifications' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => update({ [item.key]: !settings[item.key] })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${settings[item.key] ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[item.key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Profile Management */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-green-100 p-2.5 rounded-lg">
                <UserIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Profile Management</h2>
                <p className="text-sm text-gray-500">Manage your account details</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={settings.profileName} onChange={e => update({ profileName: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input value={settings.profileEmail} onChange={e => update({ profileEmail: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={settings.profilePhone} onChange={e => update({ profilePhone: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
            </div>
          </div>

          {/* General Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-purple-100 p-2.5 rounded-lg">
                <Sliders className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
                <p className="text-sm text-gray-500">App-wide configurations</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select value={settings.currency} onChange={e => update({ currency: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                <select value={settings.dateFormat} onChange={e => update({ dateFormat: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rent Due Day</label>
                <input type="number" min={1} max={31} value={settings.rentDueDay} onChange={e => update({ rentDueDay: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'users' && (
        <div className="space-y-6">
          {/* Add User Button */}
          {canManageUsers && (
            <div className="flex justify-end">
              <button onClick={openAddUser} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm">
                <Plus className="w-4 h-4" /> Add User
              </button>
            </div>
          )}

          {/* User Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {users.map(user => (
              <div key={user.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${!user.isActive ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: user.avatar }}>
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{user.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>{user.role}</span>
                    </div>
                  </div>
                  {canManageUsers && user.role !== 'Owner' && (
                    <div className="flex gap-1">
                      <button onClick={() => openEditUser(user)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteUser(user.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 text-sm text-gray-600">
                  <p>{user.email}</p>
                  <p>{user.phone}</p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <span className="text-xs text-gray-400">Joined: {user.createdAt}</span>
                  {canManageUsers && user.role !== 'Owner' && (
                    <button
                      onClick={() => toggleUserStatus(user.id)}
                      className={`text-xs px-2 py-1 rounded-lg font-medium ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Permissions Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">Role Permissions</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-purple-50 rounded-xl">
                <h4 className="font-semibold text-purple-700 mb-2">Owner</h4>
                <ul className="text-xs text-purple-600 space-y-1">
                  <li>• Full system access</li>
                  <li>• Manage all users</li>
                  <li>• View all reports</li>
                  <li>• Configure settings</li>
                </ul>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl">
                <h4 className="font-semibold text-blue-700 mb-2">Manager</h4>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• Manage properties</li>
                  <li>• Manage tenants</li>
                  <li>• View reports</li>
                  <li>• Add staff users</li>
                </ul>
              </div>
              <div className="p-4 bg-green-50 rounded-xl">
                <h4 className="font-semibold text-green-700 mb-2">Staff</h4>
                <ul className="text-xs text-green-600 space-y-1">
                  <li>• View properties</li>
                  <li>• Manage maintenance</li>
                  <li>• Collect payments</li>
                  <li>• Limited access</li>
                </ul>
              </div>
              <div className="p-4 bg-orange-50 rounded-xl">
                <h4 className="font-semibold text-orange-700 mb-2">Accountant</h4>
                <ul className="text-xs text-orange-600 space-y-1">
                  <li>• View financials</li>
                  <li>• Manage expenses</li>
                  <li>• Generate reports</li>
                  <li>• Export documents</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUserForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">{editingUserId ? 'Edit User' : 'Add User'}</h2>
              <button onClick={() => setShowUserForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name*</label>
                <input value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Enter name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email*</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Phone number" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value as UserRole })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  {ROLES.filter(r => currentUserRole === 'Owner' || r !== 'Owner').map(r => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowUserForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button>
                <button onClick={saveUser} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">
                  {editingUserId ? 'Update' : 'Add'} User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
