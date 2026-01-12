
import React, { useState } from 'react';
import { Client } from '../types';

interface ClientModalProps {
  clients: Client[];
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const ClientModal: React.FC<ClientModalProps> = ({ clients, onAdd, onDelete, onClose }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name);
    setName('');
  };

  return (
    <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-xl z-[60] flex items-center justify-center p-6">
      <div className="glass-panel w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="px-8 py-6 flex justify-between items-center border-b border-white/5">
          <div>
            <h3 className="text-xl font-black text-white">Studio Roster</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Client Database</p>
          </div>
          <button onClick={onClose} className="bg-white/5 p-2.5 rounded-xl text-slate-400 hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
            <input
              autoFocus
              className="flex-1 px-5 py-3.5 rounded-2xl bg-white/5 border border-white/5 text-white outline-none focus:border-blue-500 font-bold text-sm"
              placeholder="Enter studio client..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20">
              REGISTER
            </button>
          </form>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
            {clients.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 text-xs italic font-medium tracking-wide">Client roster currently empty.</p>
              </div>
            ) : (
              clients.map(client => (
                <div key={client.id} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl group border border-white/[0.02] hover:border-white/10 transition-all">
                  <span className="font-bold text-slate-300 text-sm tracking-wide">{client.name}</span>
                  <button 
                    onClick={() => onDelete(client.id)}
                    className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-2 rounded-lg hover:bg-rose-500/10"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientModal;
