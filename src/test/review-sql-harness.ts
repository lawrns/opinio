/**
 * In-memory PostgreSQL subset for review publication tests.
 * Kept outside Vitest modules so importing it cannot register duplicate tests.
 * Single-table SELECT/INSERT/UPDATE/DELETE, WHERE/ORDER BY/LIMIT, FOR UPDATE SKIP LOCKED,
 * count/max, advisory locks, and transactions. No joins or window functions.
 */
export interface Row {
  [column: string]: unknown;
}

export interface HarnessClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: Row[]; rowCount: number }>;
  release(): void;
}

export interface PublicationHarness {
  pool: {
    query(sql: string, params?: unknown[]): Promise<{ rows: Row[]; rowCount: number }>;
    connect(): Promise<HarnessClient>;
  };
  sqlLog: string[];
}

interface Tx {
  inserts: Map<string, Row[]>;
  updates: Map<Row, Row>;
  deleted: Set<Row>;
}

interface Memory {
  tables: Record<string, Row[]>;
  sequences: Record<string, number>;
  sqlLog: string[];
  rowLocks: Map<Row, HarnessClient>;
  rowWaiters: Map<Row, Array<() => void>>;
  advisory: Map<string, HarnessClient>;
  advisoryWaiters: Map<string, Array<() => void>>;
}

const TIMESTAMP_COLUMNS: Record<string, true> = {
  created_at: true,
  updated_at: true,
  humanized_at: true,
  publish_after: true,
  claimed_at: true,
  published_at: true,
};
const QUEUE_STATUS: Record<string, true> = { queued: true, claimed: true, published: true, failed: true };
const UNIQUE_COLUMNS: Record<string, string[]> = {
  businesses: ['slug'],
  review_publication_queue: ['dedup_key', 'publication_key'],
  reviews: ['publication_key'],
};

function normalizeSql(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/"/g, '')
    .replace(/::[a-z0-9_[\]]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/;$/, '');
}

function findKeyword(sql: string, keyword: string, from = 0): number {
  const lower = sql.toLowerCase();
  const needle = keyword.toLowerCase();
  let quote = false;
  for (let index = from; index < sql.length; index += 1) {
    const ch = sql[index];
    if (ch === "'") {
      if (quote && sql[index + 1] === "'") {
        index += 1;
        continue;
      }
      quote = !quote;
      continue;
    }
    if (quote) continue;
    const before = index === 0 || !/[a-z0-9_]/i.test(sql[index - 1]);
    const after = !/[a-z0-9_]/i.test(sql[index + needle.length] ?? '');
    if (before && after && lower.startsWith(needle, index)) return index;
  }
  return -1;
}

