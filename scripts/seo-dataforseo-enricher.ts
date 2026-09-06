/**
 * scripts/seo-dataforseo-enricher.ts
 *
 * Automated search intelligence collector using DataForSEO API.
 * Gathers empirical Mexican search volumes, PAA queries, and AI Overview citations
 * to continuously enrich metadata, FAQPage schemas, and GEO citability passages.
 */

const DATAFORSEO_AUTH = process.env.DATAFORSEO_AUTH || 'Basic bGF1cmVuY2VAZnl2ZXMuY29tOjUwZGZhZmQxNTMyN2UyMWI=';
const MEXICO_LOCATION_CODE = 2484; // Mexico country code in DataForSEO
const SPANISH_LANG = 'es';

interface SearchVolumeResult {
  keyword: string;
  search_volume: number | null;
  cpc: number | null;
  competition_level: string | null;
}

interface SerpItem {
  type: string;
  rank_group: number;
  title?: string;
  url?: string;
  domain?: string;
  description?: string;
  references?: Array<{ domain?: string; title?: string }>;
  items?: Array<{ title?: string; text?: string; url?: string }>;
}

export async function fetchMexicoKeywordVolumes(keywords: string[]): Promise<SearchVolumeResult[]> {
  try {
    const postData = [{
      keywords,
      location_code: MEXICO_LOCATION_CODE,
      language_code: SPANISH_LANG,
    }];

    const res = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
      method: 'POST',
      headers: {
        'Authorization': DATAFORSEO_AUTH,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    const json = await res.json();
    if (json.tasks && json.tasks[0] && json.tasks[0].result) {
      return json.tasks[0].result.map((item: { keyword: string; search_volume: number | null; cpc: number | null; competition_level: string | null }) => ({
        keyword: item.keyword,
        search_volume: item.search_volume,
        cpc: item.cpc,
        competition_level: item.competition_level,
      }));
    }
    return [];
  } catch (err) {
    console.error('DataForSEO search volume error:', err);
    return [];
  }
}

export async function fetchMexicoSerpAnalysis(keyword: string): Promise<{
  aiOverviewPresent: boolean;
  aiOverviewReferences: string[];
  paaQuestions: string[];
  topOrganicDomains: string[];
}> {
  try {
    const postData = [{
      keyword,
      location_code: MEXICO_LOCATION_CODE,
      language_code: SPANISH_LANG,
      device: 'desktop',
      depth: 10,
    }];

    const res = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
      method: 'POST',
      headers: {
        'Authorization': DATAFORSEO_AUTH,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    const json = await res.json();
    const task = json.tasks?.[0];
    if (!task?.result?.[0]) {
      return { aiOverviewPresent: false, aiOverviewReferences: [], paaQuestions: [], topOrganicDomains: [] };
    }

    const items: SerpItem[] = task.result[0].items || [];
    const aio = items.find((i) => i.type === 'ai_overview');
    const paa = items.find((i) => i.type === 'people_also_ask');

    const aiOverviewReferences: string[] = [];
    if (aio && Array.isArray(aio.references)) {
      aio.references.forEach((r) => {
        if (r.domain) aiOverviewReferences.push(r.domain);
      });
    }

    const paaQuestions: string[] = [];
    if (paa && Array.isArray(paa.items)) {
      paa.items.forEach((q) => {
        if (q.title) paaQuestions.push(q.title);
      });
    }

    const topOrganicDomains: string[] = items
      .filter((i) => i.type === 'organic' && i.domain)
      .slice(0, 5)
      .map((i) => i.domain as string);

    return {
      aiOverviewPresent: Boolean(aio),
      aiOverviewReferences,
      paaQuestions,
      topOrganicDomains,
    };
  } catch (err) {
    console.error(`DataForSEO SERP error for "${keyword}":`, err);
    return { aiOverviewPresent: false, aiOverviewReferences: [], paaQuestions: [], topOrganicDomains: [] };
  }
}

// Direct execution test
if (typeof process !== 'undefined' && process.argv[1]?.includes('seo-dataforseo-enricher')) {
  (async () => {
    console.log('--- Testing DataForSEO Mexican Keyword Volumes ---');
    const volumes = await fetchMexicoKeywordVolumes([
      'es confiable cyberpuerta',
      'opiniones cyberpuerta',
      'quejas smart fit profeco',
      'es seguro comprar en walmart',
      'reclamaciones dhl mexico',
    ]);
    console.table(volumes);

    console.log('\n--- Testing DataForSEO SERP Intelligence for "es confiable cyberpuerta" ---');
    const serp = await fetchMexicoSerpAnalysis('es confiable cyberpuerta');
    console.log('AI Overview Present:', serp.aiOverviewPresent);
    console.log('AI Overview Cited Domains:', serp.aiOverviewReferences);
    console.log('People Also Ask Questions:', serp.paaQuestions);
    console.log('Top Organic Domains:', serp.topOrganicDomains);
  })();
}
