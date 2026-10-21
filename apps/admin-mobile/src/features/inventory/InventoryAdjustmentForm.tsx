import { useEffect } from 'react';
import { Alert, Button, Group, NumberInput, Paper, Stack, Text, Textarea, Title } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { observer, useLocalObservable } from 'mobx-react-lite';
import type { InventoryVariant } from './inventory.types.js';
import { request } from '../../shared/api/http-client.js';

export const InventoryAdjustmentForm = observer(function InventoryAdjustmentForm({ variant }: { variant: InventoryVariant }) {
  const client = useQueryClient();
  const ui = useLocalObservable(() => ({ delta: 0, reason: '', setDelta(value: number) { this.delta = value; }, setReason(value: string) { this.reason = value; } }));
  const mutation = useMutation({
    mutationFn: (input: { id: string; deltaSets: number; reason: string }) => request<{ stockBefore: number; stockAfter: number }>(`/admin/inventory/${input.id}/adjust`, {
      method: 'POST', body: JSON.stringify({ deltaSets: input.deltaSets, reason: input.reason }),
    }),
    retry: false,
    onSuccess: async () => {
      ui.setDelta(0); ui.setReason('');
      await Promise.all([client.invalidateQueries({ queryKey: ['inventory-admin'] }), client.invalidateQueries({ queryKey: ['admin-catalog'] })]);
    },
  });
  useEffect(() => { ui.setDelta(variant.defaultProductionQuantitySets); ui.setReason(''); mutation.reset(); }, [variant.productVariantId]);
  const valid = Number.isSafeInteger(ui.delta) && ui.delta !== 0 && Boolean(ui.reason.trim());
  return <Paper withBorder p="md"><Stack gap="sm">
    <Title order={3}>תוספת או הפחתת מלאי זמין</Title>
    <Text size="sm">הפעולה משנה Sets זמינים בפועל. כמות חיובית מוסיפה, שלילית מפחיתה; תכנון קיבולת אינו אישור מלאי.</Text>
    <NumberInput label="שינוי ב־Sets" value={ui.delta} allowDecimal={false} onChange={(value) => ui.setDelta(Number(value))} disabled={mutation.isPending} />
    <Textarea label="סיבת השינוי" required value={ui.reason} onChange={(event) => ui.setReason(event.currentTarget.value)} disabled={mutation.isPending} />
    <Group><Button variant="default" disabled={mutation.isPending} onClick={() => ui.setDelta(variant.defaultProductionQuantitySets)}>כמות ברירת מחדל: +{variant.defaultProductionQuantitySets}</Button>
      <Button disabled={!valid} loading={mutation.isPending} onClick={() => mutation.mutate({ id: variant.productVariantId, deltaSets: ui.delta, reason: ui.reason.trim() })}>עדכון מלאי</Button></Group>
    {mutation.isSuccess && <Alert color="green">המלאי עודכן: {mutation.data.stockBefore} ← {mutation.data.stockAfter} Sets</Alert>}
    {mutation.isError && <Alert color="red">{mutation.error.message}<Text size="sm">אם הבקשה נותקה, רענני ובדקי את היסטוריית התנועות לפני ניסיון נוסף.</Text></Alert>}
  </Stack></Paper>;
});