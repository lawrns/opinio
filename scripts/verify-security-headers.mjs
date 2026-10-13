#!/usr/bin/env node
/**
 * Runtime check for the response policies from issue #11 (finding JEV-019):
 * route-appropriate `Referrer-Policy` + `Content-Security-Policy frame-ancestors`.
 *
 * Headers only (any Node 18+ runtime, no dependencies):
 *   BASE_URL=http://127.0.0.1:3211 node scripts/verify-security-headers.mjs
 *
 * Header policy plus the real cross-origin framing / referrer decision and the
 * embedded widget surface in Chrome (external deps, same convention as
 * scripts/ui-qa.mjs):
 *   npm install --prefix /tmp/opinio-qa playwright
 *   BASE_URL=http://127.0.0.1:3211 WIDGET_TOKEN=wgt_example_ribbon_2026 \
 *   QA_DEPENDENCIES=/tmp/opinio-qa/node_modules CHROME_PATH="/path/to/chrome" \
 *   node scripts/verify-security-headers.mjs --embed
 *
 * `--embed` serves one host page from a second local origin (localhost:<EMBED_PORT>,
 * default 3291) that frames the app, so the framing decision is observed as a real
 * consumer would see it. Read-only: GET/HEAD only, no writes, no external network.
 */
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const base = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const appOrigin = base;
const appFrameUrl = `${appOrigin}/merchant`;
const widgetToken = process.env.WIDGET_TOKEN || '';
const slug = process.env.SLUG || '';
const embed = process.argv.includes('--embed');
const embedPort = Number(process.env.EMBED_PORT || 3291);
const embedOrigin = `http://localhost:${embedPort}`;

const APP_POLICY = { referrerPolicy: 'strict-origin-when-cross-origin', frameAncestors: "'self'" };
const WIDGET_POLICY = { referrerPolicy: 'no-referrer', frameAncestors: '*' };

const appRoutes = ['/', '/directorio', '/verificar', '/caso/nuevo', '/merchant', '/merchant/widgets'];
const widgetFamilies = ['badge', 'card', 'reassurance', 'ribbon'];

