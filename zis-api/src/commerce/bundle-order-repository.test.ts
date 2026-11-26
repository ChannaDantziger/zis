import assert from 'node:assert/strict';
import test from 'node:test';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import { saveOrderBundles } from './bundle-order-repository.js';

test('order bundle snapshot uses saved prices and preserves line identity during a pending edit', async () => {
  const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
  const client = { async query(sql: string, values: readonly unknown[] = []) {
    calls.push({ sql, values });
    if (sql.includes('from public.catalog_bundles b')) return { rows: [{ bundle_id:'bundle', category_id:'category', name:'חדש', category_name:'קינוחים', unit_count:2, image_path:null }] };
    if (sql.includes('p.price_per_item::text,p.available_items')) return { rows: [{ product_id:'product', category_id:'category', name:'חדש', price_per_item:'12.00', available_items:20, image_path:null }] };
    if (sql.includes('insert into public.order_bundles')) return { rows: [{ order_bundle_id:'saved-line' }] };
    return { rows: [] };
  } } as unknown as SqlClient;
  const input = [{ orderBundleId:'saved-line', bundleId:'bundle', quantity:2, components:[{productId:'product',quantity:2}] }];
  const snapshots = [{ orderBundleId:'saved-line', bundleId:'bundle', categoryId:'category', bundleName:'מארז מקורי', categoryName:'קינוחים',
    unitCount:2, quantity:1, unitPrice:'16.00', lineTotal:'16.00', components:[{productId:'product',productName:'שם מקורי',quantity:2,unitPrice:'8.00'}] }];
  await saveOrderBundles(client,'order',input,[],snapshots);
  const bundle = calls.find(call => call.sql.includes('insert into public.order_bundles'))!;
  assert.deepEqual(bundle.values.slice(3),['מארז מקורי','קינוחים',null,2,2,'16.00','32.00','saved-line']);
  const component = calls.find(call => call.sql.includes('insert into public.order_bundle_components'))!;
  assert.deepEqual(component.values,['saved-line','product','שם מקורי',null,2,'8.00']);
});