function splitArgs(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote = false;
  let depth = 0;
  for (let index = 0; index < input.length; index += 1) {
    const ch = input[index];
    if (ch === "'" && quote && input[index + 1] === "'") {
      current += "''";
      index += 1;
      continue;
    }
    if (ch === "'") quote = !quote;
    else if (!quote && ch === '(') depth += 1;
    else if (!quote && ch === ')') depth -= 1;
    else if (!quote && depth === 0 && ch === ',') {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function splitAnd(where: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote = false;
  let depth = 0;
  for (let index = 0; index < where.length; index += 1) {
    const ch = where[index];
    if (ch === "'" && quote && where[index + 1] === "'") {
      current += "''";
      index += 1;
      continue;
    }
    if (ch === "'") {
      quote = !quote;
      current += ch;
      continue;
    }
    if (!quote && ch === '(') depth += 1;
    if (!quote && ch === ')') depth -= 1;
    const atWord = !quote && depth === 0 && (index === 0 || /\s/.test(where[index - 1]));
    if (atWord && where.slice(index, index + 3).toLowerCase() === 'and' && !/[a-z0-9_]/i.test(where[index + 3] ?? '')) {
      parts.push(current.trim());
      current = '';
      index += 2;
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function literal(token: string, params: unknown[]): unknown {
  const value = token.trim();
  if (/^null$/i.test(value)) return null;
  if (/^true$/i.test(value)) return true;
  if (/^false$/i.test(value)) return false;
  if (/^now\(\)$/i.test(value)) return new Date();
  const param = value.match(/^\$(\d+)$/);
  if (param) return params[Number(param[1]) - 1];
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  throw new Error(`Unsupported literal: ${value}`);
}

function asTime(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function compare(left: unknown, right: unknown): number {
  const leftTime = asTime(left);
  const rightTime = asTime(right);
  if (leftTime != null && rightTime != null) return Math.sign(leftTime - rightTime);
  if (typeof left === 'number' || typeof right === 'number') {
    const delta = Number(left) - Number(right);
    return delta === 0 ? 0 : delta < 0 ? -1 : 1;
  }
  const leftText = left == null ? '' : String(left);
  const rightText = right == null ? '' : String(right);
  return leftText === rightText ? 0 : leftText < rightText ? -1 : 1;
}

function same(left: unknown, right: unknown): boolean {
  if (left == null || right == null) return false;
  return compare(left, right) === 0;
}

const JSONB_COLUMNS: Record<string, true> = {
  source_facts: true,
  details: true,
};

function coerce(column: string, value: unknown): unknown {
  if (JSONB_COLUMNS[column] && typeof value === 'string') {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }
  if (!TIMESTAMP_COLUMNS[column] || value == null || value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed;
  }
  return value;
}

function evalExpr(expr: string, row: Row, params: unknown[]): unknown {
  const math = expr.trim().match(/^([a-z0-9_]+)\s*\+\s*(\d+|\$\d+)$/i);
  if (!math) return literal(expr, params);
  const add = math[2].startsWith('$') ? Number(params[Number(math[2].slice(1)) - 1]) : Number(math[2]);
  return Number(row[math[1].toLowerCase()] ?? 0) + add;
}

function matchPredicate(predicate: string, row: Row, params: unknown[]): boolean {
  const expr = predicate.trim().replace(/^[a-z_][a-z0-9_]*\./i, '');
  let match = expr.match(/^([a-z0-9_]+)\s+is\s+not\s+null$/i);
  if (match) return row[match[1].toLowerCase()] != null;
  match = expr.match(/^([a-z0-9_]+)\s+is\s+null$/i);
  if (match) return row[match[1].toLowerCase()] == null;
  match = expr.match(/^([a-z0-9_]+)\s+in\s*\((.+)\)$/i);
  if (match) {
    const column = match[1].toLowerCase();
    return splitArgs(match[2]).some((value) => same(row[column], literal(value, params)));
  }
  match = expr.match(/^([a-z0-9_]+)\s*=\s*any\s*\((.+)\)$/i);
  if (match) {
    const column = match[1].toLowerCase();
    const values = literal(match[2], params);
    return Array.isArray(values) && values.some((value) => same(row[column], value));
  }
  match = expr.match(/^([a-z0-9_]+)\s*(=|<>|!=|<=|>=|<|>)\s*(.+)$/i);
  if (!match) throw new Error(`Unsupported predicate: ${expr}`);
  const left = row[match[1].toLowerCase()];
  const right = literal(match[3], params);
  if ((match[2] === '=' || match[2] === '<>' || match[2] === '!=') && (left == null || right == null)) return false;
  const cmp = compare(left, right);
  if (match[2] === '=') return cmp === 0;
  if (match[2] === '<>' || match[2] === '!=') return cmp !== 0;
  if (match[2] === '<') return cmp < 0;
  if (match[2] === '>') return cmp > 0;
  if (match[2] === '<=') return cmp <= 0;
  return cmp >= 0;
}

function project(row: Row, returning: string): Row {
  if (returning.trim() === '*') return { ...row };
  const projected: Row = {};
  for (const part of splitArgs(returning)) {
    const match = part.match(/^([a-z0-9_]+)(?:\s+as\s+([a-z0-9_]+))?$/i);
    if (!match) throw new Error(`Unsupported returning column: ${part}`);
    const column = match[1].toLowerCase();
    projected[(match[2] ?? column).toLowerCase()] = row[column];
  }
  return projected;
}

function constraintError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

function assertQueueShape(row: Row): void {
  if (row.humanized_at == null) {
    throw constraintError('23502', 'null value in column "humanized_at" of relation "review_publication_queue" violates not-null constraint');
  }
  if (row.publish_after == null) {
    throw constraintError('23502', 'null value in column "publish_after" of relation "review_publication_queue" violates not-null constraint');
  }
  if (row.body == null || String(row.body) === '') {
    throw constraintError('23502', 'null value in column "body" of relation "review_publication_queue" violates not-null constraint');
  }
  if (row.dedup_key == null || row.publication_key == null) {
    throw constraintError('23502', 'null value in column "dedup_key" or "publication_key" of relation "review_publication_queue" violates not-null constraint');
  }
  const rating = Number(row.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw constraintError('23514', 'check constraint review_publication_queue_rating_check');
  }
  if (row.source_facts != null && !Array.isArray(row.source_facts)) {
    throw constraintError('23514', 'check constraint review_publication_queue_source_facts_check');
  }
  if (String(row.status) === 'claimed' && row.claimed_at == null) {
    throw constraintError('23514', 'check constraint review_publication_queue_claimed_at_check');
  }
  if (String(row.status) === 'failed' && (row.last_error == null || String(row.last_error) === '')) {
    throw constraintError('23514', 'check constraint review_publication_queue_last_error_check');
  }
  if (String(row.status) === 'published' && (row.published_at == null || row.published_review_id == null)) {
    throw constraintError('23514', 'check constraint review_publication_queue_published_check');
  }
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
}

class PublicationClient {
  tx: Tx | null = null;
  private heldRows: Row[] = [];
  private heldAdvisory: string[] = [];

  constructor(private readonly db: Memory) {}

  async query(sql: string, params: unknown[] = []): Promise<{ rows: Row[]; rowCount: number }> {
    this.db.sqlLog.push(sql.trim());
    const text = normalizeSql(sql);
    if (/^begin\b/i.test(text)) {
      this.tx ??= { inserts: new Map(), updates: new Map(), deleted: new Set() };
      return { rows: [], rowCount: 0 };
    }
    if (/^commit\b/i.test(text)) {
      this.commit();
      return { rows: [], rowCount: 0 };
    }
    if (/^rollback\b/i.test(text)) {
      this.rollback();
      return { rows: [], rowCount: 0 };
    }
    if (/^select pg_advisory(?:_xact)?_lock\s*\(/i.test(text)) {
      await this.lockAdvisory(params);
      return { rows: [{ pg_advisory_xact_lock: '' }], rowCount: 1 };
    }
    if (/^select 1$/i.test(text)) return { rows: [{ '?column?': 1 }], rowCount: 1 };
    if (/^insert\b/i.test(text)) return this.insert(text, params);
    if (/^update\b/i.test(text)) return this.update(text, params);
    if (/^delete\b/i.test(text)) return this.remove(text, params);
    if (/^select\b/i.test(text)) return this.select(text, params);
    throw new Error(`Unsupported SQL for review publication harness: ${text}`);
  }

  release(): void {
    if (this.tx) this.rollback();
  }

  private originals(table: string): Row[] {
    const committed = (this.db.tables[table] ?? []).filter((row) => !this.tx?.deleted.has(row));
    return [...committed, ...(this.tx?.inserts.get(table) ?? [])];
  }

  private read(row: Row): Row {
    return this.tx?.updates.get(row) ?? row;
  }

  private visible(table: string): Row[] {
    return this.originals(table).map((row) => this.read(row));
  }

  private writable(table: string, source: Row): Row {
    if (!this.tx) return source;
    if (this.tx.inserts.get(table)?.includes(source)) return source;
    const existing = this.tx.updates.get(source);
    if (existing) return existing;
    const copy = { ...source };
    this.tx.updates.set(source, copy);
    return copy;
  }

  private assertUnique(table: string, row: Row, others: Row[]) {
    for (const column of UNIQUE_COLUMNS[table] ?? []) {
      if (row[column] == null) continue;
      if (others.some((other) => other !== row && same(other[column], row[column]))) {
        throw constraintError('23505', `duplicate key value violates unique constraint "${table}_${column}_key"`);
      }
    }
  }

  private assertForeignKeys(table: string, row: Row) {
    if (['review_publication_queue', 'reviews', 'audit_logs'].includes(table)) {
      if (!this.visible('businesses').some((business) => same(business.id, row.business_id))) {
        throw constraintError('23503', `insert or update on table "${table}" violates foreign key constraint`);
      }
    }
    if (table === 'review_publication_queue' && row.published_review_id != null) {
      if (!this.visible('reviews').some((review) => same(review.id, row.published_review_id))) {
        throw constraintError('23503', 'insert or update violates foreign key constraint "published_review_id"');
      }
    }
  }

  private insert(text: string, params: unknown[]): { rows: Row[]; rowCount: number } {
    let head = text;
    let returning: string | null = null;
    const returningAt = findKeyword(head, 'returning');
    if (returningAt >= 0) {
      returning = head.slice(returningAt + 'returning'.length).trim();
      head = head.slice(0, returningAt).trim();
    }
    const conflict = /\bon conflict\b/i.test(head);
    const conflictAt = conflict ? findKeyword(head, 'on') : -1;
    if (conflictAt >= 0) head = head.slice(0, conflictAt).trim();
    const parsed = head.match(/^insert into ([a-z0-9_]+) \((.+)\) values \((.+)\)$/i);
    if (!parsed) throw new Error(`Unsupported SQL for review publication harness: ${text}`);
    const table = parsed[1].toLowerCase();
    const columns = splitArgs(parsed[2]).map((column) => column.toLowerCase());
    const values = splitArgs(parsed[3]);
    const row: Row = {};
    columns.forEach((column, index) => {
      row[column] = coerce(column, literal(values[index], params));
    });
    const now = new Date();
    if (table === 'review_publication_queue') {
      row.status ??= 'queued';
      row.attempt_count ??= 0;
      row.verification_level ??= 'unverified_experience';
      row.content_origin ??= 'automated';
      row.last_error ??= null;
      row.claimed_at ??= null;
      row.published_at ??= null;
      row.published_review_id ??= null;
      row.product_name ??= null;
      if (row.verification_level !== 'unverified_experience') {
        throw constraintError('23514', 'check constraint review_publication_queue_verification_level_check');
      }
      if (row.content_origin !== 'automated') {
        throw constraintError('23514', 'check constraint review_publication_queue_content_origin_check');
      }
      if (!QUEUE_STATUS[String(row.status)]) {
        throw constraintError('23514', 'check constraint review_publication_queue_status_check');
      }
      row.source_facts ??= [];
      assertQueueShape(row);
    }
    if (table === 'reviews') {
      row.order_id ??= null;
      row.invitation_id ??= null;
      row.author_masked_contact ??= null;
      row.verification_level ??= 'confirmed_store_order';
      row.score_weight ??= 0.9;
      row.integrity_factor ??= 1;
      row.product_name ??= null;
      row.status ??= 'published';
      row.upvotes ??= 0;
      row.helpful_count ??= 0;
      row.content_origin ??= null;
      row.publication_key ??= null;
      if (row.author_name == null || String(row.author_name).trim() === '') {
        throw constraintError('23502', 'null value in column "author_name" of relation "reviews" violates not-null constraint');
      }
      const rating = Number(row.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw constraintError('23514', `new row for relation "reviews" violates check constraint "reviews_rating_check" (body=${String(row.body)}; title=${String(row.title)})`);
      }
    }
    if (row.created_at == null) row.created_at = now;
    if (row.updated_at == null) row.updated_at = now;
    if (row.id == null) row.id = this.db.sequences[table]++;
    else this.db.sequences[table] = Math.max(this.db.sequences[table], Number(row.id) + 1);
    try {
      this.assertUnique(table, row, this.visible(table));
      this.assertForeignKeys(table, row);
    } catch (error) {
      if (conflict && errorCode(error) === '23505') return { rows: [], rowCount: 0 };
      throw error;
    }
    if (this.tx) {
      const inserted = this.tx.inserts.get(table) ?? [];
      inserted.push(row);
      this.tx.inserts.set(table, inserted);
    } else {
      this.db.tables[table].push(row);
    }
    return { rows: returning ? [project(row, returning)] : [], rowCount: 1 };
  }

  private update(text: string, params: unknown[]): { rows: Row[]; rowCount: number } {
    let head = text;
    let returning: string | null = null;
    const returningAt = findKeyword(head, 'returning');
    if (returningAt >= 0) {
      returning = head.slice(returningAt + 'returning'.length).trim();
      head = head.slice(0, returningAt).trim();
    }
    const parsed = head.match(/^update ([a-z0-9_]+)(?: (?!set\b)[a-z_][a-z0-9_]*)? set ([\s\S]+?) where ([\s\S]+)$/i);
    if (!parsed) throw new Error(`Unsupported SQL for review publication harness: ${text}`);
    const table = parsed[1].toLowerCase();
    const matched = this.originals(table).filter((row) => splitAnd(parsed[3]).every((part) => matchPredicate(part, this.read(row), params)));
    const changed: Row[] = [];
    for (const source of matched) {
      const current = { ...this.read(source) };
      const target = this.writable(table, source);
      for (const assignment of splitArgs(parsed[2])) {
        const match = assignment.match(/^([a-z0-9_]+)\s*=\s*([\s\S]+)$/i);
        if (!match) throw new Error(`Unsupported assignment: ${assignment}`);
        const column = match[1].toLowerCase();
        target[column] = coerce(column, evalExpr(match[2], current, params));
      }
      if (table === 'review_publication_queue') assertQueueShape(target);
      this.assertForeignKeys(table, target);
      changed.push(target);
    }
    return { rows: returning ? changed.map((row) => project(row, returning)) : [], rowCount: changed.length };
  }

  private remove(text: string, params: unknown[]): { rows: Row[]; rowCount: number } {
    const parsed = text.match(/^delete from ([a-z0-9_]+)(?: (?!where\b)[a-z_][a-z0-9_]*)?(?: where ([\s\S]+))?$/i);
    if (!parsed) throw new Error(`Unsupported SQL for review publication harness: ${text}`);
    const table = parsed[1].toLowerCase();
    const matched = this.originals(table).filter((row) => !parsed[2] || splitAnd(parsed[2]).every((part) => matchPredicate(part, this.read(row), params)));
    for (const source of matched) {
      if (this.tx) this.tx.deleted.add(source);
      else this.db.tables[table] = this.db.tables[table].filter((row) => row !== source);
    }
    return { rows: [], rowCount: matched.length };
  }

  private async select(text: string, params: unknown[]): Promise<{ rows: Row[]; rowCount: number }> {
    const forUpdate = /\bfor\s+update\b/i.test(text);
    const skipLocked = /\bskip\s+locked\b/i.test(text);
    const stripped = text.replace(/\s+for\s+update\b[\s\S]*$/i, '').trim();
    const fromAt = findKeyword(stripped, 'from');
    if (fromAt < 0) throw new Error(`Unsupported SQL for review publication harness: ${text}`);
    const list = stripped.slice('select'.length, fromAt).trim();
    let rest = stripped.slice(fromAt + 'from'.length).trim();
    const tableMatch = rest.match(/^([a-z0-9_]+)/i);
    if (!tableMatch) throw new Error(`Unsupported SQL for review publication harness: ${text}`);
    const table = tableMatch[1].toLowerCase();
    rest = rest.slice(tableMatch[0].length).trim().replace(/^(?!where\b|order\b|limit\b)[a-z_][a-z0-9_]*\s+/i, '');
    const whereAt = findKeyword(rest, 'where');
    const orderAt = findKeyword(rest, 'order');
    const limitAt = findKeyword(rest, 'limit');
    const endAt = (index: number) => (index < 0 ? rest.length : index);
    const where = whereAt >= 0 ? rest.slice(whereAt + 'where'.length, Math.min(endAt(orderAt), endAt(limitAt))).trim() : '';
    const order = orderAt >= 0 ? rest.slice(orderAt + 'order'.length, endAt(limitAt)).trim().replace(/^by\s+/i, '') : '';
    const limitToken = limitAt >= 0 ? rest.slice(limitAt + 'limit'.length).trim() : '';
    const limit = limitToken ? Number(literal(limitToken, params)) : null;
    const castInt = /count\(\*\)\s*::\s*(int|integer)\b/i.test(this.db.sqlLog[this.db.sqlLog.length - 1] ?? '');
    const count = list.match(/^count\(\*\)(?:\s+as)?\s*([a-z0-9_]+)?$/i);
    const maximum = list.match(/^max\(([a-z0-9_]+)\)(?:\s+as)?\s*([a-z0-9_]+)?$/i);
    const matched = this.originals(table).filter((row) => !where || splitAnd(where).every((part) => matchPredicate(part, this.read(row), params)));
    if (count) {
      const alias = (count[1] ?? 'count').toLowerCase();
      return { rows: [{ [alias]: castInt ? matched.length : String(matched.length) }], rowCount: 1 };
    }
    if (maximum) {
      const column = maximum[1].toLowerCase();
      const alias = (maximum[2] ?? column).toLowerCase();
      let best: unknown = null;
      for (const source of matched) {
        const value = this.read(source)[column];
        if (value == null) continue;
        if (best == null || compare(value, best) > 0) best = value;
      }
      return { rows: [{ [alias]: best }], rowCount: 1 };
    }
    const ranked = [...matched].sort((left, right) => {
      if (!order) return 0;
      for (const part of splitArgs(order)) {
        const match = part.match(/^([a-z0-9_]+)(?:\s+(asc|desc))?$/i);
        if (!match) throw new Error(`Unsupported order: ${part}`);
        const cmp = compare(this.read(left)[match[1].toLowerCase()], this.read(right)[match[1].toLowerCase()]);
        if (cmp !== 0) return cmp * ((match[2] ?? 'asc').toLowerCase() === 'desc' ? -1 : 1);
      }
      return 0;
    });
    const chosen: Row[] = [];
    for (const source of ranked) {
      if (limit != null && chosen.length >= limit) break;
      if (forUpdate) {
        while (this.db.rowLocks.get(source) && this.db.rowLocks.get(source) !== this) {
          if (skipLocked) break;
          const waited = Promise.withResolvers<void>();
          const waiters = this.db.rowWaiters.get(source) ?? [];
          waiters.push(waited.resolve);
          this.db.rowWaiters.set(source, waiters);
          await waited.promise;
        }
        if (this.db.rowLocks.get(source) && this.db.rowLocks.get(source) !== this) continue;
        this.db.rowLocks.set(source, this);
        this.heldRows.push(source);
      }
      chosen.push(this.read(source));
    }
    const rows = chosen.map((row) => (list.trim() === '*' ? { ...row } : project(row, list)));
    return { rows, rowCount: rows.length };
  }

  private async lockAdvisory(params: unknown[]) {
    const key = JSON.stringify(params);
    while (this.db.advisory.get(key) && this.db.advisory.get(key) !== this) {
      const waited = Promise.withResolvers<void>();
      const waiters = this.db.advisoryWaiters.get(key) ?? [];
      waiters.push(waited.resolve);
      this.db.advisoryWaiters.set(key, waiters);
      await waited.promise;
    }
    this.db.advisory.set(key, this);
    this.heldAdvisory.push(key);
  }

  private releaseLocks() {
    for (const row of this.heldRows) {
      if (this.db.rowLocks.get(row) === this) this.db.rowLocks.delete(row);
      this.db.rowWaiters.get(row)?.shift()?.();
    }
    this.heldRows = [];
    for (const key of this.heldAdvisory) {
      if (this.db.advisory.get(key) === this) this.db.advisory.delete(key);
      this.db.advisoryWaiters.get(key)?.shift()?.();
    }
    this.heldAdvisory = [];
  }

  private commit() {
    if (!this.tx) return;
    const pending: Array<{ table: string; row: Row }> = [];
    for (const [table, rows] of this.tx.inserts) {
      for (const row of rows) pending.push({ table, row });
    }
    for (const item of pending) this.assertUnique(item.table, item.row, this.db.tables[item.table]);
    for (const item of pending) this.db.tables[item.table].push(item.row);
    for (const [original, copy] of this.tx.updates) Object.assign(original, copy);
    for (const row of this.tx.deleted) {
      for (const table of Object.keys(this.db.tables)) {
        this.db.tables[table] = this.db.tables[table].filter((stored) => stored !== row);
      }
    }
    this.tx = null;
    this.releaseLocks();
  }

  private rollback() {
    this.tx = null;
    this.releaseLocks();
  }
}

export function createPublicationHarness(): PublicationHarness {
  const names = ['businesses', 'review_publication_queue', 'reviews', 'audit_logs', 'orders', 'invitations'];
  const db: Memory = {
    tables: Object.fromEntries(names.map((name) => [name, []])),
    sequences: Object.fromEntries(names.map((name) => [name, 1])),
    sqlLog: [],
    rowLocks: new Map(),
    rowWaiters: new Map(),
    advisory: new Map(),
    advisoryWaiters: new Map(),
  };
  return {
    sqlLog: db.sqlLog,
    pool: {
      query: (sql, params) => new PublicationClient(db).query(sql, params ?? []),
      connect: async () => new PublicationClient(db),
    },
  };
}
