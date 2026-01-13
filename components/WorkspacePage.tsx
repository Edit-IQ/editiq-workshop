import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Trash2, 
  X as CloseIcon,
  Download,
  FileText
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { Client } from '../types';
import { firebaseDb, testFirestoreConnection } from '../services/firebaseDb';
import { ExportService } from '../services/exportService';

interface WorkspacePageProps {
  userId: string;
}

type TaskStatus = 'PENDING' | 'WORKING' | 'COMPLETED';

interface Task {
  id: string;
  clientId: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

const STATUS_COLORS = {
  PENDING: 'bg-slate-800/50 text-slate-400 border-slate-700/50',
  WORKING: 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]',
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
};

const WorkspacePage: React.FC<WorkspacePageProps> = ({ userId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<'ALL' | TaskStatus>('ALL');
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | '30days' | 'custom'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  
  const [newTask, setNewTask] = useState({
    title: '',
    clientId: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    const [tasksData, clientsData, transactionsData] = await Promise.all([
      firebaseDb.getWorkspaceTasks(userId),
      firebaseDb.getClients(userId),
      firebaseDb.getTransactions(userId)
    ]);
    setTasks(tasksData);
    setClients(clientsData);
    setTransactions(transactionsData);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.clientId) return;

    try {
      console.log('🔄 Adding workspace task:', newTask);
      console.log('🔍 User ID:', userId);
      
      const taskData = {
        clientId: newTask.clientId,
        title: newTask.title,
        description: newTask.description,
        status: 'PENDING',
        dueDate: newTask.dueDate
      };
      
      console.log('📝 Task data to save:', taskData);
      
      const taskId = await firebaseDb.addWorkspaceTask(userId, taskData);
      console.log('✅ Task added with ID:', taskId);
      
      setNewTask({
        title: '',
        clientId: '',
        description: '',
        dueDate: new Date().toISOString().split('T')[0]
      });
      setIsAdding(false);
      loadData(); // Refresh data
    } catch (error) {
      console.error('❌ Failed to add task:', error);
      alert(`Failed to add project: ${error.message}`);
    }
  };

  const updateTaskStatus = async (id: string, newStatus: TaskStatus) => {
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      
      const updates: any = { status: newStatus };
      
      // Add timestamps for status changes
      if (newStatus === 'WORKING' && !task.startedAt) {
        updates.startedAt = Date.now();
      }
      if (newStatus === 'COMPLETED') {
        updates.completedAt = Date.now();
        if (!task.startedAt) updates.startedAt = Date.now();
      }
      
      await firebaseDb.updateWorkspaceTask(userId, id, updates);
      loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to update task status:', error);
      alert('Failed to update project status. Please try again.');
    }
  };

  const deleteTask = async (id: string) => {
    if (confirm('Delete this project?')) {
      try {
        await firebaseDb.deleteWorkspaceTask(userId, id);
        loadData(); // Refresh data
      } catch (error) {
        console.error('Failed to delete task:', error);
        alert('Failed to delete project. Please try again.');
      }
    }
  };

  const getFilteredTasksByTime = (tasks: Task[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (timeFilter) {
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return tasks.filter(t => new Date(t.dueDate) >= weekAgo);
      
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return tasks.filter(t => new Date(t.dueDate) >= monthStart);
      
      case '30days':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        return tasks.filter(t => new Date(t.dueDate) >= thirtyDaysAgo);
      
      case 'custom':
        const [year, month] = selectedMonth.split('-').map(Number);
        const customMonthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);
        return tasks.filter(t => {
          const taskDate = new Date(t.dueDate);
          return taskDate >= customMonthStart && taskDate <= monthEnd;
        });
      
      default:
        return tasks;
    }
  };

  const stats = useMemo(() => {
    const filteredTasks = getFilteredTasksByTime(tasks);
    return {
      total: filteredTasks.length,
      pending: filteredTasks.filter(t => t.status === 'PENDING').length,
      working: filteredTasks.filter(t => t.status === 'WORKING').length,
      completed: filteredTasks.filter(t => t.status === 'COMPLETED').length,
      statusDistribution: [
        { name: 'Pending', value: filteredTasks.filter(t => t.status === 'PENDING').length },
        { name: 'Working', value: filteredTasks.filter(t => t.status === 'WORKING').length },
        { name: 'Completed', value: filteredTasks.filter(t => t.status === 'COMPLETED').length },
      ],
    };
  }, [tasks, timeFilter, selectedMonth]);

  const dailyProgress = useMemo(() => {
    const filteredTasks = getFilteredTasksByTime(tasks);
    
    // Adjust the number of days based on time filter
    const daysToShow = timeFilter === 'week' ? 7 : timeFilter === 'month' ? 30 : timeFilter === '30days' ? 30 : 7;
    
    const days = [...Array(daysToShow)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (daysToShow - 1 - i));
      return d.toISOString().split('T')[0];
    });

    return days.map(dateStr => {
      const tasksOnDate = filteredTasks.filter(t => t.dueDate === dateStr);
      const date = new Date(dateStr);
      return {
        date: daysToShow > 7 
          ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        pending: tasksOnDate.filter(t => t.status === 'PENDING').length,
        working: tasksOnDate.filter(t => t.status === 'WORKING').length,
        completed: tasksOnDate.filter(t => t.status === 'COMPLETED').length,
      };
    });
  }, [tasks, timeFilter, selectedMonth]);

  const filteredTasks = useMemo(() => {
    const timeFilteredTasks = getFilteredTasksByTime(tasks);
    return timeFilteredTasks
      .filter(t => filter === 'ALL' || t.status === filter)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [tasks, filter, timeFilter, selectedMonth]);

  const COLORS = ['#64748b', '#3b82f6', '#10b981'];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Project Workspace</h1>
          <p className="text-slate-400">Manage your freelance projects and track progress.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
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
          
          <button 
            onClick={() => setIsAdding(true)}
            className="px-6 py-3 bg-blue-600 rounded-xl text-white font-bold hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Plus size={20} /> New Project
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Projects', value: stats.total, color: 'slate', icon: Calendar },
          { label: 'In Queue', value: stats.pending, color: 'amber', icon: Clock },
          { label: 'Working', value: stats.working, color: 'blue', icon: Clock },
          { label: 'Completed', value: stats.completed, color: 'emerald', icon: CheckCircle }
        ].map((stat, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-3xl font-bold text-white mt-1">{stat.value}</h3>
              <div className="space-y-1 mt-2">
                <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                  {timeFilter === 'all' ? 'All Time' : 
                   timeFilter === 'week' ? 'Last 7 Days' :
                   timeFilter === 'month' ? 'This Month' : 
                   timeFilter === '30days' ? 'Last 30 Days' :
                   new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
                <p className="text-slate-700 text-[9px] font-mono">
                  Updated: {new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>
            </div>
            <div className={`p-3 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-500`}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold text-white">Progress Timeline</h4>
            <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
              {timeFilter === 'all' ? 'Last 7 Days' : 
               timeFilter === 'week' ? 'Last 7 Days' :
               timeFilter === 'month' ? 'Last 30 Days' : 
               timeFilter === '30days' ? 'Last 30 Days' :
               new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyProgress}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '16px', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="pending" name="Pending" stackId="a" fill="#64748b" />
                <Bar dataKey="working" name="Working" stackId="a" fill="#3b82f6" />
                <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold text-white">Status Distribution</h4>
            <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
              {timeFilter === 'all' ? 'All Time' : 
               timeFilter === 'week' ? 'Last Week' :
               timeFilter === 'month' ? 'This Month' : 
               timeFilter === '30days' ? 'Last 30 Days' :
               new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '16px', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['ALL', 'PENDING', 'WORKING', 'COMPLETED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {f === 'ALL' ? 'All Projects' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="text-sm text-slate-500">
          Showing <span className="text-white font-bold">{filteredTasks.length}</span> projects
          {timeFilter !== 'all' && (
            <span className="text-slate-600"> • {
              timeFilter === 'week' ? 'Last 7 days' :
              timeFilter === 'month' ? 'This month' : 
              timeFilter === '30days' ? 'Last 30 days' :
              new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            }</span>
          )}
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Work Times</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTasks.map(task => {
                const client = clients.find(c => c.id === task.clientId);
                return (
                  <tr key={task.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full">
                        {client?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <h4 className="font-bold text-white">{task.title}</h4>
                        {task.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                        className={`text-xs font-bold uppercase px-3 py-1 rounded-lg border outline-none cursor-pointer bg-slate-800 text-white ${STATUS_COLORS[task.status]}`}
                        style={{
                          backgroundColor: task.status === 'PENDING' ? '#1e293b' : 
                                         task.status === 'WORKING' ? '#1e40af' : '#059669',
                          color: 'white'
                        }}
                      >
                        <option value="PENDING" style={{ backgroundColor: '#1e293b', color: 'white' }}>Pending</option>
                        <option value="WORKING" style={{ backgroundColor: '#1e40af', color: 'white' }}>Working</option>
                        <option value="COMPLETED" style={{ backgroundColor: '#059669', color: 'white' }}>Completed</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="text-xs">
                          <span className="text-slate-500">Created:</span>
                          <span className="text-slate-300 ml-1 font-mono">
                            {new Date(task.createdAt).toLocaleString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </div>
                        {task.startedAt && (
                          <div className="text-xs">
                            <span className="text-slate-500">Started:</span>
                            <span className="text-blue-400 ml-1 font-mono">
                              {new Date(task.startedAt).toLocaleString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </span>
                          </div>
                        )}
                        {task.completedAt && (
                          <div className="text-xs">
                            <span className="text-slate-500">Completed:</span>
                            <span className="text-green-400 ml-1 font-mono">
                              {new Date(task.completedAt).toLocaleString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </span>
                          </div>
                        )}
                        {task.startedAt && task.completedAt && (
                          <div className="text-xs">
                            <span className="text-slate-500">Duration:</span>
                            <span className="text-cyan-400 ml-1 font-mono">
                              {(() => {
                                const durationMs = task.completedAt - task.startedAt;
                                const seconds = Math.floor(durationMs / 1000);
                                const minutes = Math.floor(seconds / 60);
                                const hours = Math.floor(minutes / 60);
                                
                                if (hours > 0) {
                                  return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
                                } else if (minutes > 0) {
                                  return `${minutes}m ${seconds % 60}s`;
                                } else {
                                  return `${seconds}s`;
                                }
                              })()}
                            </span>
                          </div>
                        )}
                        {!task.startedAt && !task.completedAt && (
                          <span className="text-xs text-slate-600">Not started</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-400">
                        {new Date(task.dueDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => deleteTask(task.id)}
                        className="text-slate-600 hover:text-rose-500 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredTasks.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-xl font-bold text-white">No Projects Found</h3>
              <p className="text-slate-500 mt-2">Start by creating your first project.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Project Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">New Project</h2>
              <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-white">
                <CloseIcon size={24} />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Client</label>
                <select 
                  required
                  value={newTask.clientId}
                  onChange={e => setNewTask({...newTask, clientId: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-blue-500 focus:outline-none text-white"
                >
                  <option value="">Select Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Project Title</label>
                <input 
                  required
                  type="text" 
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-blue-500 focus:outline-none text-white"
                  placeholder="e.g. Website Redesign"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Description</label>
                <textarea 
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-blue-500 focus:outline-none text-white resize-none"
                  rows={3}
                  placeholder="Project requirements and details..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Due Date</label>
                <input 
                  required
                  type="date" 
                  value={newTask.dueDate}
                  onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-blue-500 focus:outline-none text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 text-slate-400 font-semibold hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspacePage;