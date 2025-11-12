import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ChecklistTree from '../ChecklistTree';
import type { TemplateDefinition } from '@/types/checklist';

vi.mock('@/lib/api', () => {
  const api = {
    startChecklistExecution: vi.fn(),
    completeChecklistExecution: vi.fn(),
  };
  return { api };
});

describe('ChecklistTree', () => {
  beforeEach(() => {
    // mock sync endpoint
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) }));
  });

  it('shows progress and completes execution', async () => {
    const tpl: TemplateDefinition = {
      id: 't1',
      name: 'General Inspection',
      description: 'Daily',
      steps: [
        { id: 's1', title: 'Check lights', estimatedSeconds: undefined },
        { id: 's2', title: 'Check doors', estimatedSeconds: undefined },
      ],
    };

    render(<ChecklistTree executionId="exe1" template={tpl} assigneeName="Alex" />);

    // Progress starts at 0%
    expect(screen.getByText(/0% complete/i)).toBeInTheDocument();

    // Mark first step as done
    const firstToggle = screen.getByRole('checkbox', { name: /complete check lights/i });
    fireEvent.click(firstToggle);

    // Progress updates
    await waitFor(() => {
      expect(screen.getByText(/50% complete/i)).toBeInTheDocument();
    });

    // Mark second as done
    const secondToggle = screen.getByRole('checkbox', { name: /complete check doors/i });
    fireEvent.click(secondToggle);

    // Complete inspection
    fireEvent.click(screen.getByRole('button', { name: /complete inspection/i }));

    const { api } = await import('@/lib/api');
    await waitFor(() => {
      expect(api.startChecklistExecution).toHaveBeenCalledWith('exe1');
      expect(api.completeChecklistExecution).toHaveBeenCalledWith('exe1', undefined);
    });
  });
});