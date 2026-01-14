import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Download, 
  Plus, 
  FileText,
  CheckCircle,
  X as CloseIcon,
  CloudLightning
} from 'lucide-react';
import { Transaction, TransactionType, Client } from '../types';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { firebaseDb } from '../services/firebaseDb';
import { localDb } from '../services/localDb';
import { ExportService } from '../services/exportService';
import { BackupService } from '../services/backupService';

const COLORS = ['#3b82f6', '#0ea5e9', '#6366f1', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316'];
const INCOME_COLOR = '#3b82f6';
const EXPENSE_COLOR = '#f43f5e';

interface DashboardProps {
  userId: string;
}

type TimeFrame = 'daily' | 'monthly';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value).replace('INR', '₹');
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const income = payload.find((p: any) => p.dataKey === 'income')?.value || 0;
    const expense = payload.find((p: any) => p.dataKey === 'expense')?.value || 0;
    const profit = income - expense;

    return (
      <div className="bg-[#0b1120] border border-slate-700/50 p-6 rounded-3xl shadow-2xl backdrop-blur-xl min-w-[220px]">
        <p className="text-slate-500 text-[9px] font-black uppercase mb-4 tracking-[0.2em] border-b border-slate-800 pb-3">{label}</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-blue-500 uppercase">Inflow</span>
            <span className="text-sm font-black text-white">{formatCurrency(income)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-rose-500 uppercase">Outflow</span>
            <span className="text-sm font-black text-white">{formatCurrency(expense)}</span>
          </div>
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-500 uppercase">Net</span>
            <span className={`text-sm font-black ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(profit)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ userId }) => {
  const isDemoUser = userId === 'guest-user-123';
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('daily');
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | '30days' | 'custom'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [clientFilter, setClientFilter] = useState<string>('all'); // Add client filter to Dashboard too

  const [newTx, setNewTx] = useState({
    amount: 0,
    type: TransactionType.INCOME,
    category: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
    clientId: ''
  });

  useEffect(() => {
    console.log('🔍 Dashboard useEffect - User ID:', userId, 'isDemoUser:', isDemoUser);
    
    if (isDemoUser) {
      // For demo users, use localStorage and poll for changes
      const loadLocalData = () => {
        const txs = localDb.getTransactions(userId);
        const cls = localDb.getClients(userId);
        console.log('📊 Demo data loaded - Transactions:', txs.length, 'Clients:', cls.length);
        setTransactions(txs);
        setClients(cls);
      };
      
      loadLocalData();
      const interval = setInterval(loadLocalData, 1000);
      return () => clearInterval(interval);
    } else {
      console.log('🔥 Setting up Firebase subscriptions for user:', userId);
      // For real users, use Firebase service
      const unsubTx = firebaseDb.subscribeToTransactions(userId, (data) => {
        console.log('📊 Firebase transactions loaded:', data.length);
        setTransactions(data);
      });
      
      const unsubCl = firebaseDb.subscribeToClients(userId, (data) => {
        console.log('👥 Firebase clients loaded:', data.length);
        setClients(data);
      });
      
      return () => {
        unsubTx();
        unsubCl();
      };
    }
  }, [userId, isDemoUser]);

  const getFilteredTransactionsByTime = (transactions: Transaction[]) => {
    console.log('🔍 Filtering transactions:', {
      total: transactions.length,
      timeFilter,
      clientFilter,
      selectedMonth,
      transactions: transactions.map(t => ({ 
        id: t.id, 
        type: t.type, 
        amount: t.amount, 
        date: t.date,
        category: t.category,
        clientId: t.clientId 
      }))
    });
    
    // First filter by client
    let filtered = transactions;
    if (clientFilter !== 'all') {
      if (clientFilter === 'no-client') {
        filtered = transactions.filter(t => !t.clientId);
      } else {
        filtered = transactions.filter(t => t.clientId === clientFilter);
      }
    }
    
    // Then filter by time
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (timeFilter) {
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        const weekFiltered = filtered.filter(t => new Date(t.date) >= weekAgo);
        console.log('📅 Week filtered:', weekFiltered.length, 'transactions');
        return weekFiltered;
      
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthFiltered = filtered.filter(t => new Date(t.date) >= monthStart);
        console.log('📅 Month filtered:', monthFiltered.length, 'transactions');
        return monthFiltered;
      
      case '30days':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const thirtyDayFiltered = filtered.filter(t => new Date(t.date) >= thirtyDaysAgo);
        console.log('📅 30-day filtered:', thirtyDayFiltered.length, 'transactions');
        return thirtyDayFiltered;
      
      case 'custom':
        const [year, month] = selectedMonth.split('-').map(Number);
        const customMonthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);
        const customFiltered = filtered.filter(t => {
          const txDate = new Date(t.date);
          return txDate >= customMonthStart && txDate <= monthEnd;
        });
        console.log('📅 Custom month filtered:', customFiltered.length, 'transactions');
        return customFiltered;
      
      default:
        console.log('📅 All time - no time filter:', filtered.length, 'transactions');
        return filtered;
    }
  };

  const stats = useMemo(() => {
    console.log('🔍 Stats calculation starting...');
    console.log('📊 Raw transactions:', transactions);
    
    const filteredTransactions = getFilteredTransactionsByTime(transactions);
    console.log('💰 Filtered transactions:', filteredTransactions);
    
    const income = filteredTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    
    console.log('💰 Final calculation:', {
      totalTransactions: transactions.length,
      filteredTransactions: filteredTransactions.length,
      incomeCount: filteredTransactions.filter(t => t.type === TransactionType.INCOME).length,
      expenseCount: filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).length,
      totalIncome: income,
      totalExpense: expense,
      profit: income - expense
    });
    
    return { income, expense, profit: income - expense };
  }, [transactions, timeFilter, selectedMonth, clientFilter]);

  const chartData = useMemo(() => {
    const filteredTransactions = getFilteredTransactionsByTime(transactions);
    
    if (timeFrame === 'monthly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.map(m => {
        const income = filteredTransactions.filter(t => t.type === TransactionType.INCOME && new Date(t.date).toLocaleString('default', { month: 'short' }) === m).reduce((sum, t) => sum + t.amount, 0);
        const expense = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE && new Date(t.date).toLocaleString('default', { month: 'short' }) === m).reduce((sum, t) => sum + t.amount, 0);
        return { name: m, income, expense };
      }).filter(d => d.income > 0 || d.expense > 0 || d.name === new Date().toLocaleString('default', { month: 'short' }));
    } else {
      const daysToShow = timeFilter === 'week' ? 7 : timeFilter === 'month' || timeFilter === '30days' ? 30 : 7;
      const days = [];
      const today = new Date();
      
      for (let i = daysToShow - 1; i >= 0; i--) {
        const d = new Date(); 
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const income = filteredTransactions.filter(t => t.type === TransactionType.INCOME && t.date === dateStr).reduce((sum, t) => sum + t.amount, 0);
        const expense = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE && t.date === dateStr).reduce((sum, t) => sum + t.amount, 0);
        days.push({ 
          name: daysToShow > 7 
            ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), 
          income, 
          expense 
        });
      }
      return days;
    }
  }, [transactions, timeFrame, timeFilter, selectedMonth]);

  const pieData = useMemo(() => {
    const filteredTransactions = getFilteredTransactionsByTime(transactions);
    const cats: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => cats[t.category] = (cats[t.category] || 0) + t.amount);
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [transactions, timeFilter, selectedMonth]);

  const handleExportCSV = () => {
    ExportService.exportCSV(transactions);
  };

  const handleExportPDF = async () => {
    try {
      // Get workspace tasks for combined report
      const tasks = await firebaseDb.getWorkspaceTasks(userId);
      
      await ExportService.exportCombinedReportPDF(
        tasks,
        clients, 
        transactions,
        userId,
        'dashboard-chart',
        `EditIQ_Complete_Report_${new Date().toISOString().split('T')[0]}.pdf`
      );
    } catch (error) {
      console.error('Failed to export combined report:', error);
      // Fallback to dashboard-only PDF if workspace data fails
      await ExportService.exportDashboardPDF(
        transactions, 
        clients, 
        'dashboard-chart',
        `EditIQ_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`
      );
    }
  };

  const handleExportBackup = async () => {
    try {
      console.log('Starting backup for user:', userId)
      const backupData = await BackupService.exportAllData(userId)
      BackupService.downloadBackup(backupData)
      
      // Also try manual Supabase backup if RLS is blocking
      if (userId !== 'guest-user-123') {
        try {
          const manualBackup = await BackupService.manualSupabaseBackup()
          if (manualBackup.clients.length > 0 || manualBackup.transactions.length > 0 || manualBackup.credentials.length > 0) {
            const fullBackup = {
              exportDate: new Date().toISOString(),
              userId: userId,
              source: 'manual-supabase',
              data: manualBackup,
              summary: {
                totalClients: manualBackup.clients.length,
                totalTransactions: manualBackup.transactions.length,
                totalCredentials: manualBackup.credentials.length
              }
            }
            BackupService.downloadBackup(fullBackup, `editiq-manual-backup-${new Date().toISOString().split('T')[0]}.json`)
          }
        } catch (error) {
          console.warn('Manual backup failed, using regular backup:', error)
        }
      }
    } catch (error) {
      console.error('Backup failed:', error)
      alert('Backup failed. Please try again.')
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTx.amount <= 0) return;
    
    try {
      if (isDemoUser) {
        localDb.addTransaction(userId, newTx);
        // Force immediate reload of transactions
        const updatedTxs = localDb.getTransactions(userId);
        setTransactions(updatedTxs);
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
      setLastSaved(new Date().toLocaleTimeString());
      setTimeout(() => setLastSaved(null), 3000);
    } catch (error) {
      console.error('Failed to add transaction:', error);
      alert('Failed to add transaction. Please try again.');
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      {/* Header HUD */}
      <header className="flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-1 bg-blue-600 rounded-full"></div>
             <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em]">Operations Center</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">Command Center</h1>
        </div>
        <div className="flex flex-col gap-3">
          {/* Time Period Filter */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 overflow-x-auto">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'week', label: 'Last Week' },
              { id: 'month', label: 'This Month' },
              { id: '30days', label: 'Last 30 Days' },
              { id: 'custom', label: 'Select Month' }
            ].map(period => (
              <button
                key={period.id}
                onClick={() => setTimeFilter(period.id as any)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  timeFilter === period.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
          
          {/* Month Selector */}
          {timeFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-bold">Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-bold"
              />
            </div>
          )}
          
          {/* Export Buttons */}
          <div className="flex gap-2 overflow-x-auto pb-2">
             <button 
               onClick={handleExportCSV}
               className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-blue-500 transition-all flex items-center gap-2 text-slate-400 active:scale-95 whitespace-nowrap"
             >
                <Download size={14} /> CSV
             </button>
             <button 
               onClick={handleExportPDF}
               className="px-4 py-3 bg-blue-600 border border-blue-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 text-white active:scale-95 whitespace-nowrap"
             >
                <FileText size={14} /> PDF Report
             </button>
             <button 
               onClick={handleExportBackup}
               className="px-4 py-3 bg-green-600 border border-green-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-green-700 transition-all flex items-center gap-2 text-white active:scale-95 whitespace-nowrap"
             >
                <CloudLightning size={14} /> Full Backup
             </button>
          </div>
        </div>
      </header>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Gross Revenue', value: stats.income, icon: TrendingUp, color: 'blue', desc: 'Total Inflow' },
          { label: 'Operating Burn', value: stats.expense, icon: TrendingDown, color: 'rose', desc: 'Total Outflow' },
          { label: 'Net Liquidity', value: stats.profit, icon: DollarSign, color: 'blue', desc: 'Active Balance', highlight: true }
        ].map((item, idx) => (
          <div key={idx} className={`p-10 rounded-[3rem] border transition-all duration-500 ${item.highlight ? 'bg-blue-600 border-blue-500 shadow-[0_30px_60px_rgba(37,99,235,0.3)]' : 'bg-slate-900/50 border-slate-800 shadow-xl'}`}>
            <div className="flex items-center justify-between mb-10">
               <div className={`p-4 rounded-2xl ${item.highlight ? 'bg-white/10 text-white' : `bg-${item.color}-500/10 text-${item.color}-500`}`}>
                  <item.icon size={28} strokeWidth={3} />
               </div>
               <span className={`text-[10px] font-black uppercase tracking-widest ${item.highlight ? 'text-blue-100' : 'text-slate-500'}`}>{item.label}</span>
            </div>
            <div className="text-4xl font-black text-white tracking-tighter mb-2">{formatCurrency(item.value)}</div>
            <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${item.highlight ? 'text-blue-200' : 'text-slate-500'}`}>
              {item.desc} • {
                timeFilter === 'all' ? 'All Time' : 
                timeFilter === 'week' ? 'Last 7 Days' :
                timeFilter === 'month' ? 'This Month' : 
                timeFilter === '30days' ? 'Last 30 Days' :
                `${new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
              }
            </p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-[3rem] p-6 md:p-10 shadow-2xl overflow-hidden relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-4">
             <div>
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">Performance Flow</h3>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
                  Real-time Metrics • {
                    timeFilter === 'all' ? 'All Time' : 
                    timeFilter === 'week' ? 'Last 7 Days' :
                    timeFilter === 'month' ? 'This Month' : 
                    timeFilter === '30days' ? 'Last 30 Days' :
                    new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                  }
                </p>
             </div>
             <div className="flex bg-slate-800/40 border border-slate-700 rounded-xl p-1">
                <button 
                   onClick={() => setTimeFrame('daily')}
                   className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${timeFrame === 'daily' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                   Daily
                </button>
                <button 
                   onClick={() => setTimeFrame('monthly')}
                   className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${timeFrame === 'monthly' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                   Monthly
                </button>
             </div>
          </div>
          
          <div className="h-64 md:h-80" id="dashboard-chart">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.3} />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                   <Tooltip content={<CustomTooltip />} />
                   <Bar dataKey="income" fill={INCOME_COLOR} radius={[8, 8, 0, 0]} />
                   <Bar dataKey="expense" fill={EXPENSE_COLOR} radius={[8, 8, 0, 0]} />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-[3rem] p-6 md:p-10 shadow-2xl">
          <div className="mb-8 md:mb-12">
             <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">Expense Breakdown</h3>
             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Top Categories</p>
          </div>
          
          {pieData.length > 0 ? (
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                         data={pieData}
                         cx="50%"
                         cy="50%"
                         innerRadius={60}
                         outerRadius={100}
                         paddingAngle={5}
                         dataKey="value"
                      >
                         {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                   </PieChart>
                </ResponsiveContainer>
                
                <div className="mt-8 space-y-3">
                   {pieData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="text-xs font-bold text-slate-300">{item.name}</span>
                         </div>
                         <span className="text-xs font-black text-white">{formatCurrency(item.value)}</span>
                      </div>
                   ))}
                </div>
             </div>
          ) : (
             <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                   <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <TrendingDown className="w-8 h-8 text-slate-600" />
                   </div>
                   <h3 className="text-lg font-bold text-white mb-2">No Expenses</h3>
                   <p className="text-slate-500 text-sm">No expense data for the selected period.</p>
                </div>
             </div>
          )}
        </div>
      </div>

      {/* Transaction Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">New Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
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

      {lastSaved && (
         <div className="fixed bottom-24 right-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl z-40">
            <p className="text-emerald-400 text-sm font-bold">✅ Transaction saved at {lastSaved}</p>
         </div>
      )}

      {/* Add Entry Button - Large Circular Floating Button */}
      {!isAdding && (
        <button 
           onClick={() => setIsAdding(true)}
           className="fixed bottom-28 right-8 md:bottom-8 md:right-8 w-20 h-20 bg-blue-600 rounded-full text-white font-bold hover:bg-blue-700 transition-all shadow-2xl shadow-blue-600/40 flex items-center justify-center z-50 active:scale-95 hover:scale-110"
           title="Add Entry"
        >
           <Plus size={32} strokeWidth={3} />
        </button>
      )}
    </div>
  );
};

export default Dashboard;