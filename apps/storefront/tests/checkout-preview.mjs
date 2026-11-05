// Isolated QA fixture. Never connects to a database or a real API.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, resolve, sep } from 'node:path';
const root = resolve(fileURLToPath(new URL('../dist-checkout-qa/', import.meta.url)));
const productId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const variantId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const product = { productId, name: 'מוצר בדיקה בלבד', description: 'QA', category: { categoryId: productId, name: 'בדיקות', slug: 'qa' },
  setSize: 1, pricePerUnit: '20.00', availableSets: 100, displayOrder: 10, primaryImage: null, gallery: [], variants: [{ productVariantId: variantId, name: 'QA',
    productCode: 'QA', pricePerUnit: '20.00', availableSets: 100, isDefault: true, attributes: null, primaryImage: null, gallery: [] }] };
const created = { orderId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', orderNumber: 'QA-100', status: 'ordered',
  paymentStatus: 'pending', total: '52.00', currency: 'ILS', confirmationToken: 'qa-private-memory-token' };
let orderInput; const attempts = new Map();
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const json = (body, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
  if (url.pathname.startsWith('/api/')) {
    const path = url.pathname.slice(4);
    if (path === '/store-status') return json({ storeOpen: true, lockMessage: null, timezone: 'Asia/Jerusalem', dispatchTime: '14:00', sameDayCutoffTime: '10:00' });
    if (path === '/shipping/zones') return json({ data: [{ shippingZoneId: productId, name: 'אזור בדיקה', city: 'ירושלים', neighborhood: 'QA' }] });
    if (path === '/categories') return json({ data: [product.category] });
    if (path === '/catalog/' + productId) return json(product);
    if (path === '/catalog') return json({ data: [product], page: { page: 1, pageSize: 24, totalItems: 1, totalPages: 1 } });
    if (path === '/event-gallery') return json({ data: [] });
    if (path === '/faq') return json({ items: [{ faqEntryId: productId, question: 'שאלת ניסוי', answer: 'תשובת ניסוי', sortOrder: 1 }] });
    if (path === '/delivery-dates') return json({ timezone: 'Asia/Jerusalem', today: '2026-10-26', maxDate: '2026-11-02', availableDates: ['2026-10-27', '2026-10-28', '2026-10-29'] });
    if (path === '/orders/confirmation') {
      if (req.headers.authorization !== 'Bearer ' + created.confirmationToken) return json({ error: { code: 'NOT_FOUND' } }, 404);
      return json({ orderNumber: created.orderNumber, status: created.status, paymentStatus: created.paymentStatus,
        deliveryDate: orderInput?.deliveryDate, total: created.total, currency: created.currency });
    }
    let body = ''; for await (const chunk of req) body += chunk;
    let input; try { input = JSON.parse(body); } catch { return json({ error: { code: 'VALIDATION_ERROR' } }, 400); }
    if (path === '/availability') return json({ deliveryDate: input.deliveryDate, available: true, items: input.items.map((item) => ({ ...item, availableSets: 100, requestedSets: item.quantitySets, shortageSets: 0 })) });
    if (path === '/quote') return json({ calculatedAt: new Date().toISOString(), deliveryDate: input.deliveryDate,
      subtotal: '40.00', shippingTotal: '12.00', taxTotal: '0.00', total: '52.00', currency: 'ILS',
      availability: 'available', reservationCreated: false, warnings: [] });
    if (path === '/orders') {
      const key = req.headers['idempotency-key'];
      if (!key) return json({ error: { code: 'VALIDATION_ERROR' } }, 400);
      if (attempts.has(key) && attempts.get(key) !== body) return json({ error: { code: 'CONFLICT' } }, 409);
      attempts.set(key, body); orderInput = input; return json(created, 201);
    }
    return json({ error: { code: 'NOT_FOUND' } }, 404);
  }
  let file = resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!(file === root || file.startsWith(root + sep))) { res.writeHead(403); res.end(); return; }
  if (!extname(file)) file = resolve(root, 'index.html');
  try {
    const data = await readFile(file); const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[extname(file)] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type }); res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
server.listen(4185, '127.0.0.1', () => console.log('Isolated checkout QA http://127.0.0.1:4185 — synthetic data only'));
