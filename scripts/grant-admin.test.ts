import { describe, expect, it } from 'vitest';
import { parseArgs } from './grant-admin.mjs';

describe('grant-admin arguments', () => {
  it('reads --email, --granted-by and --apply', () => {
    expect(parseArgs(['--email', 'a@b.mx', '--granted-by', 'c@d.mx', '--apply'])).toEqual({
      email: 'a@b.mx',
      grantedBy: 'c@d.mx',
      apply: true,
    });
    expect(parseArgs(['--email', 'a@b.mx'])).toEqual({ email: 'a@b.mx', grantedBy: undefined, apply: false });
  });

  it('never takes a flag as the email', () => {
    expect(parseArgs(['--email', '--apply']).error).toBeDefined();
    expect(parseArgs(['--apply', '--email']).error).toBeDefined();
    expect(parseArgs(['--email', 'not-an-email', '--apply']).error).toBeDefined();
    expect(parseArgs(['--email', 'a@b.mx', '--granted-by', '--apply']).error).toBeDefined();
  });
});
