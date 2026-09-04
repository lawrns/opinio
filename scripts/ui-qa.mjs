/**
 * Real-browser, read-only UI audit. Install tools outside the application:
 * npm install --prefix /tmp/opinio-qa playwright axe-core lighthouse
 * BASE_URL=http://localhost:3006 node scripts/ui-qa.mjs
 * Set QA_ROUTES=/,/verificar, QA_TAG=final, QA_JOURNEYS=0, QA_DEVICES=mobile,
 * QA_DEPENDENCIES=/tmp/opinio-qa/node_modules or CHROME_PATH as needed.
 * Every non-GET/HEAD browser request is intercepted; no form writes reach the app.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const dependencies = process.env.QA_DEPENDENCIES || '/tmp/opinio-qa/node_modules';
const requireQA = createRequire(path.join(dependencies, 'package.json'));
const { chromium } = requireQA('playwright');
const base = process.env.BASE_URL || 'http://localhost:3006';
const tag = process.env.QA_TAG || 'final';
const output = process.env.QA_OUTPUT || `/tmp/opinio-qa/${tag}`;
const routes = process.env.QA_ROUTES?.split(',') || ['/', '/verificar', '/b/luuna', '/escribir-opinion/luuna', '/caso/nuevo?b=luuna', '/merchant', '/merchant/reviews', '/merchant/requests', '/merchant/inbox', '/merchant/widgets', '/merchant/integrations', '/merchant/insights', '/merchant/settings', '/caso/1', '/widget/badge/wgt_luuna_badge_2026', '/widget/card/wgt_luuna_card_2026', '/widget/reassurance/wgt_luuna_reassurance_2026', '/widget/card/wgt_luuna_card_2026?theme=dark', '/widget/badge/invalid-token-qa', '/pagina-que-no-existe'];
const sizes = { desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } };
const devices = process.env.QA_DEVICES?.split(',') || Object.keys(sizes);
const report = { base, generatedAt: new Date().toISOString(), mode: 'All mutations intercepted', routes: [], journeys: [], blockedWrites: [] };
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
async function save() { await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2)); }
async function contextFor(viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce', locale: 'es-MX', timezoneId: 'America/Mexico_City' });
  await context.route('**/*', async (route) => {
    const request = route.request();
    if (!['GET', 'HEAD'].includes(request.method())) {
      report.blockedWrites.push({ method: request.method(), path: new URL(request.url()).pathname });
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'QA: escritura interceptada' }) });
    } else await route.continue();
  });
  return context;
}
async function goto(page, route) {
  const response = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.locator('[aria-busy="true"]').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  return response;
}
for (const device of devices) {
  const context = await contextFor(sizes[device]);
  for (const route of routes) {
    const page = await context.newPage();
    const errors = [];
    const failed = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && new URL(response.url()).origin === new URL(base).origin) failed.push({ path: new URL(response.url()).pathname, status: response.status() }); });
    const name = route === '/' ? 'home' : route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
    try {
      const response = await goto(page, route);
      await page.screenshot({ path: path.join(output, `${device}-${name}.png`), fullPage: true });
      if (route === '/') await page.screenshot({ path: path.join(output, `${device}-home-viewport.png`) });
      await page.addScriptTag({ path: path.join(dependencies, 'axe-core/axe.min.js') });
      const audit = await page.evaluate(async () => {
        const results = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
        const visible = element => element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0;
        return {
          title: document.title,
          h1: [...document.querySelectorAll('h1')].map(element => element.textContent),
          width: { viewport: innerWidth, document: document.documentElement.scrollWidth },
          overflowing: [...document.querySelectorAll('main *')].filter(visible).filter(element => element.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(element).position !== 'absolute').slice(0, 10).map(element => ({ tag: element.tagName, className: element.className, text: element.textContent?.slice(0, 100) })),
          violations: results.violations.map(violation => ({ id: violation.id, impact: violation.impact, help: violation.help, nodes: violation.nodes.map(node => ({ target: node.target, summary: node.failureSummary, html: node.html })) })),
          links: [...document.querySelectorAll('a[href]')].map(element => ({ text: element.textContent.trim(), href: element.getAttribute('href') })),
          metrics: performance.getEntriesByType('navigation').map(entry => ({ domContentLoaded: entry.domContentLoadedEventEnd, load: entry.loadEventEnd, transferSize: entry.transferSize }))
        };
      });
      const expectedStatus = route === '/pagina-que-no-existe' || route.includes('invalid-token-qa') ? 404 : 200;
      const row = { device, route, status: response.status(), expectedStatus, errors, failed, ...audit };
      report.routes.push(row);
      console.log(JSON.stringify({ device, route, status: row.status, overflow: row.width.document > row.width.viewport, violations: row.violations.map(violation => `${violation.id}:${violation.nodes.length}`), errors, failed }));
    } catch (error) { report.routes.push({ device, route, error: String(error) }); console.log(JSON.stringify({ device, route, error: String(error) })); }
    await save();
    await page.close();
  }
  await context.close();
}
async function journey(name, test, viewport = sizes.mobile) {
  const context = await contextFor(viewport);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  try { await test(page, context); report.journeys.push({ name, pass: true }); }
  catch (error) { report.journeys.push({ name, pass: false, error: String(error) }); await page.screenshot({ path: path.join(output, `failed-${name}.png`), fullPage: true }).catch(() => {}); }
  console.log(JSON.stringify(report.journeys.at(-1)));
  await save();
  await context.close();
}
if (process.env.QA_JOURNEYS !== '0') {
  await journey('mobile-menu-keyboard', async page => {
    await goto(page, '/');
    const trigger = page.getByRole('button', { name: 'Abrir menú', exact: true });
    await trigger.click();
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(await trigger.evaluate(element => document.activeElement === element), true);
  });
  await journey('home-search-keyboard', async page => {
    await goto(page, '/');
    const search = page.getByRole('combobox');
    await search.fill('Luuna');
    await page.getByRole('option').filter({ hasText: 'Luuna' }).waitFor();
    await search.press('ArrowDown');
    assert.ok(await search.getAttribute('aria-activedescendant'));
    await search.press('Enter');
    await page.waitForURL('**/b/luuna');
    await page.getByRole('heading', { level: 1 }).waitFor();
  });
  await journey('directory-filters-empty-error-retry', async page => {
    await goto(page, '/verificar?categoria=Hogar');
    assert.equal(await page.getByRole('button', { name: 'Hogar', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.getByLabel('Nombre, sitio web, RFC o teléfono').fill('qa-no-coincidencia-74918');
    await page.getByText('0 negocios encontrados', { exact: true }).waitFor();
    assert.ok(new URL(page.url()).searchParams.get('q')?.includes('qa-no-coincidencia'));
    let fail = true;
    await page.route('**/api/v1/search?**', async route => fail ? route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }) : route.continue());
    await page.getByLabel('Nombre, sitio web, RFC o teléfono').fill('Luuna');
    await page.getByRole('heading', { name: 'No pudimos cargar los negocios' }).waitFor();
    fail = false;
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await page.getByRole('heading', { name: 'Luuna', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
    await page.getByRole('navigation', { name: 'Navegación móvil' }).getByRole('link', { name: 'Explorar comercios' }).click();
    await page.waitForURL('**/verificar');
    assert.equal(await page.getByLabel('Nombre, sitio web, RFC o teléfono').inputValue(), '');
    assert.equal(await page.getByRole('button', { name: 'Todos', exact: true }).getAttribute('aria-pressed'), 'true');
  });
  await journey('review-validation-error-retry', async page => {
    await goto(page, '/escribir-opinion/luuna');
    await page.getByRole('button', { name: 'Revisar mi opinión' }).click();
    assert.equal(await page.getByRole('heading', { name: 'Así se verá tu opinión' }).count(), 0);
    await page.getByRole('radio', { name: /5.*Excelente/ }).check();
    await page.getByLabel('Cuéntanos qué pasó').fill('Compré un producto y recibí una atención clara durante la entrega.');
    await page.getByRole('button', { name: 'Revisar mi opinión' }).click();
    await page.getByRole('heading', { name: 'Así se verá tu opinión' }).waitFor();
    await page.getByLabel('Nombre o alias público').fill('Persona de prueba');
    await page.getByRole('checkbox').check();
    let attempt = 0;
    await page.route('**/api/v1/reviews', async route => {
      assert.equal(route.request().method(), 'POST');
      const data = route.request().postDataJSON();
      assert.equal(data.verification_level, 'unverified_experience');
      assert.equal(data.rating, 5);
      attempt += 1;
      report.blockedWrites.push({ method: 'POST', path: '/api/v1/reviews', mocked: true });
      await route.fulfill({ status: attempt === 1 ? 503 : 201, contentType: 'application/json', body: JSON.stringify({ success: attempt > 1 }) });
    });
    await page.getByRole('button', { name: 'Publicar opinión', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Tu texto sigue aquí' }).waitFor();
    assert.equal(await page.getByLabel('Nombre o alias público').inputValue(), 'Persona de prueba');
    await page.getByRole('button', { name: 'Publicar opinión', exact: true }).click();
    await page.getByRole('heading', { name: 'Tu opinión se publicó', exact: true }).waitFor();
    assert.equal(attempt, 2);
  });
  await journey('case-form-prefill-error-retention', async page => {
    await goto(page, '/caso/nuevo?b=luuna');
    const business = page.locator('select').first();
    await page.waitForFunction(() => document.querySelector('select')?.selectedOptions[0]?.textContent.includes('Luuna'));
    assert.ok((await business.locator('option:checked').textContent()).includes('Luuna'));
    await page.getByLabel(/Nombre completo/i).fill('Persona QA');
    await page.getByLabel(/Correo o WhatsApp/i).fill('prueba@example.com');
    await page.locator('textarea').fill('El pedido llegó incompleto y solicito una aclaración sobre los artículos pendientes.');
    let attempts = 0;
    await page.route('**/api/v1/cases', async route => { attempts += 1; report.blockedWrites.push({ method: 'POST', path: '/api/v1/cases', mocked: true }); await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'No se pudo abrir el caso de prueba.' }) }); });
    await page.getByRole('button', { name: /Abrir caso/i }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(attempts, 1);
    assert.equal(await page.getByLabel(/Nombre completo/i).inputValue(), 'Persona QA');
    assert.ok((await page.locator('textarea').inputValue()).includes('pedido llegó incompleto'));
  });
  await journey('merchant-navigation-invite-dialog', async page => {
    await goto(page, '/merchant/requests?business=luuna');
    const open = page.getByRole('button', { name: 'Crear invitación', exact: true });
    await open.click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    await page.getByRole('radio', { name: 'Correo', exact: true }).check();
    assert.equal(await page.getByLabel('Correo del cliente').getAttribute('type'), 'email');
    await page.keyboard.press('Escape');
    assert.equal(await dialog.isVisible(), false);
    assert.equal(await open.evaluate(element => document.activeElement === element), true);
  });
}
await browser.close();
await save();
const failureCount = report.routes.filter(row => row.error || row.status !== row.expectedStatus || row.errors?.length || row.violations?.length || row.width?.document > row.width?.viewport || row.failed?.some(request => request.status >= 400 && request.path !== '/pagina-que-no-existe' && !request.path.includes('invalid-token-qa'))).length + report.journeys.filter(row => !row.pass).length;
console.log(JSON.stringify({ summary: { routes: report.routes.length, journeys: report.journeys.length, failures: failureCount, blockedWrites: report.blockedWrites.length }, output }));
process.exitCode = failureCount ? 1 : 0;
