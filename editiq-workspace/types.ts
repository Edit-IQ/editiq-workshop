
export type TaskStatus = 'PENDING' | 'WORKING' | 'COMPLETED';

export interface Client {
  id: string;
  name: string;
}

export interface Task {
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

export interface TaskStats {
  total: number;
  completed: number;
  working: number;
  pending: number;
  statusDistribution: { name: string; value: number }[];
}

export interface DailyProgress {
  date: string;
  pending: number;
  working: number;
  completed: number;
}
