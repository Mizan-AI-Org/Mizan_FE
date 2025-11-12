import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccessibleDropdown, { DropdownOption } from '../../common/AccessibleDropdown';

function setup(options: DropdownOption[], value?: string) {
  const onChange = vi.fn();
  render(
    <AccessibleDropdown
      id="test-dd"
      ariaLabel="Test Dropdown"
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Choose one"
    />
  );
  return { onChange };
}

describe('AccessibleDropdown', () => {
  it('shows options on click and selects item', async () => {
    const user = userEvent.setup();
    const { onChange } = setup([
      { value: 'A', label: 'Alpha' },
      { value: 'B', label: 'Beta' },
    ]);

    const trigger = screen.getByLabelText('Test Dropdown');
    await user.click(trigger);
    expect(await screen.findByText('Alpha')).toBeInTheDocument();

    await user.click(screen.getByText('Beta'));
    expect(onChange).toHaveBeenCalledWith('B');
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    const { onChange } = setup([
      { value: 'A', label: 'Alpha' },
      { value: 'B', label: 'Beta' },
    ]);

    const trigger = screen.getByLabelText('Test Dropdown');
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('B');
  });

  it('renders empty state', async () => {
    const user = userEvent.setup();
    setup([]);
    const trigger = screen.getByLabelText('Test Dropdown');
    await user.click(trigger);
    expect(await screen.findByText('No options available')).toBeInTheDocument();
  });

  it('shows loading state and aria-busy', async () => {
    render(
      <AccessibleDropdown
        id="loading-dd"
        ariaLabel="Loading Dropdown"
        value={undefined}
        onChange={() => {}}
        options={[]}
        placeholder="Choose"
        loading
      />
    );
    const trigger = screen.getByLabelText('Loading Dropdown');
    expect(trigger).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows error message and aria-invalid', () => {
    render(
      <AccessibleDropdown
        id="error-dd"
        ariaLabel="Error Dropdown"
        value={undefined}
        onChange={() => {}}
        options={[]}
        error="Something went wrong"
      />
    );
    const trigger = screen.getByLabelText('Error Dropdown');
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});