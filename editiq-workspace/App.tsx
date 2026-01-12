
import React, { useState, useEffect, useMemo } from 'react';
import { Task, TaskStatus, TaskStats, DailyProgress, Client } from './types';
import { STORAGE_KEY_TASKS, STORAGE_KEY_CLIENTS, STATUS_COLORS, STATUS_LABELS, formatFullDate } from './constants';
import StatsOverview from './components/StatsOverview';
import Dashboard from './components/Dashboard';
import TaskForm from './components/TaskForm';
import ClientModal from './components/ClientModal';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | TaskStatus>('ALL');

  const LOGO_URL = "https://res.cloudinary.com/dvd6oa63p/image/upload/v1761247018/logoinvoice_1_klnd51.png";

  // Load Data
  useEffect(() => {
    const savedTasks = localStorage.getItem(STORAGE_KEY_TASKS);
    const savedClients = localStorage.getItem(STORAGE_KEY_CLIENTS);
    if (savedTasks) try { setTasks(JSON.parse(savedTasks)); } catch (e) { console.error(e); }
    if (savedClients) try { setClients(JSON.parse(savedClients)); } catch (e) { console.error(e); }
  }, []);

  // Save Data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(clients));
  }, [clients]);

  // Actions
  const addClient = (name: string) => {
    const newClient: Client = { id: crypto.randomUUID(), name };
    setClients(prev => [...prev, newClient]);
  };

  const deleteClient = (id: string) => {
    if (tasks.some(t => t.clientId === id)) {
      alert("Cannot delete client while they have associated tasks.");
      return;
    }
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const addTask = (newTask: Omit<Task, 'id' | 'createdAt' | 'status'>) => {
    const task: Task = { 
      ...newTask, 
      id: crypto.randomUUID(), 
      createdAt: Date.now(),
      status: 'PENDING' 
    };
    setTasks(prev => [task, ...prev]);
  };

  const updateTaskStatus = (id: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const updates: Partial<Task> = { status: newStatus };
        if (newStatus === 'WORKING' && !t.startedAt) updates.startedAt = Date.now();
        if (newStatus === 'COMPLETED') {
          updates.completedAt = Date.now();
          if (!t.startedAt) updates.startedAt = Date.now();
        }
        return { ...t, ...updates };
      }
      return t;
    }));
  };

  const deleteTask = (id: string) => {
    if (confirm("Permanently remove this project record?")) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(t => filter === 'ALL' || t.status === filter)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [tasks, filter]);

  const stats = useMemo((): TaskStats => {
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'PENDING').length,
      working: tasks.filter(t => t.status === 'WORKING').length,
      completed: tasks.filter(t => t.status === 'COMPLETED').length,
      statusDistribution: [
        { name: 'Pending', value: tasks.filter(t => t.status === 'PENDING').length },
        { name: 'Working', value: tasks.filter(t => t.status === 'WORKING').length },
        { name: 'Completed', value: tasks.filter(t => t.status === 'COMPLETED').length },
      ],
    };
  }, [tasks]);

  const dailyProgress = useMemo((): DailyProgress[] => {
    const days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return days.map(dateStr => {
      const tasksOnDate = tasks.filter(t => t.dueDate === dateStr);
      return {
        date: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
        pending: tasksOnDate.filter(t => t.status === 'PENDING').length,
        working: tasksOnDate.filter(t => t.status === 'WORKING').length,
        completed: tasksOnDate.filter(t => t.status === 'COMPLETED').length,
      };
    });
  }, [tasks]);

  return (
    <div className="min-h-screen pb-24 selection:bg-blue-500/30">
      <nav className="h-24 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40 flex items-center px-10">
        <div className="max-w-[1500px] mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-5">
            {/* Logo Container without white border */}
            <div className="w-16 h-16 rounded-full bg-[#020617] flex items-center justify-center overflow-hidden transform hover:scale-105 transition-transform duration-300">
              <img 
                src={LOGO_URL} 
                alt="EditiQ Logo" 
                className="w-full h-full object-cover scale-110" 
              />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white leading-none">EditiQ <span className="text-gradient">Workspace</span></h1>
              <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Mastered by Ankur Dey
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            <button 
              onClick={() => setIsClientModalOpen(true)}
              className="px-6 py-3 text-slate-400 font-bold text-sm hover:text-white transition-all bg-white/5 rounded-2xl border border-white/5 hover:border-white/10"
            >
              Clients
            </button>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-8 py-3.5 rounded-2xl font-extrabold text-sm transition-all flex items-center gap-3 shadow-[0_10px_30px_-10px_rgba(59,130,246,0.5)] active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
              <span>ADD TASK</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1500px] mx-auto px-10 mt-12">
        <StatsOverview stats={stats} />
        <Dashboard stats={stats} dailyProgress={dailyProgress} />

        <div className="glass-panel rounded-[2.5rem] overflow-hidden">
          <div className="px-10 py-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
            <div>
              <h2 className="text-3xl font-black text-white">Project Pipeline</h2>
              <p className="text-slate-500 text-sm mt-2 font-medium tracking-wide">Real-time studio workflow monitor</p>
            </div>
            
            <div className="flex bg-white/5 p-2 rounded-[1.5rem] border border-white/5">
              {(['ALL', 'PENDING', 'WORKING', 'COMPLETED'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-8 py-3 text-xs font-extrabold rounded-2xl transition-all uppercase tracking-widest ${
                    filter === f ? 'bg-white/10 text-white shadow-xl ring-1 ring-white/20' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {f === 'ALL' ? 'Everything' : STATUS_LABELS[f as TaskStatus]}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="px-10 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">Client</th>
                  <th className="px-10 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">Project Details</th>
                  <th className="px-10 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">Status</th>
                  <th className="px-10 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">Start Time</th>
                  <th className="px-10 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">Finish Time</th>
                  <th className="px-10 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredTasks.map(task => {
                  const client = clients.find(c => c.id === task.clientId);
                  return (
                    <tr key={task.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-10 py-8 whitespace-nowrap">
                        <span className="text-xs font-bold text-cyan-400 bg-cyan-400/5 px-4 py-2 rounded-xl border border-cyan-400/10 inline-block">
                          {client?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-10 py-8 min-w-[350px]">
                        <div>
                          <h4 className={`font-bold text-white text-lg ${task.status === 'COMPLETED' ? 'opacity-30' : ''}`}>{task.title}</h4>
                          {task.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2 max-w-sm font-medium leading-relaxed italic">{task.description}</p>}
                          <div className="flex items-center gap-3 mt-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Due:</span>
                            <span className="text-[10px] font-bold text-slate-400">{new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8 whitespace-nowrap">
                        <select
                          value={task.status}
                          onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                          className={`text-[10px] font-black uppercase tracking-widest border px-5 py-2.5 rounded-2xl outline-none appearance-none cursor-pointer transition-all ${STATUS_COLORS[task.status]}`}
                        >
                          <option value="PENDING" className="bg-slate-900">Pending</option>
                          <option value="WORKING" className="bg-slate-900">Working</option>
                          <option value="COMPLETED" className="bg-slate-900">Completed</option>
                        </select>
                      </td>
                      <td className="px-10 py-8 whitespace-nowrap">
                        <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                          {formatFullDate(task.startedAt)}
                        </span>
                      </td>
                      <td className="px-10 py-8 whitespace-nowrap">
                        <span className="text-[11px] font-bold text-emerald-400 tabular-nums">
                          {formatFullDate(task.completedAt)}
                        </span>
                      </td>
                      <td className="px-10 py-8 text-right whitespace-nowrap">
                        <button 
                          onClick={() => deleteTask(task.id)}
                          className="text-slate-700 hover:text-rose-500 p-3 rounded-2xl hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredTasks.length === 0 && (
              <div className="py-32 text-center">
                <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-white/5">
                  <svg className="w-12 h-12 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v2m16 4h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
                </div>
                <h3 className="text-2xl font-black text-white">Workflow Optimized</h3>
                <p className="text-slate-500 mt-4 max-w-sm mx-auto text-sm font-medium">All project boards are currently cleared. Take a rest, Ankur!</p>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-32 py-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-[#020617] flex items-center justify-center overflow-hidden grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100">
               <img src={LOGO_URL} alt="EditiQ" className="w-full h-full object-cover scale-110" />
             </div>
             <p className="text-xs font-bold text-slate-600 tracking-widest">EDITION v3.5 // DARK STUDIO SUITE</p>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 animate-pulse">Signature Work of Ankur Dey</p>
        </footer>
      </main>

      {isFormOpen && (
        <TaskForm 
          clients={clients}
          onSubmit={addTask} 
          onClose={() => setIsFormOpen(false)}
          onOpenClientManager={() => setIsClientModalOpen(true)}
        />
      )}

      {isClientModalOpen && (
        <ClientModal
          clients={clients}
          onAdd={addClient}
          onDelete={deleteClient}
          onClose={() => setIsClientModalOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
