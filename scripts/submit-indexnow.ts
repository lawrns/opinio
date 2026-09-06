/**
 * scripts/submit-indexnow.ts
 *
 * Submits all 135+ Opinio business pages and directory routes to IndexNow
 * for instant indexing across Bing, Yandex, Naver, and Seznam.
 */

import { query } from '../src/lib/db';

const INDEXNOW_KEY = '4b9f2c8d1e3a4567890abcdef1234567';
const HOST = process.env.NEXT_PUBLIC_SITE_HOST || 'opinio.mx';
const BASE_URL = `https://${HOST}`;

interface BusinessSlugRow {
  slug: string;
}

export async function submitToIndexNow(): Promise<void> {
  console.log(`[IndexNow] Preparing submission for host: ${HOST}...`);

  try {
    const res = await query<BusinessSlugRow>(
      `SELECT slug FROM businesses WHERE slug IS NOT NULL ORDER BY id ASC`
    );

    const urls: string[] = [
      `${BASE_URL}/`,
      `${BASE_URL}/verificar`,
      ...res.rows.map((b) => `${BASE_URL}/b/${b.slug}`),
    ];

    console.log(`[IndexNow] Collected ${urls.length} URLs to submit.`);

    const payload = {
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    };

    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    console.log(`[IndexNow] Response status: ${response.status} ${response.statusText}`);
    if (response.status === 200 || response.status === 202) {
      console.log(`[IndexNow] ✅ Successfully submitted ${urls.length} URLs for instant indexing!`);
    } else {
      const text = await response.text();
      console.warn(`[IndexNow] Response body:`, text);
    }
  } catch (error) {
    console.error('[IndexNow] Error submitting to IndexNow:', error);
  }
}

if (typeof process !== 'undefined' && process.argv[1]?.includes('submit-indexnow')) {
  submitToIndexNow().then(() => process.exit(0));
}
