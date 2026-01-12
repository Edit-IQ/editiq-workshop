
import React, { useState } from 'react';
import { Task, Client } from '../types';
import { getGeminiSuggestions } from '../services/geminiService';

interface TaskFormProps {
  clients: Client[];
  onSubmit: (task: Omit<Task, 'id' | 'createdAt' | 'status'>) => void;
  onClose: () => void;
  onOpenClientManager: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ clients, onSubmit, onClose, onOpenClientManager }) => {
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<any>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientId) {
      if (!clientId) alert("Action Required: Add a client to the roster first.");
      return;
    }
    onSubmit({ clientId, title, description, dueDate });
    onClose();
  };

  const handleAiHelp = async () => {
    if (!title.trim()) {
      alert("Input Required: Define the task title before AI analysis.");
      return;
    }
    setIsAiLoading(true);
    const suggestions = await getGeminiSuggestions(title, description);
    setIsAiLoading(false);
    if (suggestions) {
      setAiResponse(suggestions);
      setDescription(suggestions.refinedDescription);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-xl z-50 flex items-center justify-center p-6">
      <div className="glass-panel w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/10 animate-in fade-in zoom-in duration-300">
        <div className="px-10 pt-10 pb-6 flex justify-between items-center border-b border-white/5">
          <div>
            <h3 className="text-2xl font-black text-white">Initiate Project</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">New Pipeline Entry</p>
          </div>
          <button onClick={onClose} className="bg-white/5 p-3 rounded-2xl text-slate-400 hover:text-white transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Assign Client</label>
              <button 
                type="button" 
                onClick={onOpenClientManager}
                className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest hover:brightness-125"
              >
                + Register Client
              </button>
            </div>
            <select
              required
              className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-white outline-none focus:border-blue-500 transition-all font-bold appearance-none cursor-pointer"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="" disabled className="bg-slate-900">Select Project Client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Project Title</label>
            <input
              autoFocus
              required
              className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-white focus:border-blue-500 transition-all outline-none font-bold"
              placeholder="e.g. Cinematic Commercial Edit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Project Specs</label>
              <button type="button" onClick={handleAiHelp} disabled={isAiLoading} className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition-all flex items-center gap-2">
                {isAiLoading ? 'ANALYZING...' : '✨ AI SPEC ASSISTANT'}
              </button>
            </div>
            <textarea
              rows={3}
              className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-white focus:border-blue-500 transition-all outline-none resize-none font-medium leading-relaxed"
              placeholder="Technical details and requirements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {aiResponse && (
            <div className="bg-blue-500/5 p-5 rounded-2xl border border-blue-500/10 animate-in slide-in-from-top-2">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-blue-400"></span>
                AI Workflow Recommendations:
              </p>
              <ul className="text-[11px] text-slate-300 space-y-2 font-medium">
                {aiResponse.subTasks.slice(0, 3).map((st: string, idx: number) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-blue-500">•</span> {st}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Target Deadline</label>
              <input
                type="date"
                className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-white outline-none focus:border-blue-500 transition-all font-bold"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
               <div className="w-full bg-slate-800/30 p-4 rounded-2xl border border-white/5 text-[9px] text-slate-600 font-black tracking-widest uppercase italic">
                 AUTO-INITIALIZED: PENDING
               </div>
            </div>
          </div>

          <button type="submit" className="w-full py-5 rounded-[1.5rem] bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black uppercase tracking-[0.3em] hover:brightness-110 transition-all shadow-2xl shadow-blue-500/20 active:scale-95">
            LAUNCH PROJECT RECORD
          </button>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;
