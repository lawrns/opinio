import { describe, expect, it } from 'vitest';
import { applyRefusal } from './migrate-auth.mjs';

describe('migrate-auth --apply guard', () => {
  it('allows this machine without confirmation', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      expect(applyRefusal(`postgres://u@${host}:5432/db`, ['--apply'])).toBeNull();
    }
  });

  it('refuses a remote host unless --confirm-host names it', () => {
    // No password in the fixture: the repo's credential scan rejects any.
    const url = 'postgres://SENTINEL_USER@db.example.com:5432/opinio';
    expect(applyRefusal(url, ['--apply'])).toMatch(/--confirm-host=db\.example\.com/);
    expect(applyRefusal(url, ['--apply', '--confirm-host=other.example.com'])).not.toBeNull();
    expect(applyRefusal(url, ['--apply', '--confirm-host=db.example.com'])).toBeNull();
    expect(applyRefusal(url, ['--apply'])).not.toContain('SENTINEL_USER');
  });

  it('refuses an unparseable URL', () => {
    expect(applyRefusal('not a url', ['--apply'])).not.toBeNull();
  });
});
