import type { HomeItem, HomeOrder } from './home.types.js';

export interface ProductGroup {
  key: string; name: string; category: string; imageUrl: string | null;
  orderedSets: number; remainingSets: number;
  lines: Array<{ order: HomeOrder; item: HomeItem }>;
}

export function summarizeProduction(orders: HomeOrder[]): ProductGroup[] {
  const groups = new Map<string, ProductGroup>();
  for (const order of orders) {
    if (order.paymentStatus !== 'paid' || order.status === 'cancelled') continue;
    for (const item of order.items) {
      const key = `${item.productId ?? item.productName}:${item.productVariantId ?? ''}:${item.productName}:${item.variantName}`;
      let group = groups.get(key);
      if (!group) {
        group = { key, name: [item.productName, item.variantName].filter(Boolean).join(' · '),
          category: item.categoryName, imageUrl: item.imageUrl, orderedSets: 0, remainingSets: 0, lines: [] };
        groups.set(key, group);
      }
      group.orderedSets += item.quantitySets;
      if (order.status === 'ordered' || order.status === 'in_preparation') group.remainingSets += item.quantitySets;
      group.lines.push({ order, item });
    }
  }
  return [...groups.values()].sort((a, b) => a.category.localeCompare(b.category, 'he') || a.name.localeCompare(b.name, 'he'));
}

export function summarizeCities(orders: HomeOrder[]) {
  const cities = new Map<string, HomeOrder[]>();
  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    const city = order.city || 'עיר לא צוינה';
    const group = cities.get(city) ?? [];
    group.push(order);
    cities.set(city, group);
  }
  return [...cities].map(([city, cityOrders]) => ({ city, orders: cityOrders, count: cityOrders.length }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city, 'he'));
}
