import { describe, expect, it } from 'vitest';
import { classifyLegacyContact } from './case-recovery';

describe('legacy contact classification', () => {
  it.each([
    ['Buyer@Example.test', 'email', 'buyer@example.test'],
    ['  55 1234 5678 ', 'phone', null],
    ['+52 (55) 1234-5678', 'phone', null],
    ['whatsapp 5512345678', 'ambiguous', null],
    ['correo@ y 5512345678', 'ambiguous', null],
    ['', 'ambiguous', null],
    [null, 'ambiguous', null],
  ])('%j → %s', (contact, kind, email) => {
    expect(classifyLegacyContact(contact)).toEqual({ kind, email });
  });
});
