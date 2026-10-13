/**
 * Real-browser, read-only regression for public image layout and loading (#9 / JEV-021).
 *
 * Verifies, on a live server, that public brand images:
 *  1. keep the exact same geometry while their image request is blocked and after it
 *     loads (a stable reserved box, measured on the real rendered container);
 *  2. preserve each logo's aspect ratio and stay inside the existing container inset;
 *  3. use loading behavior appropriate to placement: offscreen catalogue images are
 *     lazy/async and are not fetched while at scroll top; first-viewport identity
 *     images are eager (fetchpriority high).
 * It also records layout-shift entries whose source is a logo image, so shifts are
 * observed in a real browser instead of inferred from missing width/height attributes.
 *
 * Install tools outside the application (same convention as scripts/ui-qa.mjs):
 *   npm install --prefix /tmp/opinio-qa playwright
 * Run against a live dev/prod server:
 *   BASE_URL=http://127.0.0.1:3209 node scripts/seo-image-layout-check.mjs
 *
 * Env: CHECK_DEPENDENCIES, CHROME_PATH, CHECK_DEVICES=desktop,mobile,
 *      CHECK_ROUTES=/custom,/b/slug, CHECK_OUTPUT=/tmp/opinio-image-layout
 * Every non-GET/HEAD request is blocked; the script never mutates application data.
 */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

const dependencies = process.env.CHECK_DEPENDENCIES || '/tmp/opinio-qa/node_modules';
const requireQA = createRequire(path.join(dependencies, 'package.json'));
const { chromium } = requireQA('playwright');

const base = (process.env.BASE_URL || 'http://127.0.0.1:3209').replace(/\/$/, '');
const output = process.env.CHECK_OUTPUT || path.join('/tmp/opinio-image-layout', String(Date.now()));
const sizes = { desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } };
const devices = (process.env.CHECK_DEVICES || 'desktop,mobile').split(',');
const logoImgSelector = 'img[src^="/logos/"], img[src*="/_next/image"]';
const geometryTolerance = 0.6;

function resolveChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

const report = {
  base,
  generatedAt: new Date().toISOString(),
  mode: 'read-only: non-GET/HEAD blocked; image requests blocked then replayed in place',
  routes: [],
  failures: [],
};

await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(resolveChrome() ? { executablePath: resolveChrome() } : {}),
});

function fail(routeKey, message, detail) {
  report.failures.push({ route: routeKey, message, detail });
}

function trackImages(page, selector) {
  return page.evaluate((sel) => {
    const paintedRect = (img) => {
      const rect = img.getBoundingClientRect();
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      if (!nw || !nh || !rect.width || !rect.height) return null;
      const fit = getComputedStyle(img).objectFit;
      if (fit !== 'contain' && fit !== 'scale-down') return rect;
      const contained = Math.min(rect.width / nw, rect.height / nh);
      const scale = fit === 'scale-down' ? Math.min(1, contained) : contained;
      const width = nw * scale;
      const height = nh * scale;
      return {
        x: rect.x + (rect.width - width) / 2,
        y: rect.y + (rect.height - height) / 2,
        width,
        height,
      };
    };
    const round = (value) => Math.round(value * 100) / 100;
    const rectOf = (rect) => (rect ? { x: round(rect.x), y: round(rect.y), w: round(rect.width), h: round(rect.height) } : null);
    return Array.from(document.querySelectorAll(sel)).map((img, index) => {
      const box = img.parentElement ? img.parentElement.getBoundingClientRect() : null;
      return {
        index,
        src: img.getAttribute('src'),
        loading: img.getAttribute('loading'),
        decoding: img.getAttribute('decoding'),
        fetchpriority: img.getAttribute('fetchpriority'),
        objectFit: getComputedStyle(img).objectFit,
        complete: img.complete,
        natural: img.naturalWidth && img.naturalHeight ? { w: img.naturalWidth, h: img.naturalHeight } : null,
        rect: rectOf(img.getBoundingClientRect()),
        painted: rectOf(paintedRect(img)),
        containerTag: img.parentElement ? img.parentElement.tagName : null,
        container: rectOf(box),
      };
    });
  }, selector);
}

