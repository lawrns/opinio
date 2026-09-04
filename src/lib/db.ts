import { Pool, QueryResult, QueryResultRow } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgres://opinio:Hennie14Hennie14@82.208.21.221:15437/opinio';

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

export const pool: Pool = global._pgPool || new Pool({
  connectionString,
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: false,
});

if (process.env.NODE_ENV !== 'production') {
  global._pgPool = pool;
}

export async function query<T extends QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 500) {
      console.warn(`[db:slow-query] ${duration}ms: ${text.slice(0, 80)}`);
    }
    return res;
  } catch (error) {
    console.error('[db:error]', error, 'Query:', text);
    throw error;
  }
}
