
import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, Calendar, Download } from 'lucide-react';
import { Transaction, TransactionType, Client } from '../types';
import { firebaseDb } from '../services/firebaseDb';
import { localDb } from '../services/localDb';
import { ExportService } from '../services/exportService';

interface TransactionsPageProps {
  userId: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value).replace('INR', '₹');
};

const TransactionsPage: React.FC<TransactionsPageProps> = ({ userId }) => {
  const isDemoUser = userId === 'guest-user-123';
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [clientFilter, setClientFilter] = useState<string>('all'); // New client filter state
  const [newTx, setNewTx] = useState({
    amount: 0,
    type: TransactionType.INCOME,
    category: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
    clientId: ''
  });

  useEffect(() => {
    if (isDemoUser) {
      // For demo users, use localStorage and poll for changes
      const loadLocalData = () => {
        const txs = localDb.getTransactions(userId);
        const cls = localDb.getClients(userId);
        setTransactions(txs);
        setClients(cls);
      };
      
      loadLocalData();
      const interval = setInterval(loadLocalData, 1000);
      return () => clearInterval(interval);
    } else {
      // For real users, use Supabase subscriptions
      const unsubTx = firebaseDb.subscribeToTransactions(userId, (data) => {
        setTransactions(data);
      });
      
      const unsubCl = firebaseDb.subscribeToClients(userId, (data) => {
        setClients(data);
      });
      
      return () => {
        unsubTx();
        unsubCl();
      };
    }
  }, [userId, isDemoUser]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTx.amount <= 0) return;
    
    try {
      if (isDemoUser) {
        localDb.addTransaction(userId, newTx);
      } else {
        await firebaseDb.addTransaction(userId, newTx);
      }
      
      setNewTx({
        amount: 0,
        type: TransactionType.INCOME,
        category: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
        clientId: ''
      });
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to add transaction:', error);
      alert('Failed to add transaction. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (isDemoUser) {
        localDb.deleteTransaction(userId, id);
      } else {
        await firebaseDb.deleteTransaction(userId, id);
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Failed to delete transaction. Please try again.');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Income & Expense</h1>
          <p className="text-slate-400">Record every rupee in and out of your business.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Client Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400 font-bold whitespace-nowrap">Filter by Client:</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Clients</option>
              <option value="no-client">No Client Linked</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => ExportService.exportCSV(transactions)}
              className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold hover:border-indigo-500 transition-all flex items-center gap-2 text-slate-400"
            >
              <Download size={16} /> Export CSV
            </button>
            <button 
              onClick={() => setIsAdding(true)}
              className="px-6 py-3 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Add Entry
            </button>
          </div>
        </div>
      </header>

      {/* Transaction List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div>
            <h2 className="font-bold">Recent History</h2>
            <p className="text-xs text-slate-500 mt-1">
              Showing {transactions.filter(tx => {
                if (clientFilter === 'all') return true;
                if (clientFilter === 'no-client') return !tx.clientId;
                return tx.clientId === clientFilter;
              }).length} of {transactions.length} transactions
              {clientFilter !== 'all' && (
                <span className="ml-2 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full text-xs">
                  {clientFilter === 'no-client' 
                    ? 'No Client' 
                    : clients.find(c => c.id === clientFilter)?.name || 'Unknown Client'
                  }
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-slate-400">Income</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <span className="text-slate-400">Expense</span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-800">
          {transactions
            .filter(tx => {
              // Client filter
              if (clientFilter === 'all') return true;
              if (clientFilter === 'no-client') return !tx.clientId;
              return tx.clientId === clientFilter;
            })
            .map(tx => {
            const client = clients.find(c => c.id === tx.clientId);
            return (
              <div key={tx.id} className="p-4 md:p-6 flex items-center gap-4 hover:bg-slate-800/30 transition-colors group">
                <div className={`p-3 rounded-2xl ${
                  tx.type === TransactionType.INCOME 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : 'bg-rose-500/10 text-rose-500'
                }`}>
                  {tx.type === TransactionType.INCOME ? <Plus size={20} /> : <Minus size={20} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{tx.category}</span>
                    {client && (
                      <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                        {client.name}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {tx.note && <span className="truncate max-w-[200px] italic">"{tx.note}"</span>}
                  </div>
                </div>
                <div className={`text-lg font-bold ${
                  tx.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-rose-500'
                }`}>
                  {tx.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(tx.amount)}
                </div>
                <button 
                  onClick={() => handleDelete(tx.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-500 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}
          {transactions
            .filter(tx => {
              // Client filter
              if (clientFilter === 'all') return true;
              if (clientFilter === 'no-client') return !tx.clientId;
              return tx.clientId === clientFilter;
            }).length === 0 && (
            <div className="p-20 text-center text-slate-500 italic">
              {clientFilter === 'all' 
                ? 'No transactions found.' 
                : clientFilter === 'no-client'
                ? 'No transactions without client links found.'
                : `No transactions found for ${clients.find(c => c.id === clientFilter)?.name || 'this client'}.`
              }
            </div>
          )}
        </div>
      </div>

      {/* Add Entry Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">New Entry</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="flex p-1 bg-slate-800 rounded-xl mb-6">
                <button 
                  type="button"
                  onClick={() => setNewTx({...newTx, type: TransactionType.INCOME})}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newTx.type === TransactionType.INCOME ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  Income
                </button>
                <button 
                  type="button"
                  onClick={() => setNewTx({...newTx, type: TransactionType.EXPENSE})}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newTx.type === TransactionType.EXPENSE ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  Expense
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Amount (₹)</label>
                  <input 
                    required
                    type="number" 
                    value={newTx.amount}
                    onChange={e => setNewTx({...newTx, amount: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-indigo-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Date</label>
                  <input 
                    required
                    type="date" 
                    value={newTx.date}
                    onChange={e => setNewTx({...newTx, date: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Note / Description</label>
                <input 
                  type="text" 
                  value={newTx.note}
                  onChange={e => setNewTx({...newTx, note: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-indigo-500 focus:outline-none"
                  placeholder="Subscription, client payment, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Category</label>
                  <input 
                    required
                    type="text" 
                    value={newTx.category}
                    onChange={e => setNewTx({...newTx, category: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Adobe Suite"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Link Client (Optional)</label>
                  <select 
                    value={newTx.clientId}
                    onChange={e => setNewTx({...newTx, clientId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-indigo-500 focus:outline-none appearance-none"
                  >
                    <option value="">None</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 text-slate-400 font-semibold hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all">Save Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;
