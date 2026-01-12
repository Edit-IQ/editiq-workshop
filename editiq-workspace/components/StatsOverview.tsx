
import React from 'react';
import { TaskStats } from '../types';

interface StatsOverviewProps {
  stats: TaskStats;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
      <div className="glass-card p-6 rounded-3xl flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Total Projects</p>
          <h3 className="text-3xl font-extrabold text-white mt-1">{stats.total}</h3>
        </div>
        <div className="bg-slate-800/50 p-3 rounded-2xl border border-white/5">
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        </div>
      </div>

      <div className="glass-card p-6 rounded-3xl flex items-center justify-between border-l-4 border-l-amber-500/50">
        <div>
          <p className="text-amber-500/70 text-[10px] font-bold uppercase tracking-widest">In Queue</p>
          <h3 className="text-3xl font-extrabold text-white mt-1">{stats.pending}</h3>
        </div>
        <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/10">
          <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
      </div>

      <div className="glass-card p-6 rounded-3xl flex items-center justify-between border-l-4 border-l-blue-500/50">
        <div>
          <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">Currently Editing</p>
          <h3 className="text-3xl font-extrabold text-white mt-1">{stats.working}</h3>
        </div>
        <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/10">
          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
      </div>
      
      <div className="glass-card p-6 rounded-3xl flex items-center justify-between border-l-4 border-l-emerald-500/50">
        <div>
          <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Delivered</p>
          <h3 className="text-3xl font-extrabold text-white mt-1">{stats.completed}</h3>
        </div>
        <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/10">
          <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
        </div>
      </div>
    </div>
  );
};

export default StatsOverview;
