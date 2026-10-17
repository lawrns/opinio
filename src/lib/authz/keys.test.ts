import { describe, expect, it } from 'vitest';
import { KeyRejected, parseKeyRequest } from './keys';

describe('machine key requests', () => {
  it('accepts a short label and known scopes, deduplicated', () => {
    expect(parseKeyRequest({ label: '  Tienda en línea ', scopes: ['order_events', 'order_events'] })).toEqual({
      label: 'Tienda en línea',
      scopes: ['order_events'],
    });
    expect(parseKeyRequest({ label: 'pos-1', scopes: 'invitations' }).scopes).toEqual(['invitations']);
  });

  it.each([
    [{ label: '', scopes: ['order_events'] }, 'invalid_label'],
    [{ label: 'a'.repeat(81), scopes: ['order_events'] }, 'invalid_label'],
    [{ label: 'línea\nnueva', scopes: ['order_events'] }, 'invalid_label'],
    [{ label: 'x@y.mx', scopes: ['order_events'] }, 'invalid_label'],
    [{ label: 'ok', scopes: [] }, 'invalid_scopes'],
    [{ label: 'ok', scopes: ['dashboard'] }, 'invalid_scopes'],
    [{ label: 'ok', scopes: ['order_events', 'admin'] }, 'invalid_scopes'],
    [{ label: 'ok', scopes: undefined }, 'invalid_scopes'],
  ])('rejects %j', (input, reason) => {
    expect(() => parseKeyRequest(input)).toThrow(KeyRejected);
    try {
      parseKeyRequest(input);
    } catch (error) {
      expect((error as KeyRejected).reason).toBe(reason);
    }
  });
});
