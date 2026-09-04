import fs from 'fs';
import path from 'path';
import { pool } from '../src/lib/db';

async function migrate() {
  console.log('🔄 Connecting to Coolify PostgreSQL at 82.208.21.221:15437...');
  const sqlPath = path.join(__dirname, '../src/lib/schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = await pool.connect();
  try {
    console.log('🚀 Running schema migrations...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Schema migration applied successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