async function geometryRun(page, cdp, route) {
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: ['*/logos/*', '*/_next/image*'] });
  await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const blocked = await trackImages(page, logoImgSelector);

  await cdp.send('Network.setBlockedURLs', { urls: [] });
  await page.evaluate((sel) => {
    for (const img of document.querySelectorAll(sel)) {
      const src = img.getAttribute('src');
      if (!src) continue;
      img.setAttribute('loading', 'eager');
      img.removeAttribute('src');
      img.src = src;
    }
  }, logoImgSelector);
  await page
    .waitForFunction((sel) => Array.from(document.querySelectorAll(sel)).every((img) => img.complete), logoImgSelector, { timeout: 60000 })
    .catch(() => {});
  await page.evaluate(() => Promise.all(Array.from(document.images).map((img) => img.decode?.().catch(() => undefined) ?? Promise.resolve()))).catch(() => {});
  await page.waitForTimeout(500);
  const loaded = await trackImages(page, logoImgSelector);
  const shifts = await page.evaluate(() => window.__opShifts || []);
  return { blocked, loaded, shifts };
}

async function loadingRun(page, route) {
  const imageRequests = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'image') imageRequests.push(request.url());
  });
  await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  const images = await page.evaluate((sel) => {
    const round = (value) => Math.round(value * 100) / 100;
    return Array.from(document.querySelectorAll(sel)).map((img, index) => {
      const rect = img.getBoundingClientRect();
      return {
        index,
        src: img.getAttribute('src'),
        loading: img.getAttribute('loading'),
        decoding: img.getAttribute('decoding'),
        fetchpriority: img.getAttribute('fetchpriority'),
        inViewport: rect.top < window.innerHeight,
        top: round(rect.top + window.scrollY),
      };
    });
  }, logoImgSelector);
  const lcp = await page.evaluate(() => {
    if (window.__opLcp) return window.__opLcp;
    const entries = performance.getEntriesByType('largest-contentful-paint');
    const last = entries[entries.length - 1];
    return last ? { startTime: Math.round(last.startTime), size: last.size, url: last.url || null, tag: last.element ? last.element.tagName : null, src: last.element && (last.element.currentSrc || last.element.src) || null } : null;
  });
  const resourceTiming = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const responseStart = navigation ? navigation.responseStart : 0;
    const logos = performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/logos/') || entry.name.includes('/_next/image'));
    const offsets = logos.map((entry) => Math.round(entry.startTime - responseStart)).sort((a, b) => a - b);
    return { count: logos.length, earliestMsAfterResponseStart: offsets.slice(0, 3), earliestMs: offsets[0] ?? null };
  });
  return { images, imageRequests: imageRequests.filter((url) => url.includes('/logos/') || url.includes('/_next/image')), lcp, resourceTiming };
}

function compareGeometry(routeKey, { blocked, loaded, shifts }) {
  const key = (entry) => `${entry.index}:${entry.src}`;
  const unpaired = [];
  for (const before of blocked) {
    const after = loaded.find((entry) => key(entry) === key(before));
    if (!after) {
      unpaired.push(key(before));
      continue;
    }
    for (const field of ['rect', 'container']) {
      const a = before[field];
      const b = after[field];
      if (!a || !b) {
        fail(routeKey, `${field} missing in a measurement state`, { src: before.src, index: before.index, blocked: a, loaded: b });
        continue;
      }
      const delta = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w), Math.abs(a.h - b.h));
      if (delta > geometryTolerance) {
        fail(routeKey, `${field} moved ${delta.toFixed(2)}px between blocked and loaded states`, { src: before.src, index: before.index, blocked: a, loaded: b });
      }
    }
    if (!before.rect || before.rect.w <= 0 || before.rect.h <= 0) {
      fail(routeKey, 'logo image reserves no layout space while its request is blocked/slow', { src: before.src, index: before.index, blockedRect: before.rect });
    }
    if (before.painted && after.painted) {
      const delta = Math.max(Math.abs(before.painted.x - after.painted.x), Math.abs(before.painted.y - after.painted.y), Math.abs(before.painted.w - after.painted.w), Math.abs(before.painted.h - after.painted.h));
      if (delta > geometryTolerance) {
        fail(routeKey, `painted logo moved ${delta.toFixed(2)}px between blocked and loaded states`, { src: before.src, index: before.index, blocked: before.painted, loaded: after.painted });
      }
    }
    const paintedRatio = after.painted ? after.painted.w / after.painted.h : null;
    const naturalRatio = after.natural ? after.natural.w / after.natural.h : null;
    if (paintedRatio && naturalRatio && Math.abs(paintedRatio - naturalRatio) > 0.01) {
      fail(routeKey, `aspect ratio not preserved (painted ${paintedRatio.toFixed(3)} vs natural ${naturalRatio.toFixed(3)})`, { src: after.src, index: after.index });
    }
    if (after.painted && after.container) {
      const maxW = after.container.w * 0.83 + 2;
      const maxH = after.container.h * 0.83 + 2;
      if (after.painted.w > maxW || after.painted.h > maxH) {
        fail(routeKey, 'painted logo exceeds the existing container inset', { src: after.src, index: after.index, painted: after.painted, container: after.container });
      }
    }
  }
  const logoShifts = shifts.filter((entry) => (entry.sources || []).some((source) => (source.src || '').includes('/logos/') || (source.tag === 'IMG' && source.className && String(source.className).includes('object-scale'))));
  if (logoShifts.length) {
    fail(routeKey, 'layout-shift entries sourced from logo images', logoShifts);
  }
  return {
    images: loaded.length,
    blockedWithoutPair: unpaired,
    layoutShiftEntries: shifts.length,
    logoLayoutShifts: logoShifts.length,
    shiftValue: Number(shifts.reduce((sum, entry) => sum + entry.value, 0).toFixed(4)),
    shiftEntries: shifts.slice(0, 20),
    paintedStats: paintedStats(loaded),
    samples: loaded.slice(0, 12).map((entry) => ({ src: entry.src, painted: entry.painted, rect: entry.rect, natural: entry.natural })),
  };
}

