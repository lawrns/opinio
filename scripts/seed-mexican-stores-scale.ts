import fs from 'fs';
import path from 'path';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://opinio:Hennie14Hennie14@82.208.21.221:15437/opinio'
});

interface MexicanStore {
  slug: string;
  brand_name: string;
  legal_name?: string | null;
  domain: string;
  category: string;
  description: string;
  address?: string | null;
  phone?: string | null;
  source: string;
}

export async function seedMexicanStores() {
  const catalogPath = path.resolve(process.cwd(), 'data/mexican_stores_1000.json');
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Catalog file not found at ${catalogPath}`);
  }

  const stores: MexicanStore[] = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  console.log(`\n🚀 Starting scale database seeding for ${stores.length} Mexican stores...`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < stores.length; i++) {
      const s = stores[i];

      // Determine correct logo extension
      let logoUrl = `/logos/${s.slug}.png`;
      if (fs.existsSync(path.resolve(process.cwd(), `public/logos/${s.slug}.svg`))) {
        logoUrl = `/logos/${s.slug}.svg`;
      } else if (fs.existsSync(path.resolve(process.cwd(), `public/logos/${s.slug}.webp`))) {
        logoUrl = `/logos/${s.slug}.webp`;
      }

      const slug = s.slug.slice(0, 115);
      const brandName = s.brand_name.slice(0, 195);
      const legalName = s.legal_name ? s.legal_name.slice(0, 250) : null;
      const category = s.category.slice(0, 95);
      const domain = s.domain.slice(0, 195);
      const operatingArea = (s.address || 'Nacional (México)').replace(/\s+/g, ' ').slice(0, 145);
      const phone = s.phone ? s.phone.split('\n')[0].replace(/\s+/g, ' ').trim().slice(0, 38) : null;

      const res = await client.query(
        `INSERT INTO businesses (
           slug, brand_name, legal_name, category, description, domain, logo_url,
           operating_area, phone, claimed, verified_level, trust_score,
           confidence_level, coverage_percentage, observed_orders_count,
           invited_orders_count, issues_per_thousand, resolution_rate,
           median_response_hours, reopen_rate, effective_reviews_count
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false,'public_info',0,'preliminary',0,0,0,0,0,0,0,0)
         ON CONFLICT (slug) DO UPDATE SET
           brand_name = EXCLUDED.brand_name,
           legal_name = COALESCE(businesses.legal_name, EXCLUDED.legal_name),
           category = EXCLUDED.category,
           description = EXCLUDED.description,
           domain = EXCLUDED.domain,
           logo_url = EXCLUDED.logo_url,
           operating_area = EXCLUDED.operating_area,
           phone = COALESCE(businesses.phone, EXCLUDED.phone),
           updated_at = NOW()
         WHERE businesses.verified_level = 'public_info' AND businesses.trust_score = 0
         RETURNING (xmax = 0) AS did_insert`,
        [
          slug,
          brandName,
          legalName,
          category,
          s.description,
          domain,
          logoUrl,
          operatingArea,
          phone
        ]
      );

      if (res.rows.length === 0) {
        skipped++;
      } else if (res.rows[0].did_insert) {
        inserted++;
      } else {
        updated++;
      }

      if ((i + 1) % 100 === 0 || i + 1 === stores.length) {
        console.log(`  Processed ${i + 1}/${stores.length} (${inserted} inserted, ${updated} updated, ${skipped} skipped)`);
      }
    }

    await client.query('COMMIT');

    const totalCountRes = await client.query('SELECT COUNT(*) as total FROM businesses');
    const totalBusinesses = totalCountRes.rows[0].total;

    console.log(`\n🎉 SEED COMPLETED:`);
    console.log(`  - Newly inserted: ${inserted}`);
    console.log(`  - Updated / refreshed: ${updated}`);
    console.log(`  - Preserved claimed/verified: ${skipped}`);
    console.log(`  - TOTAL BUSINESSES IN DATABASE: ${totalBusinesses}`);

    return { inserted, updated, skipped, totalBusinesses };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during directory seeding:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module || process.argv[1]?.includes('seed-mexican-stores-scale')) {
  seedMexicanStores().then(() => process.exit(0)).catch(() => process.exit(1));
}
