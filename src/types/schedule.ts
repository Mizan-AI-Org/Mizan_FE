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
  id?: string;
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
  staff_members?: string[];
  staff_members_details?: { id: string; first_name: string; last_name: string; }[];
  isRecurring?: boolean;
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  recurringEndDate?: string; // ISO date string (YYYY-MM-DD) for when recurrence ends
  color?: string;
  // Optional local-only status; keep flexible for UI labeling
  type?: 'confirmed' | 'pending' | 'tentative';
  tasks?: Task[];
}

export interface StaffMember {
  id: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
}

export interface BackendShift {
  id: string;
  staff: string;
  staff_members: string[];
  staff_members_details?: { id: string; first_name: string; last_name: string; }[];
  shift_date: string;
  start_time: string;
  end_time: string;
  notes: string;
  color?: string;
  staff_name?: string;
  staff_email?: string;
}

export interface WeeklyScheduleData {
  id: string;
  week_start: string;
  week_end: string;
  is_published: boolean;
  assigned_shifts: BackendShift[];
}