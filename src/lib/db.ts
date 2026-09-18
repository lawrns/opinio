import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === 'production') {
  throw new Error('[db] FATAL: DATABASE_URL environment variable is not defined in production.');
}

declare global {
  var _pgPool: Pool | undefined;
}

export const pool: Pool = global._pgPool || new Pool({
  connectionString: connectionString || process.env.DATABASE_URL,
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

/**
 * Executes a callback within a managed database transaction.
 * Automatically handles BEGIN, COMMIT, ROLLBACK and client release.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[db:rollback-error]', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}