function paintedStats(loaded) {
  const round = (value) => Math.round(value * 100) / 100;
  const painted = loaded.map((entry) => entry.painted).filter(Boolean);
  const deviations = loaded
    .filter((entry) => entry.painted && entry.natural)
    .map((entry) => Math.abs(entry.painted.w / entry.painted.h - entry.natural.w / entry.natural.h));
  if (!painted.length) return { count: 0 };
  const widths = painted.map((rect) => rect.w);
  const heights = painted.map((rect) => rect.h);
  return {
    count: painted.length,
    minW: round(Math.min(...widths)),
    maxW: round(Math.max(...widths)),
    meanW: round(widths.reduce((sum, value) => sum + value, 0) / widths.length),
    minH: round(Math.min(...heights)),
    maxH: round(Math.max(...heights)),
    meanH: round(heights.reduce((sum, value) => sum + value, 0) / heights.length),
    maxRatioDeviation: round(deviations.length ? Math.max(...deviations) : 0),
  };
}

function checkLoading(routeKey, { images, imageRequests, lcp, resourceTiming }, { requireEagerInViewport }) {
  const lazyFailures = [];
  const decodingFailures = [];
  const eagerFailures = [];
  for (const image of images) {
    if (image.loading !== 'lazy' && image.loading !== 'eager') lazyFailures.push({ index: image.index, src: image.src, loading: image.loading });
    if (image.decoding !== 'async') decodingFailures.push({ index: image.index, src: image.src, decoding: image.decoding });
    if (!image.inViewport && image.loading === 'eager') lazyFailures.push({ index: image.index, src: image.src, loading: image.loading, reason: 'offscreen eager' });
  }
  if (requireEagerInViewport && images.length) {
    const visible = images.filter((image) => image.inViewport);
    for (const image of visible) {
      const eager = image.loading === 'eager' || (image.fetchpriority || '').toLowerCase() === 'high';
      if (!eager) eagerFailures.push({ index: image.index, src: image.src, loading: image.loading, fetchpriority: image.fetchpriority, reason: 'first-viewport identity image is not eager/high' });
    }
  }
  if (lazyFailures.length) fail(routeKey, 'logo images with inappropriate loading behavior', lazyFailures);
  if (decodingFailures.length) fail(routeKey, 'logo images without async decoding', decodingFailures);
  if (eagerFailures.length) fail(routeKey, 'first-viewport logo image missing eager/high priority', eagerFailures);

  const offscreen = images.filter((image) => image.top > 3000);
  const offscreenUrls = new Set(offscreen.map((image) => new URL(image.src, base).href));
  const fetchedOffscreen = imageRequests.filter((url) => offscreenUrls.has(url));
  if (fetchedOffscreen.length) {
    fail(routeKey, `${fetchedOffscreen.length} offscreen (>3000px) logo images were fetched while at scroll top`, fetchedOffscreen.slice(0, 5));
  }
  return { images: images.length, imageRequests: imageRequests.length, offscreenBeyond3000px: offscreen.length, offscreenFetchedAtScrollTop: fetchedOffscreen.length, visible: images.filter((image) => image.inViewport).length, lcp, resourceTiming };
}

