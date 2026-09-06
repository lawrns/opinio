import { query } from '../src/lib/db';

const INDEXNOW_KEY = 'e89f5c4b31a24d5e89a0b1c2d3e4f5a6';
const HOST = 'opinio.mx';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

interface BusinessRow {
  slug: string;
}

async function main() {
  console.log(`[IndexNow] Starting IndexNow submission for ${HOST}...`);

  const res = await query<BusinessRow>(
    `SELECT slug FROM businesses WHERE slug IS NOT NULL ORDER BY id ASC`
  );

  const urlList: string[] = [
    `https://${HOST}`,
    `https://${HOST}/verificar`,
    `https://${HOST}/directorio`,
    ...res.rows.map((b) => `https://${HOST}/b/${b.slug}`),
  ];

  console.log(`[IndexNow] Prepared ${urlList.length} URLs for submission.`);

  const payload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  };

  const endpoints = [
    'https://api.indexnow.org/indexnow',
    'https://www.bing.com/indexnow',
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`[IndexNow] Submitting to ${endpoint}...`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      console.log(`[IndexNow] ${endpoint} response: HTTP ${response.status} ${response.statusText} — ${responseText || '(empty body = success)'}`);
    } catch (err) {
      console.error(`[IndexNow] Failed to submit to ${endpoint}:`, err);
    }
  }

  console.log('[IndexNow] Submission completed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[IndexNow] Fatal error:', err);
  process.exit(1);
});
