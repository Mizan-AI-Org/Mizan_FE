import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ShiftModal from '../ShiftModal';
import '@testing-library/jest-dom/vitest';

const staffMembers = [
  { id: 's1', first_name: 'Jane', last_name: 'Doe', role: 'staff' },
];

describe('ShiftModal template dropdown and buttons', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    mockFetch.mockClear();
    vi.unstubAllGlobals();
  });

  it.skip('disables Add from Template while templates are loading', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves

    render(
      <ShiftModal
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        staffMembers={staffMembers}
      />
    );

    // Button shows loading state and is disabled
    const addButton = await screen.findByRole('button', { name: /add from template/i });
    expect(addButton).toBeDisabled();
    expect(addButton).toHaveTextContent('Loading…');
  });

  it.skip('shows error alert when template fetch fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('Server error') } as Response);

    render(
      <ShiftModal
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        staffMembers={staffMembers}
      />
    );

    const alertTitle = await screen.findByText(/failed to load templates/i);
    expect(alertTitle).toBeInTheDocument();

    const addButton = await screen.findByRole('button', { name: /add from template/i });
    expect(addButton).toBeDisabled();
  });

  it.skip('populates templates and adds tasks from a selected template', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        results: [
          { id: 't1', name: 'Cleaning', tasks: [{ title: 'Sweep', priority: 'LOW' }] },
        ],
      }),
    } as Response);

    render(
      <ShiftModal
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        staffMembers={staffMembers}
        testDefaultTemplateId="t1"
      />
    );

    const addButton = await screen.findByText(/add from template/i);
    await waitFor(() => expect(addButton).toBeEnabled());
    await userEvent.click(addButton);

    // Task from template should render
    await waitFor(() => expect(screen.getByText(/sweep/i)).toBeInTheDocument());
  });

  it('shows loading indicator during save when onSave is async', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [] }) } as Response);

    const onSave = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 50)));
    const onClose = vi.fn();

    render(
      <ShiftModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        staffMembers={staffMembers}
      />
    );

    const saveBtn = await screen.findByRole('button', { name: /save shift changes/i });
    await userEvent.click(saveBtn);

    expect(saveBtn).toBeDisabled();
    expect(saveBtn).toHaveTextContent('Saving…');

    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 1000 });
  });
});