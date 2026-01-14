
import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Copy, 
  ExternalLink, 
  Search,
  CheckCircle,
  X as CloseIcon,
  Lock
} from 'lucide-react';
import { Credential } from '../types';
import { firebaseDb } from '../services/firebaseDb';
import { localDb } from '../services/localDb';

interface CredentialsPageProps {
  userId: string;
}

const CredentialsPage: React.FC<CredentialsPageProps> = ({ userId }) => {
  const isDemoUser = userId === 'guest-user-123';
  
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  
  const [newCred, setNewCred] = useState({
    platformName: '',
    loginName: '',
    password: '',
    notes: ''
  });

  const loadData = async () => {
    try {
      let data: Credential[];
      if (isDemoUser) {
        data = localDb.getCredentials(userId);
      } else {
        data = await firebaseDb.getCredentials(userId);
      }
      setCredentials(data);
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast here
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCred.platformName || !newCred.loginName) return;
    
    try {
      if (isDemoUser) {
        localDb.addCredential(userId, newCred);
      } else {
        await firebaseDb.addCredential(userId, newCred);
      }
      
      setNewCred({ platformName: '', loginName: '', password: '', notes: '' });
      setIsAdding(false);
      loadData();
    } catch (error) {
      console.error('Failed to add credential:', error);
      alert('Failed to add credential. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Permanently delete this login?')) {
      try {
        if (isDemoUser) {
          localDb.deleteCredential(userId, id);
        } else {
          await firebaseDb.deleteCredential(userId, id);
        }
        loadData();
      } catch (error) {
        console.error('Failed to delete credential:', error);
        alert('Failed to delete credential. Please try again.');
      }
    }
  };

  const filtered = credentials.filter(c => 
    c.platformName.toLowerCase().includes(search.toLowerCase()) || 
    c.loginName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-500/20">
            <Shield size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Access Vault</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Encrypted Client Credentials</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="px-6 py-3 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Add New Login
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input 
          type="text" 
          placeholder="Search platforms or accounts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-slate-900 border border-slate-800 rounded-2xl focus:border-indigo-500 focus:outline-none transition-colors text-white font-medium"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(cred => (
          <div key={cred.id} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl relative group overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-indigo-400">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg tracking-tight leading-none">{cred.platformName}</h3>
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Platform Account</span>
                </div>
              </div>
              <button onClick={() => handleDelete(cred.id)} className="p-2 text-slate-600 hover:text-rose-500 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Login Name</label>
                <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                  <span className="text-sm font-semibold text-slate-200 truncate">{cred.loginName}</span>
                  <button onClick={() => copyToClipboard(cred.loginName)} className="p-1.5 text-slate-500 hover:text-indigo-400 transition-colors">
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Security Token</label>
                <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                  <span className="text-sm font-semibold text-slate-200">
                    {showPasswords[cred.id] ? cred.password : '••••••••••••'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => togglePassword(cred.id)} className="p-1.5 text-slate-500 hover:text-indigo-400 transition-colors">
                      {showPasswords[cred.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={() => copyToClipboard(cred.password)} className="p-1.5 text-slate-500 hover:text-indigo-400 transition-colors">
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {cred.notes && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 italic">"{cred.notes}"</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500 text-white rounded-xl">
                  <Plus size={24} />
                </div>
                <h2 className="text-2xl font-bold text-white">New Credential</h2>
              </div>
              <button onClick={() => setIsAdding(false)} className="p-2 text-slate-600 hover:text-white transition-colors">
                <CloseIcon size={24} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Platform / Company</label>
                <input 
                  required
                  type="text" 
                  value={newCred.platformName}
                  onChange={e => setNewCred({...newCred, platformName: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-indigo-500 focus:outline-none text-white font-semibold"
                  placeholder="e.g. YouTube, Adobe, Envato"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Login Name / Email</label>
                <input 
                  required
                  type="text" 
                  value={newCred.loginName}
                  onChange={e => setNewCred({...newCred, loginName: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-indigo-500 focus:outline-none text-white font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Password / Key</label>
                <input 
                  required
                  type="password" 
                  value={newCred.password}
                  onChange={e => setNewCred({...newCred, password: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-indigo-500 focus:outline-none text-white font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Quick Note</label>
                <input 
                  type="text" 
                  value={newCred.notes}
                  onChange={e => setNewCred({...newCred, notes: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-indigo-500 focus:outline-none text-white text-xs"
                  placeholder="Recovery email, usage, etc."
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-4 text-slate-400 font-bold hover:text-white">Discard</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                  <CheckCircle size={18} /> Store Securely
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CredentialsPage;
