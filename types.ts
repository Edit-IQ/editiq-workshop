
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum Platform {
  YOUTUBE = 'YouTube',
  INSTAGRAM = 'Instagram',
  FREELANCE = 'Freelance',
  OTHER = 'Other'
}

export enum ProjectType {
  THUMBNAIL = 'Thumbnail',
  VIDEO_EDITING = 'Video Editing',
  GRAPHIC_DESIGN = 'Graphic Design',
  CONSULTATION = 'Consultation'
  
}

export interface Client {
  id: string;
  userId: string;
  name: string;
  platform: Platform;
  projectType: ProjectType;
  notes: string;
  budget?: number; // Optional budget in INR
  createdAt: number;
}

export interface WorkspaceTask {
  id: string;
  clientId: string;
  title: string;
  description: string;
  status: 'PENDING' | 'WORKING' | 'COMPLETED';
  dueDate: string;
  budget?: number; // Optional project budget/amount
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  note: string;
  clientId?: string;
}

export interface Credential {
  id: string;
  userId: string;
  platformName: string;
  loginName: string;
  password: string;
  notes: string;
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

export interface FinancialStats {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
}
