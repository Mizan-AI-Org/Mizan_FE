import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PriorityTasksCard from '@/components/dashboard/PriorityTasksCard';
import type { Task, StaffProfileItem } from '@/lib/types';

const mkTask = (overrides: Partial<Task> = {}): Task => ({
  id: overrides.id as string || '1',
  restaurant: 'r1',
  assigned_to: 'u1',
  title: overrides.title || 'Task A',
  description: overrides.description || '',
  priority: overrides.priority || 'MEDIUM',
  status: overrides.status || 'PENDING',
  due_date: overrides.due_date || new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const mkStaff = (id: string, first: string, last: string): StaffProfileItem => ({
  id,
  user_details: {
    id,
    email: `${first}.${last}@ex.com`,
    first_name: first,
    last_name: last,
    role: 'STAFF',
    restaurant: 'r1',
    is_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  hire_date: new Date().toISOString(),
  hourly_rate: 10,
  skills: [],
  certifications: [],
});

describe('PriorityTasksCard', () => {
  it('shows loading state', () => {
    render(
      <PriorityTasksCard
        loading
        onComplete={() => {}}
        onDefer={() => {}}
        onReassignOpen={() => {}}
        onConfirmReassign={() => {}}
        onCancelReassign={() => {}}
        priorityColor={() => 'default'}
      />
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Loading tasks/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(
      <PriorityTasksCard
        error
        onComplete={() => {}}
        onDefer={() => {}}
        onReassignOpen={() => {}}
        onConfirmReassign={() => {}}
        onCancelReassign={() => {}}
        priorityColor={() => 'default'}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/Failed to load tasks/i);
  });

  it('shows empty state', () => {
    render(
      <PriorityTasksCard
        tasks={[]}
        onComplete={() => {}}
        onDefer={() => {}}
        onReassignOpen={() => {}}
        onConfirmReassign={() => {}}
        onCancelReassign={() => {}}
        priorityColor={() => 'default'}
      />
    );
    expect(screen.getByText(/No priority tasks for today/i)).toBeInTheDocument();
  });

  it('renders tasks and triggers actions', async () => {
    const onComplete = vi.fn();
    const onDefer = vi.fn();
    const onReassignOpen = vi.fn();
    const tasks = [mkTask({ id: '1', title: 'Task A', priority: 'HIGH' }), mkTask({ id: '2', title: 'Task B' })];
    render(
      <PriorityTasksCard
        tasks={tasks}
        onComplete={onComplete}
        onDefer={onDefer}
        onReassignOpen={onReassignOpen}
        onConfirmReassign={() => {}}
        onCancelReassign={() => {}}
        priorityColor={(p) => (p === 'HIGH' ? 'destructive' : 'default')}
      />
    );
    expect(screen.getByText('Task A')).toBeInTheDocument();
    expect(screen.getByLabelText(/Priority HIGH/i)).toBeInTheDocument();
    const completeBtn = screen.getAllByRole('button', { name: /Complete/i })[0];
    const deferBtn = screen.getAllByRole('button', { name: /Defer/i })[0];
    await userEvent.click(completeBtn);
    await userEvent.click(deferBtn);
    expect(onComplete).toHaveBeenCalledWith('1');
    expect(onDefer).toHaveBeenCalledWith('1');
    const reassignBtn = screen.getAllByRole('button', { name: /Reassign/i })[0];
    await userEvent.click(reassignBtn);
    expect(onReassignOpen).toHaveBeenCalledWith(1);
  });

  it('shows reassign selector and confirms selection', async () => {
    const onConfirmReassign = vi.fn();
    const onCancelReassign = vi.fn();
    const staff = [mkStaff('10', 'Ada', 'Lovelace')];
    render(
      <PriorityTasksCard
        tasks={[mkTask({ id: '1', title: 'Task A' })]}
        reassignTargetId={1}
        staffProfiles={staff}
        onComplete={() => {}}
        onDefer={() => {}}
        onReassignOpen={() => {}}
        onConfirmReassign={onConfirmReassign}
        onCancelReassign={onCancelReassign}
        priorityColor={() => 'default'}
      />
    );
    const select = screen.getByLabelText('Choose staff') as HTMLSelectElement;
    await userEvent.selectOptions(select, '10');
    expect(onConfirmReassign).toHaveBeenCalledWith(10);
    const cancel = screen.getByRole('button', { name: /Cancel/i });
    await userEvent.click(cancel);
    expect(onCancelReassign).toHaveBeenCalled();
  });
});