import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import MyChecklistsPage from '../MyChecklistsPage';
import * as apiMod from '@/lib/api';

describe('MyChecklistsPage', () => {
  it('renders Signed badge when execution has signature', async () => {
    const api = apiMod.api;
    // Mock list endpoints
    vi.spyOn(api, 'getMyChecklists').mockResolvedValue([
      { id: 'exec-1', status: 'COMPLETED', template: { id: 't1', name: 'Checklist A' } },
    ]);
    vi.spyOn(api, 'getAssignedTasksAsChecklists').mockResolvedValue([]);
    // Mock execution details with signature
    vi.spyOn(api, 'getChecklistExecution').mockResolvedValue({ signed_by_name: 'Supervisor' });

    render(<MyChecklistsPage />);

    await waitFor(() => {
      expect(screen.getByText('Checklist A')).toBeInTheDocument();
      expect(screen.getByText('Signed')).toBeInTheDocument();
    });
  });
});