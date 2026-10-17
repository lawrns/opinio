/**
 * The TypeScript authority lists and the SQL CHECK constraints must name the
 * same values, or a value one side accepts fails (or passes) on the other.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ACTOR_TYPES, BUSINESS_ROLES, MACHINE_SCOPES } from './policy';

const sql = readFileSync(path.resolve(__dirname, '../../../db/migrations/0002_business_case_machine_authority.sql'), 'utf8');

/** The quoted values of the first list after `anchor` in the migration. */
function sqlList(anchor: RegExp): string[] {
  const match = sql.match(anchor);
  if (!match) throw new Error(`no SQL list for ${anchor}`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
}

describe('authority lists match the schema', () => {
  it('business membership roles', () => {
    expect(sqlList(/role VARCHAR\(10\) NOT NULL CHECK \(role IN \(([^)]*)\)\)/)).toEqual([...BUSINESS_ROLES].sort());
  });

  it('machine key scopes', () => {
    expect(sqlList(/scopes <@ ARRAY\[([^\]]*)\]/)).toEqual([...MACHINE_SCOPES].sort());
  });

  it('audit actor types', () => {
    expect(sqlList(/CHECK \(actor_type IN \(([^)]*)\)\)/)).toEqual([...ACTOR_TYPES].sort());
  });
});
