import { useState, useEffect } from 'react';
import { Property } from '../types';
import { generateId } from '../data';
import { formatDate } from '../utils/helpers';
import { Plus, X, ExternalLink, Trash2, FolderOpen, Image, FileText, File, Link2, Search, Upload, Building2 } from 'lucide-react';

interface DocEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  propertyId: string;
  driveLink: string;
  fileType: string;
  addedDate: string;
}

interface Props {
  properties: Property[];
  onToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const CATEGORIES = ['Property Photo', 'Agreement', 'ID Proof', 'Receipt', 'Tax Document', 'Insurance', 'Maintenance Proof', 'Blueprint', 'NOC', 'Other'];
const FILE_TYPES = ['Photo', 'PDF', 'Document', 'Spreadsheet', 'Video', 'Other'];
const FILE_ICONS: Record<string, any> = { Photo: Image, PDF: FileText, Document: FileText, Spreadsheet: FileText, Video: File, Other: File };
const CAT_COLORS: Record<string, string> = { 'Property Photo': 'bg-blue-100 text-blue-700', Agreement: 'bg-purple-100 text-purple-700', 'ID Proof': 'bg-amber-100 text-amber-700', Receipt: 'bg-green-100 text-green-700', 'Tax Document': 'bg-red-100 text-red-700', Insurance: 'bg-cyan-100 text-cyan-700', 'Maintenance Proof': 'bg-orange-100 text-orange-700', Blueprint: 'bg-indigo-100 text-indigo-700', NOC: 'bg-rose-100 text-rose-700', Other: 'bg-gray-100 text-gray-700' };

const STORAGE_KEY = 'rentflow_documents';

export default function Documents({ properties, onToast }: Props) {
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterProp, setFilterProp] = useState('');
  const [form, setForm] = useState({ title: '', description: '', category: 'Property Photo', propertyId: '', driveLink: '', fileType: 'Photo' });

  // Load from localStorage
  useEffect(() => {
    try { const stored = localStorage.getItem(STORAGE_KEY); if (stored) setDocs(JSON.parse(stored)); } catch {}
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  }, [docs]);

  const filtered = docs.filter(d => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat && d.category !== filterCat) return false;
    if (filterProp && d.propertyId !== filterProp) return false;
    return true;
  });

  const addDoc = () => {
    if (!form.title.trim() || !form.driveLink.trim()) { onToast('Enter title and Google Drive link', 'error'); return; }
    setDocs([...docs, { id: generateId(), ...form, addedDate: new Date().toISOString().split('T')[0] }]);
    setShowForm(false);
    setForm({ title: '', description: '', category: 'Property Photo', propertyId: '', driveLink: '', fileType: 'Photo' });
    onToast('Document added');
  };

  const deleteDoc = (id: string) => {
    if (!window.confirm('Remove this document link?')) return;
    setDocs(docs.filter(d => d.id !== id));
    onToast('Document removed');
  };

  const getPropertyName = (pid: string) => properties.find(p => p.id === pid)?.name || 'General';

  const catCounts = CATEGORIES.reduce((acc, cat) => { acc[cat] = docs.filter(d => d.category === cat).length; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900">Documents & Files</h1><p className="text-gray-500 text-sm mt-1">{docs.length} documents linked | Stored on Google Drive</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm"><Plus className="w-4 h-4" /> Add Document</button>
      </div>

      {/* How it works */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
        <h3 className="text-sm font-bold text-indigo-800 mb-2 flex items-center gap-2"><FolderOpen className="w-4 h-4" /> How it works</h3>
        <ol className="text-xs text-indigo-700 space-y-1.5">
          <li>1. Upload your file to <a href="https://drive.google.com" target="_blank" rel="noreferrer" className="underline font-bold">Google Drive</a></li>
          <li>2. Right-click the file → "Get link" → Set to "Anyone with the link"</li>
          <li>3. Copy the link and paste it here</li>
          <li>4. Your files stay safe on Google Drive - RentFlow just keeps the links organized</li>
        </ol>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.filter(c => catCounts[c] > 0).map(cat => (
          <button key={cat} onClick={() => setFilterCat(filterCat === cat ? '' : cat)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${filterCat === cat ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
            <span className={`w-2 h-2 rounded-full ${CAT_COLORS[cat]?.split(' ')[0] || 'bg-gray-400'}`} />
            {cat} ({catCounts[cat]})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex-1 min-w-[180px]"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
        <select value={filterProp} onChange={e => setFilterProp(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">All Properties</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        {(search || filterCat || filterProp) && <button onClick={() => { setSearch(''); setFilterCat(''); setFilterProp(''); }} className="text-xs text-indigo-600 font-medium px-2">Clear</button>}
      </div>

      {/* Document Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map(d => {
          const FIcon = FILE_ICONS[d.fileType] || File;
          return (
            <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-indigo-50 rounded-xl shrink-0"><FIcon className="w-5 h-5 text-indigo-600" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-gray-900 truncate">{d.title}</h3>
                  {d.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{d.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${CAT_COLORS[d.category] || 'bg-gray-100 text-gray-600'}`}>{d.category}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 font-medium">{d.fileType}</span>
                    {d.propertyId && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium flex items-center gap-0.5"><Building2 className="w-2.5 h-2.5" />{getPropertyName(d.propertyId)}</span>}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">Added: {formatDate(d.addedDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-50">
                <a href={d.driveLink} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 py-2 rounded-lg font-bold transition border border-blue-100">
                  <ExternalLink className="w-3.5 h-3.5" /> Open in Drive
                </a>
                <button onClick={() => { navigator.clipboard.writeText(d.driveLink); onToast('Link copied'); }} className="flex items-center justify-center gap-1.5 text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 py-2 px-3 rounded-lg font-bold transition border border-gray-200">
                  <Link2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteDoc(d.id)} className="flex items-center justify-center text-xs bg-red-50 text-red-600 hover:bg-red-100 py-2 px-3 rounded-lg font-bold transition border border-red-100">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><FolderOpen className="w-8 h-8 text-gray-300" /></div>
          <p className="text-lg font-medium">No documents yet</p>
          <p className="text-sm mt-1">Upload files to Google Drive and add links here</p>
        </div>
      )}

      {/* Add Document Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold">Add Document</h2><button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl mb-4">
              <p className="text-xs text-blue-700"><span className="font-bold">Tip:</span> Upload your file to <a href="https://drive.google.com" target="_blank" rel="noreferrer" className="underline">Google Drive</a> first, then paste the share link below.</p>
            </div>

            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="e.g., Property Front Photo" /></div>

              <div><label className="block text-sm font-medium text-gray-700 mb-1">Google Drive Link *</label>
                <div className="relative">
                  <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={form.driveLink} onChange={e => setForm({ ...form, driveLink: e.target.value })} className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="https://drive.google.com/file/d/..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">File Type</label>
                  <select value={form.fileType} onChange={e => setForm({ ...form, fileType: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none">
                    {FILE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div><label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                <select value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">General / Not linked</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none" placeholder="Optional notes..." /></div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button>
                <button onClick={addDoc} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2"><Upload className="w-4 h-4" /> Add Document</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
