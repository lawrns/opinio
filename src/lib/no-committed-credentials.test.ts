import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Guards against committing credential-bearing defaults (connection strings
// with a password, keys) in build, deploy and script files. Placeholder
// hosts on reserved test domains (*.invalid, example.*) are allowed.
const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && !f.endsWith('pnpm-lock.yaml') && !/\.(png|jpe?g|webp|ico|svg|pdf|woff2?)$/i.test(f));

const CREDENTIAL_URL = /[a-z][a-z0-9+.-]*:\/\/[^/\s:@'"]+:[^@\s'"]+@([^/\s:'"]+)/gi;
const KEY_PATTERNS = [/sk_live_[0-9A-Za-z]{8,}/, /AKIA[0-9A-Z]{16}/, /ghp_[A-Za-z0-9]{20,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/];
const placeholderHost = (host: string) => /\.invalid$|(^|\.)example\.(com|org|net)$|^localhost$|^127\.0\.0\.1$/i.test(host);

describe('no committed credentials', () => {
  it('no tracked file contains a connection string with a real password or a live key', () => {
    const offenders: string[] = [];
    for (const file of files) {
      let text: string;
      try {
        text = readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      for (const match of text.matchAll(CREDENTIAL_URL)) {
        if (!placeholderHost(match[1])) offenders.push(file);
      }
      if (KEY_PATTERNS.some((p) => p.test(text))) offenders.push(file);
    }
    // File names only: never print the matched value.
    expect([...new Set(offenders)]).toEqual([]);
  });

  it('the Docker build has no DATABASE_URL default and fails clearly without one', () => {
    const dockerfile = readFileSync('Dockerfile', 'utf8');
    expect(dockerfile).toMatch(/^ARG DATABASE_URL$/m);
    expect(dockerfile).not.toMatch(/ARG DATABASE_URL=/);
    expect(dockerfile).not.toMatch(/^ENV DATABASE_URL/m);
    expect(dockerfile).toMatch(/DATABASE_URL build arg is required/);
  });
});
