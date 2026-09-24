import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulePath = process.env.PLAYWRIGHT_MODULE_PATH;
if (!modulePath) throw new Error('Set PLAYWRIGHT_MODULE_PATH to the installed playwright-core module.');
const { chromium } = require(modulePath);
const target = process.argv[2] ?? 'index.html';
const label = process.argv[3] ?? 'zis-standalone';
const output = resolve('prototypes/zis-review/screenshots');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:8765/${target}`, { waitUntil: 'load' });
    await page.waitForSelector('.hdr', { timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1800);
    await page.screenshot({ path: resolve(output, `${label}-${viewport.width}-top.png`) });
    await page.locator('#products').scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await page.screenshot({ path: resolve(output, `${label}-${viewport.width}-products.png`) });
    await page.locator('#gallery').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(output, `${label}-${viewport.width}-gallery.png`) });
    const galleryTiles = page.locator('.gallery-tile');
    const galleryCount = await galleryTiles.count();
    await galleryTiles.first().click();
    const initialImage = await page.locator('.gallery-stage img').getAttribute('src');
    await page.getByRole('button', { name: /תמונה הבאה|Next image/ }).click();
    const nextImage = await page.locator('.gallery-stage img').getAttribute('src');
    const thumbnailCount = await page.locator('.gallery-thumbs button').count();
    await page.locator('.gallery-thumbs button').first().click();
    const thumbnailImage = await page.locator('.gallery-stage img').getAttribute('src');
    await page.keyboard.press('Escape');
    const galleryClosed = await page.locator('.gallery-dialog').count() === 0;
    await page.locator('.footer').scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await page.screenshot({ path: resolve(output, `${label}-${viewport.width}-footer.png`) });
    const details = await page.evaluate(() => ({
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      title: document.title,
      logos: [...document.querySelectorAll('.logo img')].map(img => ({
        src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0,
      })),
      brokenImages: [...document.images].filter(img => img.complete && img.naturalWidth === 0).length,
    }));
    let menuLogoLoaded = null;
    if (await page.locator('.menu-trigger').isVisible()) {
      await page.locator('.menu-trigger').click();
      menuLogoLoaded = await page.locator('.mobile-menu .logo img').evaluate(img => img.complete && img.naturalWidth > 0);
      await page.locator('.mobile-menu-hd .icon-btn').click();
    }
    results.push({ viewport, errors, menuLogoLoaded, galleryCount, thumbnailCount,
      galleryNavigationWorks: initialImage !== nextImage && initialImage === thumbnailImage && galleryClosed,
      ...details });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(resolve(output, `${label}-checks.json`), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
if (results.some(result => result.errors.length || result.horizontalOverflow || result.brokenImages || result.logos.some(logo => !logo.loaded) || result.menuLogoLoaded === false || result.galleryCount < 5 || result.thumbnailCount !== result.galleryCount || !result.galleryNavigationWorks)) {
  process.exitCode = 1;
}
