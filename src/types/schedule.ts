// Unified schedule types for shifts and tasks used across the app

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// Superset of all frequency enums appearing in the codebase
export type TaskFrequency =
  | 'ONE_TIME'
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'ANNUALLY'
  | 'CUSTOM';

export interface Task {
  id: string;
  title: string;
  priority: TaskPriority;
  frequency?: TaskFrequency;
}

export interface Shift {
  id: string;
  title: string;
  start: string;
  end: string;
  // ISO date string (YYYY-MM-DD)
  date: string;
  day: number;
  staffId: string;
  color?: string;
  // Optional local-only status; keep flexible for UI labeling
  type?: 'confirmed' | 'pending' | 'tentative';
  tasks?: Task[];
}