// Explicit fixtures used only by local browser tests and preview-server.
const image = index => ({ imageId: `image-${index}`, url: '/zis-logo-dark.png', altText: `תמונת בדיקה ${index}`, imageType: 'gallery', sortOrder: index });
const category = { categoryId: 'qa-category', name: 'קטגוריית בדיקה', slug: 'qa' };
const products = Array.from({ length: 27 }, (_, index) => ({
  productId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, category, name: `מוצר בדיקה ${index + 1}`,
  description: 'נתון בדיקה מבודד. אינו מוצר למכירה.', setSize: 1, pricePerUnit: '25.00', availableSets: 10, displayOrder: index * 10,
  primaryImage: image(index), gallery: [image(index), image(index + 100)],
  variants: [],
}));

export function getQaResponse(url, mode) {
  if (mode === 'error') return { status: 503, body: { error: { code: 'QA_OUTAGE' } } };
  let body;
  switch (url.pathname) {
    case '/api/store-status': body = { storeOpen: mode !== 'closed', lockMessage: 'סגירה לצורך בדיקה', dispatchTime: '12:00', sameDayCutoffTime: '09:00', timezone: 'Asia/Jerusalem' }; break;
    case '/api/categories': body = { data: [category] }; break;
    case '/api/event-gallery': body = { data: Array.from({ length: 6 }, (_, index) => image(index)) }; break;
    case '/api/catalog': {
      const search = url.searchParams.get('search') ?? '';
      let filtered = mode === 'empty' ? [] : products.filter(product => product.name.includes(search));
      if (url.searchParams.get('sort') === 'name') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'he'));
      if (url.searchParams.get('direction') === 'desc') filtered.reverse();
      const page = Number(url.searchParams.get('page') ?? 1);
      const pageSize = Number(url.searchParams.get('pageSize') ?? 24);
      body = { data: filtered.slice((page - 1) * pageSize, page * pageSize), page: { page, pageSize, totalItems: filtered.length, totalPages: Math.ceil(filtered.length / pageSize) } }; break;
    }
    default: body = products.find(product => url.pathname === `/api/catalog/${product.productId}`);
  }
  return body ? { status: 200, body } : { status: 404, body: { error: { code: 'NOT_FOUND' } } };
}
