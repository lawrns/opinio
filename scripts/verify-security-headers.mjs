#!/usr/bin/env node
/**
 * Runtime check for the response policies from issue #11 (finding JEV-019):
 * route-appropriate `Referrer-Policy` + `Content-Security-Policy frame-ancestors`.
 *
 * Headers only (any Node 18+ runtime, no dependencies):
 *   BASE_URL=http://127.0.0.1:3211 node scripts/verify-security-headers.mjs
 *
 * Header policy + real cross-origin framing decision in Chrome (external deps,
 * same convention as scripts/ui-qa.mjs):
 *   npm install --prefix /tmp/opinio-qa playwright
 *   BASE_URL=http://127.0.0.1:3211 WIDGET_TOKEN=wgt_example_ribbon_2026 \
 *   QA_DEPENDENCIES=/tmp/opinio-qa/node_modules CHROME_PATH="/path/to/chrome" \
 *   node scripts/verify-security-headers.mjs --embed
 *
 * Read-only: GET/HEAD only, no writes to the application database.
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

async function responseHeaders(route) {
  const res = await fetch(base + route, { redirect: 'manual' });
  await res.arrayBuffer().catch(() => {});
  return { status: res.status, headers: res.headers };
}

async function assertPolicy(route, expected, { requireOkStatus }) {
  const { status, headers } = await responseHeaders(route);
  if (requireOkStatus && !(status >= 200 && status < 400)) {
    check(`${route} status`, String(status), '2xx/3xx');
    return;
  }
  check(`${route} Referrer-Policy`, headers.get('referrer-policy'), expected.referrerPolicy);
  check(`${route} CSP frame-ancestors`, frameAncestors(headers.get('content-security-policy')), expected.frameAncestors);
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

let embedReport = null;
if (embed) embedReport = await runEmbeddingCheck();

const failed = results.filter((r) => !r.ok);

console.log(`\n${results.length - failed.length}/${results.length} assertions passed`);
if (embedReport) {
  console.log('\n## Cross-origin framing (real browser)');
  for (const frame of embedReport.iframes) {
    console.log(
      `FRAME ${frame.id} -> ${frame.target} | handle: ${frame.childFrameExists ? 'yes' : 'no'}` +
        (frame.renderedText ? ` | text: ${JSON.stringify(frame.renderedText.replace(/\s+/g, ' ').slice(0, 90))}` : '')
    );
  }
  for (const probe of embedReport.refererProbes) {
    console.log(`REFERER ${probe.from}: ${probe.referer === null ? '(none sent)' : probe.referer}`);
  }
  for (const violation of embedReport.console.filter((m) => /frame-ancestors/i.test(m.text))) {
    console.log(`CONSOLE ${violation.text}`);
  }
  const widgetFrame = embedReport.iframes.find((f) => f.id === 'widget');
  const appFrame = embedReport.iframes.find((f) => f.id === 'app');
  const violations = embedReport.console.filter((m) => /frame-ancestors/i.test(m.text));
  // A refused frame still exposes a frame handle whose body is the browser error
  // page, so judge on rendered content + the CSP violation, not on frame presence.
  const widgetRendered = Boolean(
    widgetFrame?.childFrameExists && widgetFrame.renderedText && !/refused to connect/i.test(widgetFrame.renderedText)
  );
  const appText = appFrame?.renderedText || '';
  // Red baseline renders the real console ("Para negocios"); a refused frame
  // renders the browser error page and logs a CSP frame-ancestors violation.
  const appRefused = violations.length > 0 && !/Para negocios|opinio\.mx/i.test(appText);
  const appReferer = embedReport.refererProbes.find((p) => p.from === 'app_top_level')?.referer ?? null;
  const widgetReferer = embedReport.refererProbes.find((p) => p.from === 'widget_frame')?.referer ?? null;

  console.log('');
  check('cross-origin widget frame rendered', String(widgetRendered), 'true');
  check('sensitive app frame refused cross-origin', String(appRefused), 'true');
  check('browser CSP frame-ancestors violation logged', String(violations.length > 0), 'true');
  check('cross-origin Referer (origin only, no path/query)', String(appReferer), `${appOrigin}/`);
  check('embedded widget sent Referer', String(widgetReferer), 'null');
  for (const form of embedReport.forms) {
    check(`public form surface ${form.route} controls in DOM`, String(form.controls > 0), 'true');
  }
  // document.referrer of a framed document is inherited from the embedding page
  // (host behaviour), it is not governed by the framed document's own policy.
  console.log(
    `NOTE embedded widget document.referrer (inherited from host page): ${JSON.stringify(embedReport.widgetDocumentReferrer)}`
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
    page.on('console', (m) => console_.push({ type: m.type(), text: m.text() }));
    page.on('pageerror', (e) => console_.push({ type: 'pageerror', text: e.message }));

    await page.goto(`${embedOrigin}/`, { waitUntil: 'load' });
    await page.waitForTimeout(4000);

    const iframes = [];
    for (const id of ['widget', 'app']) {
      const handle = await page.$(`#${id}`);
      const frame = handle ? await handle.contentFrame() : null;
      let renderedText = null;
      if (frame) renderedText = await frame.locator('body').innerText({ timeout: 3000 }).catch(() => null);
      iframes.push({ id, target: await handle?.getAttribute('src'), childFrameExists: Boolean(frame), renderedText });
    }

    // Probe the cross-origin referrer scope from a path WITH sensitive query data.
    await page.goto(`${appOrigin}/verificar?folio=secret-probe-11&token=secret-probe-11`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(
      (origin) => fetch(`${origin}/log?from=app_top_level`, { mode: 'no-cors' }).catch(() => {}),
      embedOrigin
    );
    await page.goto(`${embedOrigin}/`, { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    const widgetHandle = await page.$('#widget');
    let widgetDocumentReferrer = null;
    const widgetFrame = widgetHandle ? await widgetHandle.contentFrame() : null;
    if (widgetFrame) {
      await widgetFrame
        .evaluate(
          (origin) => fetch(`${origin}/log?from=widget_frame`, { mode: 'no-cors' }).catch(() => {}),
          embedOrigin
        )
        .catch(() => {});
      widgetDocumentReferrer = await widgetFrame.evaluate(() => document.referrer).catch(() => null);
    }

    // Public form surfaces must stay usable (controls present in the hydrated DOM).
    const forms = [];
    for (const route of ['/caso/nuevo', '/verificar', slug ? `/escribir-opinion/${slug}` : null].filter(Boolean)) {
      await page.goto(`${appOrigin}${route}`, { waitUntil: 'load' });
      await page.waitForTimeout(500);
      const controls = await page.locator('form, input, textarea, select').count();
      forms.push({ route, controls });
    }

    await page.waitForTimeout(500);
    await browser.close();
    return { iframes, refererProbes: seen, console: console_, widgetDocumentReferrer, forms };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
