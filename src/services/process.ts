// Frontend API service for Processes and ProcessTasks

const API_BASE =
  import.meta.env.VITE_REACT_APP_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000/api';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

export type ProcessStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface ProcessTask {
  id?: string;
  process: string;
  title: string;
  description?: string;
  priority?: Priority;
  status?: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assigned_to?: string;
  due_date?: string;
  due_time?: string;
  estimated_duration?: number;
}

export interface Process {
  id?: string;
  restaurant: string;
  name: string;
  description?: string;
  status?: ProcessStatus;
  priority?: Priority;
  is_active?: boolean;
  tasks?: ProcessTask[];
}

export async function listProcesses(params?: Record<string, string>) {
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${API_BASE}/scheduling/processes/${query}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to list processes (${res.status})`);
  return res.json();
}

export async function createProcess(data: Process) {
  const res = await fetch(`${API_BASE}/scheduling/processes/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create process (${res.status})`);
  return res.json();
}

export async function updateProcess(id: string, data: Partial<Process>) {
  const res = await fetch(`${API_BASE}/scheduling/processes/${id}/`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update process (${res.status})`);
  return res.json();
}

export async function deleteProcess(id: string) {
  const res = await fetch(`${API_BASE}/scheduling/processes/${id}/`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to delete process (${res.status})`);
  return true;
}

export async function listProcessTasks(params?: Record<string, string>) {
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${API_BASE}/scheduling/process-tasks/${query}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to list process tasks (${res.status})`);
  return res.json();
}

export async function createProcessTask(data: ProcessTask) {
  const res = await fetch(`${API_BASE}/scheduling/process-tasks/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create process task (${res.status})`);
  return res.json();
}

export async function updateProcessTask(id: string, data: Partial<ProcessTask>) {
  const res = await fetch(`${API_BASE}/scheduling/process-tasks/${id}/`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update process task (${res.status})`);
  return res.json();
}

export async function deleteProcessTask(id: string) {
  const res = await fetch(`${API_BASE}/scheduling/process-tasks/${id}/`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to delete process task (${res.status})`);
  return true;
}