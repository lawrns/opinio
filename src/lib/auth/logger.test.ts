import { afterEach, describe, expect, it, vi } from 'vitest';
import { sanitizedAuthLogger } from './logger';

afterEach(() => vi.restoreAllMocks());

/** Shaped like @auth/core's AdapterError wrapping a pg connection error. */
function adapterError() {
  const pgError = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:9 token=SENTINEL_HASH'), { code: 'ECONNREFUSED' });
  return Object.assign(new Error('Read more at https://errors.authjs.dev#adaptererror SENTINEL_MESSAGE'), {
    type: 'AdapterError',
    cause: { err: pgError, sessionToken: 'SENTINEL_DETAIL' },
  });
}

describe('sanitizedAuthLogger', () => {
  it('logs only the error type and the database error code', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    sanitizedAuthLogger.error(adapterError());
    expect(spy.mock.calls).toEqual([['[auth][error] AdapterError (code ECONNREFUSED)']]);
  });

  it('drops a code or type that is not a plain identifier', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = Object.assign(new Error('x'), { type: 'Bad type: SENTINEL', cause: { err: { code: 'a b SENTINEL' } } });
    sanitizedAuthLogger.error(error);
    expect(spy.mock.calls).toEqual([['[auth][error] AuthError']]);
  });
});
