import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock api module before importing the component to ensure it uses mocked methods
vi.mock('@/lib/api', () => {
  const api = {
    getMyChecklists: vi.fn(),
    getChecklistExecution: vi.fn(),
  };
  return { api };
});

import StaffChecklistBoard from '../StaffChecklistBoard';
import { api } from '@/lib/api';

const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  vi.spyOn(window, 'localStorage', 'get').mockReturnValue({
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: (i: number) => Object.keys(store)[i] ?? null,
    length: 0,
  } as unknown as Storage);
  store['user'] = JSON.stringify({ id: 'u1', first_name: 'Alex', last_name: 'M', email: 'alex@example.com' });
};

describe('StaffChecklistBoard', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('renders assigned templates list and opens ChecklistTree on selection', async () => {
    vi.spyOn(api, 'getMyChecklists').mockResolvedValue({ results: [
      { id: 'exe1', status: 'PENDING', template: { id: 't1', name: 'General Inspection', description: 'Daily check' } },
    ]} as unknown as { results: Array<{ id: string; status?: string; template?: { id: string; name: string; description?: string } }> });
    vi.spyOn(api, 'getChecklistExecution').mockResolvedValue({ template: { id: 't1', name: 'General Inspection', description: 'Daily check', template_type: 'Process', steps: [
      { id: 's1', title: 'Check lights', order: 1 },
    ] } } as unknown as { template: { id: string; name: string; description?: string; template_type?: string; steps: Array<{ id: string; title: string; order?: number }> } });

    render(<StaffChecklistBoard />);

    // List item appears
    expect(await screen.findByText('General Inspection')).toBeInTheDocument();

    // Select the item
    fireEvent.click(screen.getByRole('button', { name: /open general inspection/i }));

    // ChecklistTree renders with template title
    await waitFor(() => {
      expect(screen.getByText('General Inspection')).toBeInTheDocument();
    });
  });
});