import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmergencyAvailabilityCard from '@/components/dashboard/EmergencyAvailabilityCard';
import type { StaffProfileItem } from '@/lib/types';

const mkStaff = (id: string, first: string, last: string, phone?: string): StaffProfileItem => ({
  id,
  user_details: {
    id,
    email: `${first}.${last}@ex.com`,
    first_name: first,
    last_name: last,
    role: 'STAFF',
    phone,
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

describe('EmergencyAvailabilityCard', () => {
  it('shows loading state', () => {
    render(
      <EmergencyAvailabilityCard
        searchTerm=""
        onSearchTerm={() => {}}
        hoursWindow={2}
        onHoursWindow={() => {}}
        filteredStaff={[]}
        loading
        onAssignNow={() => {}}
      />
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Loading staff/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(
      <EmergencyAvailabilityCard
        searchTerm=""
        onSearchTerm={() => {}}
        hoursWindow={2}
        onHoursWindow={() => {}}
        filteredStaff={[]}
        error
        onAssignNow={() => {}}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/Failed to load staff profiles/i);
  });

  it('shows empty state', () => {
    render(
      <EmergencyAvailabilityCard
        searchTerm=""
        onSearchTerm={() => {}}
        hoursWindow={2}
        onHoursWindow={() => {}}
        filteredStaff={[]}
        onAssignNow={() => {}}
      />
    );
    expect(screen.getByText(/No matching staff found/i)).toBeInTheDocument();
  });

  it('renders staff and assigns now', async () => {
    const onAssignNow = vi.fn();
    const staff = [mkStaff('42', 'Jane', 'Doe', '555-111'), mkStaff('43', 'John', 'Smith')];
    render(
      <EmergencyAvailabilityCard
        searchTerm=""
        onSearchTerm={() => {}}
        hoursWindow={4}
        onHoursWindow={() => {}}
        filteredStaff={staff}
        onAssignNow={onAssignNow}
      />
    );
    const assignBtn = screen.getAllByRole('button', { name: /Assign Now/i })[0];
    await userEvent.click(assignBtn);
    expect(onAssignNow).toHaveBeenCalled();
    const [staffIdArg, reasonArg] = onAssignNow.mock.calls[0];
    expect(staffIdArg).toBe('42');
    expect(String(reasonArg)).toMatch(/next 4h/i);
  });

  it('updates search and hours window', async () => {
    const onSearchTerm = vi.fn();
    const onHoursWindow = vi.fn();
    render(
      <EmergencyAvailabilityCard
        searchTerm=""
        onSearchTerm={onSearchTerm}
        hoursWindow={2}
        onHoursWindow={onHoursWindow}
        filteredStaff={[]}
        onAssignNow={() => {}}
      />
    );
    const inputs = screen.getAllByLabelText('Search staff');
    inputs.forEach((el) => fireEvent.change(el, { target: { value: 'Jane' } }));
    expect(onSearchTerm).toHaveBeenCalledWith('Jane');
    const selects = screen.getAllByLabelText('Urgency window');
    expect(selects.length).toBeGreaterThan(0);
  });
});