import { describe, it, expect } from 'vitest';
import { deriveSignatureMeta } from '../signature';

describe('deriveSignatureMeta', () => {
  it('detects signature via top-level fields', () => {
    const exec = { signed_by_name: 'Manager', signed_at: '2024-01-01T00:00:00Z' };
    const meta = deriveSignatureMeta(exec);
    expect(meta.isSigned).toBe(true);
    expect(meta.signedBy).toBe('Manager');
  });

  it('detects signature via evidence attachments', () => {
    const exec = { step_responses: [{ evidence: [{ type: 'signature', url: 'data:' }] }] };
    const meta = deriveSignatureMeta(exec);
    expect(meta.isSigned).toBe(true);
  });

  it('detects requiresSignature via template steps', () => {
    const exec = { template: { steps: [{ requires_signature: true }] } };
    const meta = deriveSignatureMeta(exec);
    expect(meta.requiresSignature).toBe(true);
  });

  it('is resilient to malformed payloads', () => {
    const meta = deriveSignatureMeta(null);
    expect(meta.isSigned).toBe(false);
    expect(meta.requiresSignature).toBe(false);
  });
});