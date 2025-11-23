import { describe, it, expect } from 'vitest';
import { formatAssignees, detectNewAssignments } from '../../tasks/assignees';

describe('formatAssignees', () => {
  it('formats string ids with staff map', () => {
    const assigned = 'u1,u2';
    const map = { u1: 'Alice Doe', u2: 'Bob Roe' };
    expect(formatAssignees(assigned, map)).toEqual(['Alice Doe', 'Bob Roe']);
  });

  it('formats array of objects and deduplicates', () => {
    const assigned = [{ id: 'x', name: 'X' }, { id: 'x', name: 'X' }, { id: 'y', name: 'Y' }];
    expect(formatAssignees(assigned)).toEqual(['X', 'Y']);
  });

  it('handles single object with id mapped to name', () => {
    const assigned = { id: 'a' };
    const map = { a: 'Alpha' };
    expect(formatAssignees(assigned, map)).toEqual(['Alpha']);
  });
});

describe('detectNewAssignments', () => {
  it('returns ids not in seen set', () => {
    const seen = new Set(['e1']);
    const current = ['e1', 'e2', 'e3'];
    expect(detectNewAssignments(seen, current)).toEqual(['e2', 'e3']);
  });
});