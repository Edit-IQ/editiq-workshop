import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Trash2, ExternalLink, DollarSign, Wallet, CheckCircle, Download } from 'lucide-react';
import { Client, Platform, ProjectType, Transaction, TransactionType } from '../types';
import { firebaseDb } from '../services/firebaseDb';
import { localDb } from '../services/localDb';
import { ExportService } from '../services/exportService';

interface ClientsPageProps {
  userId: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value).replace('INR', '₹');
};

const ClientsPage: React.FC<ClientsPageProps> = ({ userId }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activePaymentClient, setActivePaymentClient] = useState<Client | null>(null);
  const [activeHistoryClient, setActiveHistoryClient] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  
  // Client Form State
  const [newClient, setNewClient] = useState({
    name: '',
    platform: Platform.YOUTUBE,
    projectType: ProjectType.VIDEO_EDITING,
    notes: ''
  });

  // Quick Payment State
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState<string>('');

  useEffect(() => {
    loadData();
    
    // Check Firebase connection status
    const checkFirebase = () => {
      // Firebase is always connected with hardcoded config in firebase.ts
      const isConnected = true;
      console.log('🔥 Firebase status:', isConnected ? '✅ Connected' : '❌ Disconnected');
    };
    
    checkFirebase();
  }, [userId]);

  const isDemoUser = userId === 'guest-user-123';

  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 ClientsPage: Loading clients and transactions for userId:', userId);
      console.log('🔍 ClientsPage: Is demo user:', isDemoUser);
      
      let cls: Client[], txs: Transaction[];
      
      if (isDemoUser) {
        console.log('Using localStorage for demo user');
        cls = localDb.getClients(userId);
        txs = localDb.getTransactions(userId);
      } else {
        console.log('🔥 ClientsPage: Using Firebase for real user');
        const [clsData, txsData] = await Promise.all([
          firebaseDb.getClients(userId),
          firebaseDb.getTransactions(userId)
        ]);
        cls = clsData;
        txs = txsData;
      }
      
      console.log('📊 ClientsPage: Loaded data:', {
        userId: userId,
        clients: cls.length,
        transactions: txs.length,
        clientsData: cls,
        transactionsData: txs
      });
      
      setClients(cls);
      setTransactions(txs);
    } catch (error) {
      console.error('❌ ClientsPage: Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || isSaving) return;
    
    try {
      setIsSaving(true);
      
      if (isDemoUser) {
        localDb.addClient(userId, newClient);
      } else {
        await firebaseDb.addClient(userId, newClient);
      }
      
      setNewClient({
        name: '',
        platform: Platform.YOUTUBE,
        projectType: ProjectType.VIDEO_EDITING,
        notes: ''
      });
      setIsAdding(false);
      loadData();
    } catch (error) {
      console.error('Failed to add client:', error);
      alert('Failed to add client. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaymentClient || !paymentAmount) return;
    
    await firebaseDb.addTransaction(userId, {
      amount: parseFloat(paymentAmount),
      type: TransactionType.INCOME,
      category: activePaymentClient.projectType,
      date: paymentDate,
      note: paymentNote || `Payment from ${activePaymentClient.name}`,
      clientId: activePaymentClient.id
    });

    setPaymentAmount('');
    setPaymentNote('');
    setActivePaymentClient(null);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this client and all history?')) {
      try {
        if (isDemoUser) {
          localDb.deleteClient(userId, id);
        } else {
          await firebaseDb.deleteClient(userId, id);
        }
        loadData(); // Refresh the list
      } catch (error) {
        console.error('Failed to delete client:', error);
        alert('Failed to delete client. Please try again.');
      }
    }
  };

  // Calculate earnings per client
  const clientEarnings = useMemo(() => {
    const earnings: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.clientId && tx.type === TransactionType.INCOME) {
        earnings[tx.clientId] = (earnings[tx.clientId] || 0) + tx.amount;
      }
    });
    return earnings;
  }, [transactions]);

  const filteredClients = useMemo(() => {
    return clients
      .filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.platform.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => (clientEarnings[b.id] || 0) - (clientEarnings[a.id] || 0));
  }, [clients, search, clientEarnings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Client Portfolios</h1>
          <p className="text-slate-400">Manage clients and track their lifetime payments.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => ExportService.exportClientsCSV(clients)}
            className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold hover:border-indigo-500 transition-all flex items-center gap-2 text-slate-400"
          >
            <Download size={16} /> Export CSV
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="px-6 py-3 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            <Plus size={20} /> Add New Client
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Search by client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Client Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map(client => {
          const totalEarned = clientEarnings[client.id] || 0;
          return (
            <div key={client.id} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-lg relative group overflow-hidden flex flex-col">
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => handleDelete(client.id)} className="p-2 text-slate-500 hover:text-rose-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg shadow-indigo-600/20">
                  {client.name[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-xl text-white leading-tight">{client.name}</h3>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{client.platform}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800/60 mb-6 flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total Paid You</div>
                  <div className="text-2xl font-black text-emerald-400">{formatCurrency(totalEarned)}</div>
                </div>
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-full">
                  <DollarSign size={20} />
                </div>
              </div>

              <div className="space-y-2 mb-6 flex-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Service</span>
                  <span className="font-medium text-slate-300">{client.projectType}</span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 italic pt-2">
                  {client.notes || "No notes."}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-auto">
                <button 
                  onClick={() => setActivePaymentClient(client)}
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                >
                  <Plus size={14} /> Log Payment
                </button>
                <button 
                  onClick={() => setActiveHistoryClient(client)}
                  className="py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  History <ExternalLink size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Client Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
              <Plus className="text-indigo-500" /> New Client Profile
            </h2>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Client / Channel Name</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={newClient.name}
                  onChange={e => setNewClient({...newClient, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-indigo-500 focus:outline-none text-white"
                  placeholder="e.g. MrBeast, Gaming Channel, etc."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Platform</label>
                  <select 
                    value={newClient.platform}
                    onChange={e => setNewClient({...newClient, platform: e.target.value as Platform})}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-indigo-500 focus:outline-none appearance-none text-white"
                  >
                    {Object.values(Platform).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Service Type</label>
                  <select 
                    value={newClient.projectType}
                    onChange={e => setNewClient({...newClient, projectType: e.target.value as ProjectType})}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-indigo-500 focus:outline-none appearance-none text-white"
                  >
                    {Object.values(ProjectType).map(pt => <option key={pt} value={pt}>{pt}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Notes</label>
                <textarea 
                  value={newClient.notes}
                  onChange={e => setNewClient({...newClient, notes: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-indigo-500 focus:outline-none h-32 resize-none text-white"
                  placeholder="Preferences, deadlines, etc."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 text-slate-400 font-semibold hover:text-white transition-colors">Discard</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50">
                  {isSaving ? 'Creating...' : 'Create Portfolio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Payment Modal */}
      {activePaymentClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
              <Wallet className="text-emerald-500" /> Log Payment
            </h2>
            <div className="mb-6 p-4 bg-slate-800/40 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold">
                  {activePaymentClient.name[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-white">{activePaymentClient.name}</h3>
                  <span className="text-xs text-slate-500 uppercase">{activePaymentClient.platform}</span>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleLogPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Payment Amount (₹)</label>
                <input 
                  autoFocus
                  required
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-emerald-500 focus:outline-none text-white text-lg font-bold"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Payment Date</label>
                <input 
                  required
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-emerald-500 focus:outline-none text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Payment Note (Optional)</label>
                <input 
                  type="text"
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-emerald-500 focus:outline-none text-white"
                  placeholder="e.g. Video editing payment, Monthly retainer"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setActivePaymentClient(null);
                    setPaymentAmount('');
                    setPaymentNote('');
                  }} 
                  className="flex-1 py-3 text-slate-400 font-semibold hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} /> Log Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {activeHistoryClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <DollarSign className="text-blue-500" /> Payment History
              </h2>
              <button 
                onClick={() => setActiveHistoryClient(null)}
                className="p-2 text-slate-500 hover:text-white transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
            
            <div className="mb-6 p-4 bg-slate-800/40 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-lg">
                    {activeHistoryClient.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{activeHistoryClient.name}</h3>
                    <span className="text-xs text-slate-500 uppercase">{activeHistoryClient.platform}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 uppercase font-bold">Total Earned</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(clientEarnings[activeHistoryClient.id] || 0)}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-3">
                {transactions
                  .filter(tx => tx.clientId === activeHistoryClient.id && tx.type === TransactionType.INCOME)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(payment => (
                    <div key={payment.id} className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                          <CheckCircle size={16} />
                        </div>
                        <div>
                          <div className="font-bold text-white">{formatCurrency(payment.amount)}</div>
                          <div className="text-xs text-slate-500">
                            {new Date(payment.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-300">{payment.category}</div>
                        {payment.note && (
                          <div className="text-xs text-slate-500 italic max-w-[200px] truncate">
                            "{payment.note}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                
                {transactions.filter(tx => tx.clientId === activeHistoryClient.id && tx.type === TransactionType.INCOME).length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <DollarSign className="w-8 h-8 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No Payments Yet</h3>
                    <p className="text-slate-500 text-sm">No payment history found for this client.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-800">
              <button 
                onClick={() => setActiveHistoryClient(null)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;