const results = [];
function check(label, actual, expected) {
  const ok = actual === expected;
  results.push({ label, ok, actual, expected });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: ${actual ?? '(missing)'}${ok ? '' : ` (expected ${expected})`}`);
}

function frameAncestors(headerValue) {
  return headerValue ? (/frame-ancestors\s+([^;]+)/i.exec(headerValue)?.[1] ?? '').trim() : null;
}

async function assertPolicy(route, expected, { requireOkStatus }) {
  const res = await fetch(base + route, { redirect: 'manual' });
  await res.arrayBuffer().catch(() => {});
  if (requireOkStatus && !(res.status >= 200 && res.status < 400)) {
    check(`${route} status`, String(res.status), '2xx/3xx');
    return;
  }
  check(`${route} Referrer-Policy`, res.headers.get('referrer-policy'), expected.referrerPolicy);
  check(
    `${route} CSP frame-ancestors`,
    frameAncestors(res.headers.get('content-security-policy')),
    expected.frameAncestors
  );
}

console.log(`# issue #11 response policy check — ${base}${widgetToken ? ` (widget token ${widgetToken})` : ''}\n`);

for (const route of appRoutes) await assertPolicy(route, APP_POLICY, { requireOkStatus: true });
if (slug) await assertPolicy(`/b/${slug}`, APP_POLICY, { requireOkStatus: true });
if (slug) await assertPolicy(`/escribir-opinion/${slug}`, APP_POLICY, { requireOkStatus: true });
if (widgetToken) {
  for (const family of widgetFamilies) {
    await assertPolicy(`/widget/${family}/${widgetToken}`, WIDGET_POLICY, { requireOkStatus: true });
  }
  // The JSON widget API is an application surface, not an embeddable document.
  await assertPolicy(`/api/v1/widgets/${widgetToken}`, APP_POLICY, { requireOkStatus: false });
} else {
  console.log('SKIP widget family + token checks (set WIDGET_TOKEN=<token> from the widgets table)');
}

let report = null;
if (embed) report = await runEmbeddingCheck();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} assertions passed`);

if (report) {
  console.log('\n## Cross-origin framing (real browser)');
  for (const frame of report.iframes) {
    console.log(
      `FRAME ${frame.id} -> ${frame.target} | handle: ${frame.childFrameExists ? 'yes' : 'no'}` +
        (frame.renderedText ? ` | text: ${JSON.stringify(frame.renderedText.replace(/\s+/g, ' ').slice(0, 90))}` : '')
    );
  }
  console.log(`WIDGET document status: ${report.widget.documentStatus} | passport link: ${report.widget.passportHref}`);
  console.log(`WIDGET public brand_name (${report.widget.passportSlug}): ${JSON.stringify(report.widget.brandName)}`);
  console.log(`WIDGET surface label: ${JSON.stringify(report.widget.surfaceLabel)}`);
  for (const probe of [report.probes.app, report.probes.widget]) {
    console.log(
      `REFERER ${probe.from}: ${probe.referer === null ? '(none sent)' : probe.referer}` +
        ` | observed by embedder: ${probe.received}${probe.error ? ` | probe error: ${probe.error}` : ''}`
    );
  }
  for (const violation of report.violations) console.log(`CONSOLE ${violation.text}`);

  // Embedded widget must be a real widget document, not an error/404 shell.
  check('widget document response status', String(report.widget.documentStatus), '200');
  if (slug) check('widget passport link slug', String(report.widget.passportSlug), slug);
  else console.log('SKIP widget passport slug assertion (set SLUG=<business slug> for that token)');
  check('widget surface brand matches public business API', String(report.widget.brandMatches), 'true');
  check('widget frame url carries the requested token', String(report.widget.urlHasToken), 'true');
  check('widget surface rendered (not a browser error page)', String(report.widget.rendered), 'true');
  // Sensitive app surface must be refused by the browser.
  check('sensitive app frame refused cross-origin', String(report.appRefused), 'true');
  check('browser CSP frame-ancestors violation logged', String(report.violations.length > 0), 'true');
  // Referrer scope, only meaningful when the embedder actually observed the probe.
  check('app probe request observed by embedder', String(report.probes.app.received), 'true');
  check('app probe fetch error', String(report.probes.app.error), 'null');
  check(
    'cross-origin Referer (origin only, no path/query)',
    report.probes.app.received ? String(report.probes.app.referer) : 'unobserved',
    `${appOrigin}/`
  );
  check('widget probe request observed by embedder', String(report.probes.widget.received), 'true');
  check('widget probe fetch error', String(report.probes.widget.error), 'null');
  check(
    'embedded widget sent Referer',
    report.probes.widget.received ? String(report.probes.widget.referer) : 'unobserved',
    'null'
  );
  console.log(
    `NOTE embedded widget document.referrer (inherited from host page): ${JSON.stringify(report.widgetDocumentReferrer)}`
  );
}

if (results.some((r) => !r.ok)) {
  console.error('\nRESULT: FAIL');
  process.exit(1);
}
console.log('\nRESULT: PASS');

async function runEmbeddingCheck() {
  const widgetFrameUrl = `${appOrigin}/widget/ribbon/${widgetToken}`;
  const seen = [];
  const hostPage = `<!doctype html><html><head><meta charset="utf-8"><title>Host site</title></head><body>
