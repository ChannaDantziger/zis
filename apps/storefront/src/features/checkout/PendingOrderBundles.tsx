import { useState } from 'react';
import { Alert, Button, Card, Group, NumberInput, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { observer } from 'mobx-react-lite';
import { getProduct } from '../../entities/product/api';
import { apiRequest } from '../../shared/api/http-client';
import { MAX_QUANTITY_SETS } from '../../stores/cart.persistence';
import { BundleModal } from '../bundles/BundleModal';
import { BundleCount } from '../bundles/BundleCount';
import type { BundleResponse } from '../bundles/types';
import type { ConfirmationBundle } from './checkout.types';
import { checkoutStore } from './checkout.store';

export const PendingOrderBundles = observer(function PendingOrderBundles() {
  const store = checkoutStore;
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const catalog = useQuery({ queryKey: ['bundle-preview'], enabled: Boolean(store.pendingBundles.length),
    queryFn: ({ signal }) => apiRequest<BundleResponse>('/bundle-preview', { signal }) });
  const loose = useQuery({ queryKey: ['pending-products', store.pendingItems.map(item => item.productId)],
    enabled: Boolean(store.pendingBundles.length && store.pendingItems.length),
    queryFn: async () => Promise.all(store.pendingItems.map(item => getProduct(item.productId))) });
  if (!store.hasPrivateConfirmation || !store.pendingBundles.length || store.created?.paymentStatus !== 'pending') return null;

  function check(next: ConfirmationBundle): string {
    if (!catalog.data || (store.pendingItems.length && !loose.data)) return 'ממתינים לבדיקת המלאי.';
    const products = new Map(catalog.data.products.map(product => [product.productId, product]));
    const required = new Map<string, number>();
    for (const item of store.pendingItems) {
      const product = loose.data?.find(candidate => candidate.productId === item.productId);
      if (!product) return 'לא ניתן לבדוק את מלאי המוצרים בהזמנה.';
      required.set(item.productId, (required.get(item.productId) ?? 0) + item.quantitySets * product.setSize);
    }
    for (const line of store.pendingBundles.map(line => line.orderBundleId === next.orderBundleId ? next : line)) {
      if (line.components.reduce((sum, component) => sum + component.quantity, 0) !== line.unitCount) return 'יש לתקן את מספר היחידות במארז.';
      for (const component of line.components) required.set(component.productId, (required.get(component.productId) ?? 0) + component.quantity * line.quantity);
    }
    const shortages: string[] = [];
    for (const [id, quantity] of required) {
      const product = products.get(id);
      if (product && quantity > product.availableItems) shortages.push(`${product.name}: נדרשות ${quantity}, זמינות ${product.availableItems}`);
      if (!product && store.pendingBundles.some(line => line.components.some(component => component.productId === id))) return 'אחד המוצרים במארז אינו זמין.';
    }
    return shortages.length ? `אין מספיק מלאי: ${shortages.join('; ')}.` : '';
  }

  return <Stack gap="sm"><Title order={2} size="h4">מארזים בהזמנה ממתינה</Title>
    <Text size="sm">שינויי הרכב אינם נשמרים עד ללחיצה על שמירת השינויים.</Text>
    {!store.canEditPending && <Alert color="blue">עריכת מארזים בהזמנה ממתינה עדיין אינה זמינה.</Alert>}
    {(catalog.isError || loose.isError) && <Alert color="orange">לא ניתן לבדוק כעת את מלאי המוצרים. נסו לרענן.</Alert>}
    {notice && <Alert color="orange" role="alert">{notice}</Alert>}
    {store.pendingBundles.map(line => {
      const current = catalog.data?.bundles.find(bundle => bundle.bundleId === line.bundleId);
      const bundle = current && { ...current, name: line.bundleName, unitCount: line.unitCount };
      const products = catalog.data?.products.filter(product => product.categoryId === current?.categoryId).map(product => ({ ...product,
        pricePerUnit: line.components.find(component => component.productId === product.productId)?.unitPrice ?? product.pricePerUnit })) ?? [];
      return <Card key={line.orderBundleId} withBorder><Stack gap="xs"><div><Text fw={700}>{line.bundleName}</Text><BundleCount quantity={line.quantity} /></div>
        {line.components.map(component => <Text size="sm" key={component.productId}>{component.productName}: {component.quantity} למארז (סה״כ {component.quantity * line.quantity})</Text>)}
        <Group align="end"><NumberInput label="מספר מארזים זהים" value={line.quantity} min={1} max={MAX_QUANTITY_SETS} allowDecimal={false}
          disabled={!store.canEditPending || !catalog.data} onChange={value => { if (typeof value !== 'number') return;
            const next = { ...line, quantity: value }; const error = check(next); if (error) setNotice(error); else { setNotice(''); store.setPendingBundle(next); } }} />
          <Button variant="light" disabled={!store.canEditPending || !bundle} onClick={() => setEditing(line.orderBundleId)}>עריכת הרכב</Button>
          <Button variant="subtle" color="red" disabled={!store.canEditPending || store.pendingItems.length + store.pendingBundles.length <= 1}
            onClick={() => store.removePendingBundle(line.orderBundleId)}>הסרה</Button></Group>
        {editing === line.orderBundleId && bundle && <BundleModal bundle={bundle} products={products} initialCount={line.quantity}
          initial={Object.fromEntries(line.components.map(component => [component.productId, component.quantity]))} onClose={() => setEditing(null)}
          onSave={(selection, quantity) => {
            const components = Object.entries(selection).filter(([, amount]) => amount > 0).map(([id, amount]) => {
              const old = line.components.find(component => component.productId === id), product = products.find(item => item.productId === id)!;
              return { productId: id, productName: old?.productName ?? product.name, unitPrice: old?.unitPrice ?? product.pricePerUnit, quantity: amount };
            });
            const next = { ...line, quantity, components }; const error = check(next);
            if (error) return error;
            store.setPendingBundle(next); setNotice(''); return null;
          }} />}
      </Stack></Card>;
    })}
    {!store.pendingItems.length && <Button disabled={!store.canEditPending || !store.pendingItemsChanged} loading={store.busy} onClick={() => void store.savePendingItems()}>שמירת השינויים</Button>}
  </Stack>;
});
