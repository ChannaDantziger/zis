// Automated application tests only: isolated fixtures, no Production calls.
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { getQaResponse } from './qa-fixtures.mjs';

const runtimeModules = process.argv[2];
if (!runtimeModules) throw new Error('Supply the bundled Node package directory.');
const require = createRequire(resolve(runtimeModules, 'playwright/package.json'));
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const shots = resolve(root, 'tests/screenshots');
await mkdir(shots, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const results = [];
const target = 'http://zis-qa.test';
const dist = resolve(root, 'dist');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
try {
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let mode = 'open';
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      assert.equal(url.origin, target, 'test must not contact any external origin');
      if (url.pathname.startsWith('/__test/')) {
        mode = url.pathname.slice('/__test/'.length);
        await route.fulfill({ status: 302, headers: { Location: '/' } }); return;
      }
      if (url.pathname.startsWith('/api/')) {
        const result = getQaResponse(url, mode);
        await route.fulfill({ status: result.status, contentType: 'application/json', body: JSON.stringify(result.body) }); return;
      }
      let path = resolve(dist, `.${decodeURIComponent(url.pathname)}`);
      assert(path === dist || path.startsWith(`${dist}${sep}`), 'test assets stay within dist');
      if (!extname(path)) path = resolve(dist, 'index.html');
      await route.fulfill({ contentType: mime[extname(path)], body: await readFile(path) });
    });
    await page.goto(`${target}/`);
    await page.getByRole('heading', { name: 'הקטלוג שלנו' }).waitFor();
    await page.getByRole('link', { name: 'מוצר בדיקה 1, פרטים מלאים', exact: true }).waitFor();
    assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow ${width}`);
    await page.screenshot({ path: resolve(shots, `home-${width}.png`) });
    await page.getByRole('link', { name: 'מוצר בדיקה 1, פרטים מלאים', exact: true }).click();
    await page.getByRole('button', { name: 'הוספה לעגלה', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('link', { name: 'לצפייה בעגלה', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.getByRole('heading', { name: 'העגלה שלך', exact: true, level: 1 }).waitFor();
    await page.getByRole('textbox', { name: /כמות סטים עבור/ }).fill('2');
    await page.getByRole('textbox', { name: /כמות סטים עבור/ }).blur();
    await page.reload();
    await page.getByRole('textbox', { name: /כמות סטים עבור/ }).waitFor();
    assert.equal(await page.getByRole('textbox', { name: /כמות סטים עבור/ }).inputValue(), '2', 'cart restores quantity');
    await page.getByRole('button', { name: 'הסרת מוצר בדיקה 1 מהעגלה', exact: true }).click();
    await page.getByText('העגלה שלך עדיין ריקה', { exact: true }).waitFor();
    await page.goto(`${target}/`);
    await page.locator('#gallery').getByRole('button', { name: 'הגדלת תמונת בדיקה 0', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'תמונה הבאה', exact: true }).click();
    await page.getByText('2 / 6', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.goto(`${target}/catalog`);
    await page.getByRole('textbox', { name: 'חיפוש מוצרים', exact: true }).fill('מוצר בדיקה 27');
    await page.getByRole('button', { name: 'חיפוש', exact: true }).click();
    await page.getByRole('link', { name: 'מוצר בדיקה 27, פרטים מלאים', exact: true }).waitFor();
    assert.match(page.url(), /search=/);
    mode = 'closed';
    await page.goto(`${target}/`);
    await page.getByText('החנות סגורה להזמנות כרגע', { exact: true }).waitFor();
    await page.goto(`${target}/products/00000000-0000-4000-8000-000000000000`);
    await page.getByRole('heading', { name: 'מוצר בדיקה 1', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'הוספה לעגלה', exact: true }).isDisabled(), true);
    mode = 'error';
    await page.goto(`${target}/`);
    await page.getByText('לא ניתן לטעון את הקטלוג', { exact: true }).waitFor();
    mode = 'empty';
    await page.goto(`${target}/`);
    await page.getByRole('heading', { name: 'לא נמצאו מוצרים', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    results.push({ width, passed: true, errors });
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(resolve(shots, 'checks.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