<iframe id="widget" src="${widgetFrameUrl}" width="400" height="200" style="border:0"></iframe>
<iframe id="app" src="${appFrameUrl}" width="400" height="200" style="border:0"></iframe>
</body></html>`;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', embedOrigin);
    if (url.pathname === '/log') {
      seen.push({ from: url.searchParams.get('from'), referer: req.headers.referer ?? null });
      res.writeHead(204, { 'access-control-allow-origin': '*' }).end();
      return;
    }
    if (url.pathname === '/logs') {
      res.writeHead(200, { 'access-control-allow-origin': '*', 'content-type': 'application/json' });
      res.end(JSON.stringify(seen));
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(hostPage);
  });
  await new Promise((resolve) => server.listen(embedPort, '0.0.0.0', resolve));

  try {
    const dependencies = process.env.QA_DEPENDENCIES || '/tmp/opinio-qa/node_modules';
    const requireQA = createRequire(path.join(dependencies, 'package.json'));
    const { chromium } = requireQA('playwright');
    const browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH || undefined,
      headless: true,
    });
    const page = await browser.newPage();
    const console_ = [];
    const responses = [];
    page.on('console', (m) => console_.push({ type: m.type(), text: m.text() }));
    page.on('pageerror', (e) => console_.push({ type: 'pageerror', text: e.message }));
    page.on('response', (r) => responses.push({ url: r.url(), status: r.status() }));

    await page.goto(`${embedOrigin}/`, { waitUntil: 'load' });
    await page.waitForTimeout(4000);

    const iframes = [];
    for (const id of ['widget', 'app']) {
      const handle = await page.$(`#${id}`);
      const frame = handle ? await handle.contentFrame() : null;
      const renderedText = frame ? await frame.locator('body').innerText({ timeout: 3000 }).catch(() => null) : null;
      iframes.push({ id, target: await handle?.getAttribute('src'), childFrameExists: Boolean(frame), renderedText });
    }

    const widgetHandle = await page.$('#widget');
    const widgetFrame = widgetHandle ? await widgetHandle.contentFrame() : null;

    // --- embedded widget surface (public DOM + response), no pinned copy ---
    const documentStatus = responses.filter((r) => r.url === widgetFrameUrl).map((r) => r.status).pop() ?? null;
    const passportHref = widgetFrame
      ? await widgetFrame.locator('a[href^="/b/"]').first().getAttribute('href').catch(() => null)
      : null;
    const passportSlug = passportHref ? new URL(passportHref, appOrigin).pathname.replace(/^\/b\//, '') : null;
    const surfaceLabel = widgetFrame
      ? ((await widgetFrame.locator('a[aria-label]').first().getAttribute('aria-label').catch(() => null)) ?? '')
      : '';
    const surfaceHeading = widgetFrame
      ? await widgetFrame.locator('h1').first().innerText({ timeout: 2000 }).catch(() => null)
      : null;
    let brandName = null;
    if (passportSlug) {
      const api = await fetch(`${appOrigin}/api/v1/businesses/${passportSlug}`);
      if (api.ok) brandName = (await api.json())?.business?.brand_name ?? null;
    }
    const widgetText = iframes.find((f) => f.id === 'widget')?.renderedText ?? null;
    const widgetSurface = {
      documentStatus,
      passportHref,
      passportSlug,
      brandName,
      surfaceLabel,
      brandMatches: Boolean(brandName) && (surfaceLabel.includes(brandName) || surfaceHeading === brandName),
      urlHasToken: Boolean(widgetToken) && (widgetFrame?.url() ?? '').includes(widgetToken),
      rendered: Boolean(widgetText && !/refused to connect|no se puede acceder|can’t be reached|err_/i.test(widgetText)),
    };

    // --- referrer scope probes: failures must surface, never pass silently ---
    const probeErrors = {};
    const runProbe = async (frame, from) => {
      try {
        return await frame.evaluate(
          async ({ origin, name }) => {
            try {
              await fetch(`${origin}/log?from=${name}`, { mode: 'no-cors' });
              return null;
            } catch (error) {
              return String((error && error.message) || error);
            }
          },
          { origin: embedOrigin, name: from }
        );
      } catch (error) {
        return String((error && error.message) || error);
      }
    };

    // app surface page: navigate with sensitive query data, then probe cross-origin.
    await page.goto(`${appOrigin}/verificar?folio=secret-probe-11&token=secret-probe-11`, { waitUntil: 'domcontentloaded' });
    probeErrors.app_top_level = await runProbe(page, 'app_top_level');

    await page.goto(`${embedOrigin}/`, { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    const secondWidgetHandle = await page.$('#widget');
    const secondWidgetFrame = secondWidgetHandle ? await secondWidgetHandle.contentFrame() : null;
    probeErrors.widget_frame = secondWidgetFrame
      ? await runProbe(secondWidgetFrame, 'widget_frame')
      : 'widget frame missing: cannot probe';
    const widgetDocumentReferrer = secondWidgetFrame
      ? await secondWidgetFrame.evaluate(() => document.referrer).catch(() => null)
      : null;

    const logs = await (await fetch(`${embedOrigin}/logs`)).json();
    const toProbe = (from, label) => {
      const record = logs.find((l) => l.from === from) ?? null;
      return {
        from: label,
        received: Boolean(record),
        referer: record ? record.referer : null,
        error: probeErrors[from] ?? null,
      };
    };

    await browser.close();

    const violations = console_.filter((m) => /frame-ancestors/i.test(m.text));
    const appText = iframes.find((f) => f.id === 'app')?.renderedText || '';
    return {
      iframes,
      violations,
      widget: widgetSurface,
      widgetDocumentReferrer,
      appRefused:
        (violations.length > 0 && !/Para negocios|opinio\.mx/i.test(appText)) ||
        /refused to connect|no se puede acceder|can’t be reached/i.test(appText),
      probes: {
        app: toProbe('app_top_level', 'app_top_level'),
        widget: toProbe('widget_frame', 'widget_frame'),
      },
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
