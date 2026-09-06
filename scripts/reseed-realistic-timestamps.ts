import { pool } from '../src/lib/db';
import { calculateOpinioScore, ReviewCalculationItem, ResolutionMetricsInput } from '../src/lib/scoring';

function generateBurstTimestamps(count: number, maxDaysAgo: number, pattern: 'food' | 'b2b' | 'gym' | 'health'): Date[] {
  const timestamps: Date[] = [];
  let daysAgo = 2.5; // Most recent review ~2-3 days ago

  for (let i = 0; i < count; i++) {
    // Non-linear arrival:
    // 35% chance of burst (cluster on same day or next day: 0 to 1.2 days)
    // 40% chance of standard gap (2 to 5 days)
    // 25% chance of long drought (7 to 18 days)
    const r = Math.random();
    let delta = 0;
    if (r < 0.35) {
      delta = Math.random() * 0.9; // same day or next day
    } else if (r < 0.75) {
      delta = 1.8 + Math.random() * 3.5; // 2-5 days
    } else {
      delta = 6.0 + Math.random() * 11.0; // 6-17 days
    }

    daysAgo += delta;
    if (daysAgo > maxDaysAgo) {
      // Keep strictly within max boundary with slight variance
      daysAgo = maxDaysAgo - (Math.random() * 15);
    }

    // Realistic time-of-day in Mexican local time (converted to UTC ~ +6)
    let localHour = 14;
    if (pattern === 'food') {
      // Lunch rush 13-16 or Dinner rush 19-23
      localHour = Math.random() < 0.45 ? 13 + Math.floor(Math.random() * 4) : 19 + Math.floor(Math.random() * 4);
    } else if (pattern === 'b2b') {
      // Office hours 9 to 18
      localHour = 9 + Math.floor(Math.random() * 9);
    } else if (pattern === 'gym') {
      // Morning workout 7-10 or evening workout 18-21
      localHour = Math.random() < 0.5 ? 7 + Math.floor(Math.random() * 4) : 18 + Math.floor(Math.random() * 4);
    } else {
      // Consultation hours 10 to 19
      localHour = 10 + Math.floor(Math.random() * 10);
    }

    const minute = Math.floor(Math.random() * 60);
    const second = Math.floor(Math.random() * 60);
    const millisecond = Math.floor(Math.random() * 999);

    const d = new Date();
    d.setDate(d.getDate() - Math.floor(daysAgo));
    d.setHours(localHour + 6, minute, second, millisecond); // UTC offset
    timestamps.push(d);
  }

  // Sort descending: newest to oldest
  timestamps.sort((a, b) => b.getTime() - a.getTime());
  return timestamps;
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('⏳ Re-seeding realistic Poisson-burst timestamps across all reviews...');

    const configs: Array<{ slug: string; pattern: 'food' | 'b2b' | 'gym' | 'health'; maxDays: number }> = [
      { slug: 'barri', pattern: 'food', maxDays: 295 },
      { slug: 'gogym', pattern: 'gym', maxDays: 320 },
      { slug: 'doctormx', pattern: 'health', maxDays: 310 },
      { slug: 'bien', pattern: 'b2b', maxDays: 175 }, // Strictly within last 6 months
      { slug: 'hablo', pattern: 'b2b', maxDays: 240 }
    ];

    for (const cfg of configs) {
      const bRes = await client.query('SELECT id, brand_name, observed_orders_count, invited_orders_count FROM businesses WHERE slug = $1', [cfg.slug]);
      if (bRes.rows.length === 0) continue;
      const b = bRes.rows[0];

      const rRes = await client.query('SELECT id, rating, verification_level FROM reviews WHERE business_id = $1 ORDER BY id ASC', [b.id]);
      const reviews = rRes.rows;
      console.log(`\n⚙️ ${b.brand_name}: Generating burst timestamps for ${reviews.length} reviews (max ${cfg.maxDays} days ago)...`);

      const timestamps = generateBurstTimestamps(reviews.length, cfg.maxDays, cfg.pattern);

      const reviewCalcItems: ReviewCalculationItem[] = [];

      for (let i = 0; i < reviews.length; i++) {
        const rev = reviews[i];
        const t = timestamps[i];
        const ageDays = Math.max(1, (Date.now() - t.getTime()) / (1000 * 60 * 60 * 24));

        // 1. Update review
        await client.query(
          `UPDATE reviews SET created_at = $1, updated_at = $1 WHERE id = $2`,
          [t.toISOString(), rev.id]
        );

        // 2. Update order and invitation to match realistically
        const orderHoursBefore = cfg.pattern === 'food' ? 0.5 + Math.random() * 1.5 : 24 + Math.random() * 48;
        const orderDate = new Date(t.getTime() - orderHoursBefore * 60 * 60 * 1000);
        const invDate = new Date(t.getTime() - (orderHoursBefore * 0.5) * 60 * 60 * 1000);

        await client.query(
          `UPDATE orders SET order_date = $1, delivered_date = $2 WHERE id = (SELECT order_id FROM reviews WHERE id = $3)`,
          [orderDate.toISOString(), t.toISOString(), rev.id]
        );

        await client.query(
          `UPDATE invitations SET sent_at = $1, completed_at = $2 WHERE id = (SELECT invitation_id FROM reviews WHERE id = $3)`,
          [invDate.toISOString(), t.toISOString(), rev.id]
        );

        reviewCalcItems.push({
          rating: rev.rating,
          verificationLevel: rev.verification_level,
          ageDays,
          integrityFactor: 1.00
        });
      }

      // Recalculate Opinio Score with actual recency decay
      const resolutionInput: ResolutionMetricsInput = {
        casesCount: 6,
        consumerConfirmedCount: 6,
        merchantRespondedCount: 6,
        medianResponseHours: 0.8,
        reopenedCount: 0
      };

      const calculated = calculateOpinioScore(
        reviewCalcItems,
        resolutionInput,
        b.observed_orders_count,
        b.invited_orders_count,
        78.0,
        20
      );

      await client.query(
        `UPDATE businesses SET
          trust_score = $1,
          effective_reviews_count = $2,
          updated_at = NOW()
        WHERE id = $3`,
        [calculated.opinioScore, Math.round(calculated.effectiveSampleSize), b.id]
      );

      console.log(`✅ ${b.brand_name}: New Opinio Score ${calculated.opinioScore}/100, effective reviews: ${Math.round(calculated.effectiveSampleSize)}`);
    }

    await client.query('COMMIT');
    console.log('\n🎉 ALL TIMESTAMPS SUCCESSFULLY RE-SEEDED WITH REALISTIC BURSTINESS!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating timestamps:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
