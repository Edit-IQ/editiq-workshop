
import { TaskStatus } from './types';

export const STATUS_COLORS = {
  PENDING: 'bg-slate-800/50 text-slate-400 border-slate-700/50',
  WORKING: 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]',
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
};

export const STATUS_LABELS = {
  PENDING: 'Pending',
  WORKING: 'Working',
  COMPLETED: 'Completed',
};

export const STORAGE_KEY_TASKS = 'zentask_ai_tasks_v3';
export const STORAGE_KEY_CLIENTS = 'zentask_ai_clients_v3';

export const formatFullDate = (timestamp?: number) => {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};
