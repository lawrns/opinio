import { pool } from '../src/lib/db';

async function seedRibbonWidgets() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Portfolio businesses
    const businesses = [
      { slug: 'barri', token: 'wgt_barri_ribbon_2026' },
      { slug: 'doctormx', token: 'wgt_doctormx_ribbon_2026' },
      { slug: 'hablo', token: 'wgt_hablo_ribbon_2026' },
      { slug: 'gogym', token: 'wgt_gogym_ribbon_2026' },
    ];

    for (const b of businesses) {
      const res = await client.query('SELECT id, brand_name FROM businesses WHERE slug = $1 LIMIT 1', [b.slug]);
      if (res.rows.length > 0) {
        const businessId = res.rows[0].id;
        await client.query(
          `INSERT INTO widgets (business_id, token, widget_type, theme, config, is_active)
           VALUES ($1, $2, 'ribbon', 'dark', '{"style":"ribbon"}'::jsonb, true)
           ON CONFLICT (token) DO UPDATE 
           SET widget_type = 'ribbon', is_active = true, theme = 'dark'`,
          [businessId, b.token]
        );
        console.log(`✅ Seeded ribbon widget for ${res.rows[0].brand_name} (${b.slug}) -> ${b.token}`);
      } else {
        console.warn(`⚠️ Business ${b.slug} not found in DB`);
      }
    }

    // Also seed ribbon for any other active business that doesn't have one
    const allRes = await client.query('SELECT id, slug, brand_name FROM businesses ORDER BY id ASC');
    for (const row of allRes.rows) {
      const token = `wgt_${row.slug}_ribbon_2026`;
      await client.query(
        `INSERT INTO widgets (business_id, token, widget_type, theme, config, is_active)
         VALUES ($1, $2, 'ribbon', 'light', '{"style":"ribbon"}'::jsonb, true)
         ON CONFLICT (token) DO NOTHING`,
        [row.id, token]
      );
    }

    await client.query('COMMIT');
    console.log(`🎉 Finished seeding ribbon widgets for all businesses.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding ribbon widgets:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedRibbonWidgets();
