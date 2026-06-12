import { useState } from 'react';
import { Property, PropertyType, Tenant } from '../types';
import { generateId } from '../data';
import { Plus, Edit2, Trash2, Building2, Home, Hotel, Store, X, Users } from 'lucide-react';

interface Props {
  properties: Property[];
  setProperties: (p: Property[]) => void;
  tenants: Tenant[];
}

const PROPERTY_TYPES: PropertyType[] = ['Apartment', 'PG', 'Hostel', 'House', 'Commercial'];
const typeIcons: Record<PropertyType, any> = { Apartment: Building2, PG: Hotel, Hostel: Hotel, House: Home, Commercial: Store };
const typeColors: Record<PropertyType, string> = { Apartment: 'bg-blue-100 text-blue-700', PG: 'bg-purple-100 text-purple-700', Hostel: 'bg-teal-100 text-teal-700', House: 'bg-green-100 text-green-700', Commercial: 'bg-orange-100 text-orange-700' };

const emptyProperty: Omit<Property, 'id'> = { name: '', type: 'Apartment', address: '', totalRooms: 1, occupiedRooms: 0, monthlyRent: 0 };

export default function Properties({ properties, setProperties, tenants }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Property, 'id'>>(emptyProperty);

  const getPropertyTenants = (propertyId: string) =>
    tenants.filter(t => t.propertyId === propertyId && t.status !== 'Inactive');

  const openAdd = () => { setForm(emptyProperty); setEditingId(null); setShowForm(true); };
  const openEdit = (p: Property) => { setForm({ name: p.name, type: p.type, address: p.address, totalRooms: p.totalRooms, occupiedRooms: p.occupiedRooms, monthlyRent: p.monthlyRent }); setEditingId(p.id); setShowForm(true); };

  const save = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      setProperties(properties.map(p => p.id === editingId ? { ...p, ...form } : p));
    } else {
      setProperties([...properties, { id: generateId(), ...form }]);
    }
    setShowForm(false);
  };

  const remove = (id: string) => {
    if (confirm('Are you sure you want to delete this property?')) {
      setProperties(properties.filter(p => p.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your properties and rooms</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm">
          <Plus className="w-4 h-4" /> Add Property
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {properties.map((p) => {
          const propertyTenants = getPropertyTenants(p.id);
          const occupied = propertyTenants.length;
          const pct = p.totalRooms > 0 ? Math.round((occupied / p.totalRooms) * 100) : 0;
          const Icon = typeIcons[p.type];
          return (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${typeColors[p.type]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[p.type]}`}>{p.type}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => remove(p.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-3">{p.address}</p>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Occupancy: {occupied}/{p.totalRooms} rooms</span>
                <span className="font-medium text-gray-900">{pct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-3">
                <div className={`h-2.5 rounded-full ${pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-blue-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
              </div>

              {/* Tenants assigned to this property */}
              <div className="mb-3 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tenants ({propertyTenants.length})</span>
                </div>
                {propertyTenants.length === 0 ? (
                  <p className="text-xs text-gray-400">No tenants assigned. Click "Assign" on tenant card.</p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {propertyTenants.map(t => (
                      <div key={t.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-2.5 py-1.5">
                        <span className="font-medium text-gray-800 truncate">{t.name}</span>
                        <span className="text-xs text-indigo-600 font-medium shrink-0 ml-2">Room {t.room || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <span className="text-sm text-gray-500">Monthly Rent</span>
                <span className="text-lg font-bold text-indigo-600">₹{p.monthlyRent.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {properties.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No properties yet</p>
          <p className="text-sm mt-1">Add your first property to get started</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Property' : 'Add Property'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Name*</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Enter property name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as PropertyType })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Full address" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Rooms</label>
                  <input type="number" value={form.totalRooms} onChange={e => setForm({ ...form, totalRooms: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Occupied</label>
                  <input type="number" value={form.occupiedRooms} onChange={e => setForm({ ...form, occupiedRooms: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rent (₹)</label>
                  <input type="number" value={form.monthlyRent} onChange={e => setForm({ ...form, monthlyRent: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button>
                <button onClick={save} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">
                  {editingId ? 'Update' : 'Add'} Property
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