async function discoverRoutes() {
  if (process.env.CHECK_ROUTES) return process.env.CHECK_ROUTES.split(',');
  const context = await browser.newContext({ viewport: sizes.desktop, locale: 'es-MX' });
  const page = await context.newPage();
  await page.goto(`${base}/directorio`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  const passports = await page.$$eval('a[href^="/b/"]', (links) => links.slice(0, 2).map((link) => link.getAttribute('href')));
  await context.close();
  return ['/', '/directorio', ...passports];
}

try {
  const routes = await discoverRoutes();
  console.log(`[image-layout-check] ${base} routes=${routes.join(', ')}`);
  for (const device of devices) {
    const size = sizes[device];
    if (!size) throw new Error(`Unknown device: ${device}`);
    const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, locale: 'es-MX', timezoneId: 'America/Mexico_City' });
    await context.route('**/*', async (route) => {
      const request = route.request();
      if (['GET', 'HEAD'].includes(request.method())) await route.continue();
      else await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'image-layout-check: write blocked' }) });
    });
    for (const route of routes) {
      const routeKey = `${device}:${route}`;
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.__opShifts = [];
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.hadRecentInput) continue;
            window.__opShifts.push({
              value: entry.value,
              sources: (entry.sources || []).map((source) => ({
                tag: source.node && source.node.tagName ? source.node.tagName : null,
                src: (source.node && (source.node.currentSrc || source.node.src)) || null,
                className: source.node && source.node.className ? String(source.node.className).slice(0, 120) : null,
              })),
            });
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
        window.__opLcp = null;
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__opLcp = {
                startTime: Math.round(entry.startTime),
                size: entry.size,
                url: entry.url || null,
                tag: entry.element && entry.element.tagName ? entry.element.tagName : null,
                src: (entry.element && (entry.element.currentSrc || entry.element.src)) || null,
              };
            }
          });
          lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch {
          window.__opLcp = null;
        }
      });
      try {
        const cdp = await context.newCDPSession(page);
        const routeReport = { device, route };
        const geometry = await geometryRun(page, cdp, route);
        routeReport.geometry = compareGeometry(routeKey, geometry);
        if (process.env.CHECK_FINGERPRINT) {
          await fs.mkdir(process.env.CHECK_FINGERPRINT, { recursive: true });
          await fs.writeFile(
            path.join(process.env.CHECK_FINGERPRINT, `${device}-${route.replace(/[^\w-]/g, '_')}.json`),
            JSON.stringify(geometry.loaded.map(({ src, natural, painted, rect }) => ({ src, natural, painted, rect })), null, 1)
          );
        }
        await page.screenshot({ path: path.join(output, `${device}-${route.replace(/[^\w-]/g, '_')}.png`) });
        routeReport.loading = checkLoading(routeKey, await loadingRun(page, route), { requireEagerInViewport: route.startsWith('/b/') });
        if (process.env.CHECK_ELEMENT_SCREENSHOTS && route === '/directorio') {
          for (const src of process.env.CHECK_ELEMENT_SCREENSHOTS.split(',')) {
            const image = page.locator(`img[src="${src}"]`).first();
            if ((await image.count()) === 0) continue;
            await image.scrollIntoViewIfNeeded();
            await image.evaluate((element) => (element.decode ? element.decode().catch(() => undefined) : Promise.resolve())).catch(() => {});
            await page.waitForTimeout(200);
            const card = image.locator('xpath=ancestor::a[1]');
            const cardPath = path.join(output, `${device}-card-${path.basename(src).replace(/\.\w+$/, '')}.png`);
            if (await card.count()) await card.screenshot({ path: cardPath });
            routeReport.elementShots = routeReport.elementShots ?? [];
            routeReport.elementShots.push({
              src,
              card: cardPath,
              imgBox: await image.boundingBox(),
              imgAttrs: await image.evaluate((element) => ({ loading: element.getAttribute('loading'), decoding: element.getAttribute('decoding'), natural: [element.naturalWidth, element.naturalHeight], className: element.getAttribute('class') })),
            });
            console.log(`[image-layout-check] card shot ${src} box=${JSON.stringify(routeReport.elementShots[routeReport.elementShots.length - 1].imgBox)}`);
          }
        }
        report.routes.push(routeReport);
        console.log(`[image-layout-check] ${routeKey} images=${routeReport.loading.images} requests=${routeReport.loading.imageRequests} offscreenFetched=${routeReport.loading.offscreenFetchedAtScrollTop} logoShifts=${routeReport.geometry.logoLayoutShifts} lcp=${routeReport.loading.lcp ? `${routeReport.loading.lcp.tag}:${routeReport.loading.lcp.src || ''}` : 'null'} earliestLogoMs=${routeReport.loading.resourceTiming.earliestMs}`);
      } catch (error) {
        fail(routeKey, `route check crashed: ${error.message}`, error.stack ? error.stack.split('\n').slice(0, 3) : undefined);
      } finally {
        await page.close();
      }
    }
    await context.close();
  }
} finally {
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2));
  await browser.close();
}

console.log(`[image-layout-check] failures=${report.failures.length} output=${output}`);
if (report.failures.length) {
  console.error(JSON.stringify(report.failures.slice(0, 10), null, 2));
  process.exitCode = 1;
}
