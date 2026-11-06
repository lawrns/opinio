import pg from 'pg';
import { REVIEW_BRANDS } from '../src/lib/review-brands';
import { queueCapacity } from '../src/lib/review-enqueue';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    process.stderr.write('database_unavailable\n');
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    const capacity = await queueCapacity(client);
    const slugs = Object.keys(REVIEW_BRANDS);
    const found = await client.query(
      'SELECT id, slug FROM businesses WHERE slug = ANY($1::text[])',
      [slugs],
    );
    const brands = slugs.flatMap((slug) => {
      const row = found.rows.find((item) => item.slug === slug);
      if (!row) return [];
      const businessId = Number(row.id);
      if (!Number.isInteger(businessId)) return [];
      const remaining = capacity.perBrandRemaining[String(businessId)] ?? 4;
      return [{ slug, businessId, remaining: Math.max(0, remaining) }];
    });
    process.stdout.write(`${JSON.stringify({ ...capacity, brands })}\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(() => {
  process.stderr.write('database_unavailable\n');
  process.exit(1);
});
