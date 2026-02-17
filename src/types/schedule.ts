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
  /** Optional list of staff IDs (e.g. from ShiftModal when assigning multiple); used alongside staff_members. */
  staffIds?: string[];
  staff_members?: string[];
  staff_members_details?: { id: string; first_name: string; last_name: string; }[];
  isRecurring?: boolean;
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  /** When frequency is CUSTOM, 0=Mon, 1=Tue, ... 6=Sun */
  days_of_week?: number[];
  recurringEndDate?: string; // ISO date string (YYYY-MM-DD) for when recurrence ends
  recurrence_group_id?: string | null;
  color?: string;
  type?: 'confirmed' | 'pending' | 'tentative';
  tasks?: Task[];
  task_templates?: string[];
  task_templates_details?: { id: string; name?: string; title?: string; }[];
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
  title?: string; // same as notes, for viewing saved details
  color?: string;
  staff_name?: string;
  staff_email?: string;
  task_templates?: string[];
  task_templates_details?: { id: string; name?: string; title?: string; }[];
  tasks?: { id?: string; title: string; priority?: TaskPriority; description?: string; }[];
  is_recurring?: boolean;
  recurrence_group_id?: string | null;
  recurrence_end_date?: string | null;
}

export interface WeeklyScheduleData {
  id: string;
  week_start: string;
  week_end: string;
  is_published: boolean;
  assigned_shifts: BackendShift[];
}