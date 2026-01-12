
import React, { useState, useEffect, useMemo } from 'react';
import { BrainCircuit, TrendingUp, AlertCircle, Lightbulb, BarChart3, PieChart, DollarSign } from 'lucide-react';
import { Transaction, TransactionType, Client } from '../types';
import { firebaseDb } from '../services/firebaseDb';

interface InsightsPageProps {
  userId: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value).replace('INR', '₹');
};

const InsightsPage: React.FC<InsightsPageProps> = ({ userId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txs, cls] = await Promise.all([
        firebaseDb.getTransactions(userId),
        firebaseDb.getClients(userId)
      ]);
      setTransactions(txs);
      setClients(cls);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const insights = useMemo(() => {
    if (transactions.length === 0) return null;

    const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    const profit = income - expense;

    // Calculate monthly averages
    const monthlyIncome = income / Math.max(1, new Set(transactions.map(t => t.date.slice(0, 7))).size);
    const monthlyExpense = expense / Math.max(1, new Set(transactions.map(t => t.date.slice(0, 7))).size);

    // Top expense categories
    const expenseCategories: Record<string, number> = {};
    transactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
      expenseCategories[t.category] = (expenseCategories[t.category] || 0) + t.amount;
    });
    const topExpense = Object.entries(expenseCategories).sort(([,a], [,b]) => b - a)[0];

    // Client earnings
    const clientEarnings: Record<string, number> = {};
    transactions.filter(t => t.type === TransactionType.INCOME && t.clientId).forEach(t => {
      clientEarnings[t.clientId!] = (clientEarnings[t.clientId!] || 0) + t.amount;
    });
    const topClient = Object.entries(clientEarnings).sort(([,a], [,b]) => b - a)[0];
    const topClientName = topClient ? clients.find(c => c.id === topClient[0])?.name : null;

    return {
      totalIncome: income,
      totalExpense: expense,
      profit,
      monthlyIncome,
      monthlyExpense,
      topExpense: topExpense ? { category: topExpense[0], amount: topExpense[1] } : null,
      topClient: topClient && topClientName ? { name: topClientName, amount: topClient[1] } : null,
      profitMargin: income > 0 ? ((profit / income) * 100) : 0
    };
  }, [transactions, clients]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading insights...</div>
      </div>
    );
  }

  if (!insights || transactions.length === 0) {
    return (
      <div className="space-y-8">
        <header className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
            <BrainCircuit size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Business Insights</h1>
            <p className="text-slate-400">Analytics and insights for your freelance business.</p>
          </div>
        </header>

        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl">
          <BarChart3 className="mx-auto text-indigo-400 mb-4" size={48} />
          <h2 className="text-xl font-bold mb-2">No Data Yet</h2>
          <p className="text-slate-400 max-w-md mx-auto">
            Start adding transactions to see insights about your freelance business performance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
          <BrainCircuit size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Business Insights</h1>
          <p className="text-slate-400">Analytics and insights for your freelance business.</p>
        </div>
      </header>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Profit Margin</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {insights.profitMargin.toFixed(1)}%
          </div>
          <p className="text-sm text-slate-400">
            {insights.profitMargin > 20 ? 'Excellent' : insights.profitMargin > 10 ? 'Good' : 'Needs Improvement'}
          </p>
        </div>

        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
              <DollarSign size={24} />
            </div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Monthly Average</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {formatCurrency(insights.monthlyIncome)}
          </div>
          <p className="text-sm text-slate-400">Average monthly income</p>
        </div>

        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl">
              <PieChart size={24} />
            </div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Monthly Expenses</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {formatCurrency(insights.monthlyExpense)}
          </div>
          <p className="text-sm text-slate-400">Average monthly costs</p>
        </div>
      </div>

      {/* Business Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Lightbulb size={20} className="text-emerald-400" />
            Business Performance
          </h3>
          <div className="space-y-4">
            <div className="flex gap-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
              <div className="w-10 h-10 shrink-0 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center font-bold">
                ₹
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Total Profit</p>
                <p className="text-sm text-slate-300">
                  You've earned {formatCurrency(insights.profit)} in total profit from {transactions.length} transactions.
                </p>
              </div>
            </div>

            {insights.topClient && (
              <div className="flex gap-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                <div className="w-10 h-10 shrink-0 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center font-bold">
                  👑
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">Top Client</p>
                  <p className="text-sm text-slate-300">
                    {insights.topClient.name} has paid you {formatCurrency(insights.topClient.amount)} total.
                  </p>
                </div>
              </div>
            )}

            {insights.topExpense && (
              <div className="flex gap-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                <div className="w-10 h-10 shrink-0 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center font-bold">
                  📊
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">Top Expense Category</p>
                  <p className="text-sm text-slate-300">
                    {insights.topExpense.category}: {formatCurrency(insights.topExpense.amount)} spent.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-8 bg-gradient-to-br from-indigo-600/20 to-transparent border border-indigo-500/20 rounded-3xl">
          <h3 className="text-xl font-bold mb-6">Quick Tips</h3>
          <div className="space-y-6">
            <div className="p-4 bg-slate-800/30 rounded-2xl">
              <h4 className="font-semibold text-white mb-2">💡 Profit Optimization</h4>
              <p className="text-sm text-slate-300">
                {insights.profitMargin > 20 
                  ? "Great profit margin! Consider expanding your services."
                  : insights.profitMargin > 10
                  ? "Good profit margin. Look for ways to reduce costs or increase rates."
                  : "Focus on increasing rates or reducing expenses to improve profitability."
                }
              </p>
            </div>

            <div className="p-4 bg-slate-800/30 rounded-2xl">
              <h4 className="font-semibold text-white mb-2">📈 Growth Strategy</h4>
              <p className="text-sm text-slate-300">
                {insights.topClient 
                  ? `Your top client relationship is strong. Consider offering additional services to ${insights.topClient.name}.`
                  : "Focus on building stronger client relationships for recurring income."
                }
              </p>
            </div>

            <div className="p-4 bg-slate-800/30 rounded-2xl">
              <h4 className="font-semibold text-white mb-2">💰 Financial Health</h4>
              <p className="text-sm text-slate-300">
                Monthly income: {formatCurrency(insights.monthlyIncome)} | 
                Monthly expenses: {formatCurrency(insights.monthlyExpense)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsPage;
