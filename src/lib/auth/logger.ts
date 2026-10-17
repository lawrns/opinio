import type { NextAuthConfig } from 'next-auth';

const SAFE_CODE = /^[A-Z0-9_]{1,24}$/;
const SAFE_TYPE = /^[A-Za-z]{1,40}$/;

/**
 * Auth.js logger that keeps only the error type and a database error code.
 * The default logger prints the cause's message, stack and details, which can
 * carry connection addresses, SQL and parameter values.
 */
export const sanitizedAuthLogger = {
  error(error: Error) {
    const type = (error as { type?: unknown }).type;
    const cause = (error as { cause?: unknown }).cause;
    const err = cause && typeof cause === 'object' && 'err' in cause ? cause.err : undefined;
    const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
    const name = typeof type === 'string' && SAFE_TYPE.test(type) ? type : 'AuthError';
    console.error(`[auth][error] ${name}${SAFE_CODE.test(code) ? ` (code ${code})` : ''}`);
  },
  warn(code: string) {
    console.warn(`[auth][warn] ${code}`);
  },
  debug() {},
} satisfies NonNullable<NextAuthConfig['logger']>;
