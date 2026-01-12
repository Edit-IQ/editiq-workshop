
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
  Database,
  CheckCircle,
  X as CloseIcon,
  CloudLightning,
  Users
} from 'lucide-react';
import { Transaction, TransactionType, Client } from '../types';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  addDoc 
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
  const isDemoUser = userId === 'demo-user-123';
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [activeType, setActiveType] = useState<TransactionType>(TransactionType.INCOME);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('daily');
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | '30days' | 'custom'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [clientFilter, setClientFilter] = useState<string>('all'); // Add client filter to Dashboard too

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

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
      // For real users, try to load Firebase data directly first
      const loadFirebaseData = async () => {
        try {
          console.log('🔄 Loading Firebase data directly...');
          
          // Use direct Firebase access with your specific user ID
          const specificUserId = 'WpskF7imp5SEp28t0t22v5wA';
          
          // Get clients directly
          const clientsQuery = query(
            collection(db, 'clients'),
            where('userId', '==', specificUserId),
            orderBy('createdAt', 'desc')
          );
          const clientsSnapshot = await getDocs(clientsQuery);
          const firebaseClients: Client[] = [];
          
          clientsSnapshot.forEach((doc) => {
            const data = doc.data();
            firebaseClients.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toMillis() || Date.now()
            } as Client);
          });
          
          // Get transactions directly
          const transactionsQuery = query(
            collection(db, 'transactions'),
            where('userId', '==', specificUserId),
            orderBy('date', 'desc')
          );
          const transactionsSnapshot = await getDocs(transactionsQuery);
          const firebaseTransactions: Transaction[] = [];
          
          transactionsSnapshot.forEach((doc) => {
            const data = doc.data();
            // Normalize transaction type to uppercase to match enum
            const normalizedType = typeof data.type === 'string' ? data.type.toUpperCase() : data.type;
            firebaseTransactions.push({
              id: doc.id,
              ...data,
              type: normalizedType // Ensure type matches TransactionType enum
            } as Transaction);
          });
          
          console.log('✅ Firebase data loaded:', {
            clients: firebaseClients.length,
            transactions: firebaseTransactions.length
          });
          
          setClients(firebaseClients);
          setTransactions(firebaseTransactions);
          
        } catch (error) {
          console.error('❌ Firebase direct access failed:', error);
          // Fallback to regular Firebase service
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
      };
      
      loadFirebaseData();
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
    await ExportService.exportDashboardPDF(
      transactions, 
      clients, 
      'dashboard-chart',
      `EditIQ_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`
    );
  };

  const handleExportBackup = async () => {
    try {
      console.log('Starting backup for user:', userId)
      const backupData = await BackupService.exportAllData(userId)
      BackupService.downloadBackup(backupData)
      
      // Also try manual Supabase backup if RLS is blocking
      if (userId !== 'demo-user-123') {
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

  // Force reload Firebase data
  const forceLoadData = async () => {
    try {
      console.log('🔄 Force loading Firebase data...');
      
      // First, let's see what's actually in the database
      console.log('🔍 Checking all clients in database...');
      const allClientsQuery = query(collection(db, 'clients'));
      const allClientsSnapshot = await getDocs(allClientsQuery);
      
      console.log('📊 Total clients in database:', allClientsSnapshot.size);
      allClientsSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📄 Client doc:', {
          id: doc.id,
          userId: data.userId,
          name: data.name,
          platform: data.platform,
          fullData: data
        });
      });
      
      console.log('🔍 Checking all transactions in database...');
      const allTransactionsQuery = query(collection(db, 'transactions'));
      const allTransactionsSnapshot = await getDocs(allTransactionsQuery);
      
      console.log('📊 Total transactions in database:', allTransactionsSnapshot.size);
      allTransactionsSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('💰 Transaction doc:', {
          id: doc.id,
          userId: data.userId,
          amount: data.amount,
          type: data.type,
          category: data.category,
          fullData: data
        });
      });
      
      // If no data exists, let's add some test data
      if (allClientsSnapshot.size === 0 && allTransactionsSnapshot.size === 0) {
        console.log('📝 No data found. Adding test data...');
        
        try {
          // Add test client first
          const testClient = {
            name: 'Test Client',
            platform: 'YouTube',
            projectType: 'Video Editing',
            notes: 'Test client for verification',
            userId: 'WpskF7imp5SEp28t0t22v5wA',
            createdAt: new Date()
          };
          
          const clientRef = await addDoc(collection(db, 'clients'), testClient);
          console.log('✅ Test client added:', clientRef.id);
          
          // Add test transaction
          const testTransaction = {
            amount: 5000,
            type: 'INCOME', // Fixed: Use uppercase to match TransactionType enum
            category: 'Freelance',
            date: new Date().toISOString().split('T')[0],
            note: 'Test transaction',
            userId: 'WpskF7imp5SEp28t0t22v5wA',
            clientId: clientRef.id // Link to the client
          };
          
          const txRef = await addDoc(collection(db, 'transactions'), testTransaction);
          console.log('✅ Test transaction added:', txRef.id);
          
          alert('✅ Test data added! Click Force Load again to see it.');
          return;
        } catch (addError) {
          console.error('❌ Failed to add test data:', addError);
          alert(`❌ Failed to add test data: ${addError.message}`);
          return;
        }
      }
      
      // If we have transactions but no clients, add some clients
      if (allClientsSnapshot.size === 0 && allTransactionsSnapshot.size > 0) {
        console.log('📝 Found transactions but no clients. Adding sample clients...');
        
        try {
          const sampleClients = [
            {
              name: 'YouTube Creator',
              platform: 'YouTube',
              projectType: 'Video Editing',
              notes: 'Regular video editing client',
              userId: 'WpskF7imp5SEp28t0t22v5wA',
              createdAt: new Date()
            },
            {
              name: 'Instagram Influencer',
              platform: 'Instagram',
              projectType: 'Graphic Design',
              notes: 'Social media content creation',
              userId: 'WpskF7imp5SEp28t0t22v5wA',
              createdAt: new Date()
            }
          ];
          
          for (const client of sampleClients) {
            const clientRef = await addDoc(collection(db, 'clients'), client);
            console.log('✅ Sample client added:', client.name, clientRef.id);
          }
          
          alert('✅ Sample clients added! Refresh to see them.');
          return;
        } catch (addError) {
          console.error('❌ Failed to add sample clients:', addError);
          alert(`❌ Failed to add clients: ${addError.message}`);
          return;
        }
      }
      
      // Now try with your specific user ID (corrected)
      const specificUserId = 'WpskF7imp5SEp28t0t22v5wAhQT2'; // Fixed: Added missing hQT2
      console.log('🎯 Looking for data with userId:', specificUserId);
      
      // Get clients for your user ID
      const clientsQuery = query(
        collection(db, 'clients'),
        where('userId', '==', specificUserId)
      );
      const clientsSnapshot = await getDocs(clientsQuery);
      const firebaseClients: Client[] = [];
      
      clientsSnapshot.forEach((doc) => {
        const data = doc.data();
        firebaseClients.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis() || Date.now()
        } as Client);
      });
      
      // Get transactions for your user ID
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', specificUserId)
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const firebaseTransactions: Transaction[] = [];
      
      transactionsSnapshot.forEach((doc) => {
        const data = doc.data();
        // Normalize transaction type to uppercase to match enum
        const normalizedType = typeof data.type === 'string' ? data.type.toUpperCase() : data.type;
        firebaseTransactions.push({
          id: doc.id,
          ...data,
          type: normalizedType // Ensure type matches TransactionType enum
        } as Transaction);
      });
      
      console.log('📊 Force loaded data:', {
        clients: firebaseClients.length,
        transactions: firebaseTransactions.length,
        clientsData: firebaseClients,
        transactionsData: firebaseTransactions
      });
      
      setClients(firebaseClients);
      setTransactions(firebaseTransactions);
      
      alert(`��� Data loaded! ${firebaseClients.length} clients, ${firebaseTransactions.length} transactions. Check console for details.`);
      
    } catch (error) {
      console.error('❌ Force load failed:', error);
      alert(`❌ Failed: ${error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setIsSubmitting(true);
    try {
      const transactionData = {
        amount: parseFloat(amount),
        type: activeType,
        category: category || (activeType === TransactionType.INCOME ? 'Income' : 'General'),
        date: date,
        note: '',
        clientId: clientId || undefined
      };

      if (isDemoUser) {
        localDb.addTransaction(userId, transactionData);
      } else {
        await firebaseDb.addTransaction(userId, transactionData);
      }

      setAmount(''); 
      setCategory(''); 
      setClientId('');
      setIsAdding(false);
      setLastSaved(new Date().toLocaleTimeString());
      setTimeout(() => setLastSaved(null), 3000);
    } catch (err) { 
      alert("Sync failed."); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      {/* Header HUD */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-1 bg-blue-600 rounded-full"></div>
             <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em]">Operations Center</span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter">Command Center</h1>
        </div>
        <div className="flex flex-col gap-3">
          {/* Time Period Filter */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
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
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
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
          <div className="flex gap-3">
             <button 
               onClick={forceLoadData}
               className="px-4 py-3 bg-orange-600 border border-orange-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-orange-700 transition-all flex items-center gap-2 text-white active:scale-95"
             >
                <Database size={14} /> Force Load
             </button>
             <button 
               onClick={() => {
                 // Add sample clients directly
                 const addClients = async () => {
                   try {
                     const sampleClients = [
                       { name: 'YouTube Creator', platform: 'YouTube', projectType: 'Video Editing', notes: 'Video editing client', userId: 'WpskF7imp5SEp28t0t22v5wAhQT2', createdAt: new Date() },
                       { name: 'Instagram Influencer', platform: 'Instagram', projectType: 'Graphic Design', notes: 'Social media content', userId: 'WpskF7imp5SEp28t0t22v5wAhQT2', createdAt: new Date() }
                     ];
                     for (const client of sampleClients) {
                       await addDoc(collection(db, 'clients'), client);
                     }
                     alert('✅ Sample clients added! Go to Clients page to see them.');
                   } catch (error) {
                     alert(`❌ Failed: ${error.message}`);
                   }
                 };
                 addClients();
               }}
               className="px-4 py-3 bg-purple-600 border border-purple-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all flex items-center gap-2 text-white active:scale-95"
             >
                <Users size={14} /> Add Clients
             </button>
             <button 
               onClick={handleExportCSV}
               className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-blue-500 transition-all flex items-center gap-2 text-slate-400 active:scale-95"
             >
                <Download size={14} /> CSV
             </button>
             <button 
               onClick={handleExportPDF}
               className="px-4 py-3 bg-blue-600 border border-blue-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 text-white active:scale-95"
             >
                <FileText size={14} /> PDF Report
             </button>
             <button 
               onClick={handleExportBackup}
               className="px-4 py-3 bg-green-600 border border-green-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-green-700 transition-all flex items-center gap-2 text-white active:scale-95"
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
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-[3rem] p-10 shadow-2xl overflow-hidden relative">
          <div className="flex items-center justify-between mb-12">
             <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Performance Flow</h3>
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
             <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button onClick={() => setTimeFrame('daily')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${timeFrame === 'daily' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>Daily</button>
                <button onClick={() => setTimeFrame('monthly')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${timeFrame === 'monthly' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>Monthly</button>
             </div>
          </div>
          <div id="dashboard-chart" className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} fontWeight={900} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} fontWeight={900} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
                <Bar dataKey="income" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="expense" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-[3rem] p-10 shadow-2xl">
           <h3 className="text-2xl font-black text-white tracking-tight mb-2">Allocations</h3>
           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-8">
             Outflow Breakdown • {
               timeFilter === 'all' ? 'All Time' : 
               timeFilter === 'week' ? 'Last 7 Days' :
               timeFilter === 'month' ? 'This Month' : 
               timeFilter === '30days' ? 'Last 30 Days' :
               new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
             }
           </p>
           
           <div className="h-64 relative mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={10}>
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-white text-2xl font-black tracking-tighter">{formatCurrency(stats.expense)}</span>
                 <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Cost</span>
              </div>
           </div>

           <div className="space-y-4">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{d.name}</span>
                   </div>
                   <span className="text-[11px] font-black text-white">{formatCurrency(d.value)}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Action FAB - Positioned for mobile safety (above bottom bar) */}
      <div className="fixed bottom-24 right-6 md:bottom-24 md:right-12 z-40">
         <button 
           onClick={() => { setActiveType(TransactionType.INCOME); setIsAdding(true); }}
           className="w-16 h-16 md:w-20 md:h-20 bg-blue-600 text-white rounded-2xl md:rounded-[2.5rem] flex items-center justify-center shadow-[0_15px_40px_rgba(37,99,235,0.4)] hover:scale-110 transition-all hover:bg-blue-500 active:scale-90"
           aria-label="Add Transaction"
         >
            <Plus size={32} strokeWidth={4} className="w-8 h-8 md:w-10 md:h-10" />
         </button>
      </div>

      {/* Entry Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-[3rem] p-12 shadow-2xl animate-in zoom-in-95 duration-300 relative">
            <button onClick={() => setIsAdding(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors active:scale-90"><CloseIcon size={24} /></button>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">New Entry</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10">Record Transaction</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
               <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-4">
                  <button type="button" onClick={() => setActiveType(TransactionType.INCOME)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeType === TransactionType.INCOME ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Income</button>
                  <button type="button" onClick={() => setActiveType(TransactionType.EXPENSE)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeType === TransactionType.EXPENSE ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500'}`}>Expense</button>
               </div>

               <div className="space-y-6">
                  <div className="relative">
                     <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-700">₹</span>
                     <input required autoFocus type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full pl-14 pr-6 py-8 bg-slate-950 border border-slate-800 rounded-3xl text-4xl font-black text-white focus:border-blue-500 focus:outline-none transition-all" placeholder="0.00" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                     <input type="text" value={category} onChange={e => setCategory(e.target.value)} className="w-full px-6 py-5 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white focus:border-blue-500 focus:outline-none" placeholder="Category" />
                     <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-6 py-5 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white focus:border-blue-500 focus:outline-none" />
                  </div>

                  <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full px-6 py-5 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white focus:border-blue-500 focus:outline-none appearance-none cursor-pointer">
                    <option value="">No Client Linked</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>

               <button type="submit" disabled={isSubmitting} className={`w-full py-6 rounded-3xl text-white font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-4 ${activeType === TransactionType.INCOME ? 'bg-blue-600 shadow-blue-900/40 hover:bg-blue-500' : 'bg-rose-600 shadow-rose-900/40 hover:bg-rose-500'} active:scale-95`}>
                  {isSubmitting ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div> : <><CheckCircle size={20} /> Commit to Ledger</>}
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Sync Status Toast */}
      {lastSaved && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-top-12 duration-500">
           <div className="px-6 py-3 bg-blue-600 text-white rounded-full shadow-[0_10px_30px_rgba(37,99,235,0.5)] flex items-center gap-3">
              <CloudLightning size={16} className="animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest">Synchronized • {lastSaved}</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
