// Isolated browser QA: serves a build and clearly labelled fixtures, never a live API.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = 4184;
const image = index => ({ imageId: `image-${index}`, url: '/zis-logo-dark.png', altText: `תמונת בדיקה ${index}`, imageType: 'gallery', sortOrder: index });
const category = { categoryId: 'qa-category', name: 'קטגוריית בדיקה', slug: 'qa' };
const products = Array.from({ length: 27 }, (_, index) => ({
  productId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, category, name: `מוצר בדיקה ${index + 1}`,
  description: 'נתון בדיקה מבודד. אינו מוצר למכירה.', setSize: 1, pricePerUnit: '25.00', availableSets: 10, displayOrder: index * 10,
  primaryImage: image(index), gallery: [image(index), image(index + 100)],
  variants: [],
}));
let mode = 'open';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  if (url.pathname.startsWith('/__test/')) {
    mode = url.pathname.slice('/__test/'.length);
    response.writeHead(302, { Location: '/' }); response.end(); return;
  }
  if (url.pathname.startsWith('/api/')) {
    response.setHeader('Content-Type', 'application/json');
    if (mode === 'error') { response.writeHead(503); response.end(JSON.stringify({ error: { code: 'QA_OUTAGE' } })); return; }
    let result;
    switch (url.pathname) {
      case '/api/store-status': result = { storeOpen: mode !== 'closed', lockMessage: 'סגירה לצורך בדיקה', dispatchTime: '12:00', sameDayCutoffTime: '09:00', timezone: 'Asia/Jerusalem' }; break;
      case '/api/categories': result = { data: [category] }; break;
      case '/api/event-gallery': result = { data: Array.from({ length: 6 }, (_, index) => image(index)) }; break;
      case '/api/catalog': {
        const search = url.searchParams.get('search') ?? '';
        let filtered = mode === 'empty' ? [] : products.filter(product => product.name.includes(search));
        if (url.searchParams.get('sort') === 'name') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'he'));
        if (url.searchParams.get('direction') === 'desc') filtered.reverse();
        const page = Number(url.searchParams.get('page') ?? 1);
        const pageSize = Number(url.searchParams.get('pageSize') ?? 24);
        result = { data: filtered.slice((page - 1) * pageSize, page * pageSize), page: { page, pageSize, totalItems: filtered.length, totalPages: Math.ceil(filtered.length / pageSize) } }; break;
      }
      default: result = products.find(product => url.pathname === `/api/catalog/${product.productId}`);
    }
    if (!result) { response.writeHead(404); response.end(JSON.stringify({ error: { code: 'NOT_FOUND' } })); return; }
    response.end(JSON.stringify(result)); return;
  }
  let path = resolve(root, `.${decodeURIComponent(url.pathname)}`);
  if (path !== resolve(root) && !path.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)) { response.writeHead(403); response.end(); return; }
  if (!extname(path)) path = resolve(root, 'index.html');
  try {
    const bytes = await readFile(path);
    response.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream');
    response.end(bytes);
  } catch { response.writeHead(404); response.end(); }
});
server.listen(port, '127.0.0.1', () => console.log(`Isolated QA fixtures: http://127.0.0.1:${port}`));
