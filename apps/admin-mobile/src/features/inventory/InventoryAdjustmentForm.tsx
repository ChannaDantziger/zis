import { useEffect } from 'react';
import { Alert, Button, Group, NumberInput, Paper, SegmentedControl, Stack, Text, Textarea, Title } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { observer, useLocalObservable } from 'mobx-react-lite';
import type { InventoryVariant } from './inventory.types.js';
import { request } from '../../shared/api/http-client.js';

export const InventoryAdjustmentForm = observer(function InventoryAdjustmentForm({ variant }: { variant: InventoryVariant }) {
  const client = useQueryClient();
  const ui = useLocalObservable(() => ({ quantity: 0, mode: 'add', reason: '', setQuantity(value: number) { this.quantity = value; }, setMode(value: string) { this.mode = value; }, setReason(value: string) { this.reason = value; } }));
  const mutation = useMutation({
    mutationFn: (input: { id: string; deltaSets: number; reason: string }) => request<{ stockBefore: number; stockAfter: number }>(`/admin/inventory/${input.id}/adjust`, {
      method: 'POST', body: JSON.stringify({ deltaSets: input.deltaSets, reason: input.reason }),
    }),
    retry: false,
    onSuccess: async () => {
      ui.setQuantity(0); ui.setReason('');
      await Promise.all([client.invalidateQueries({ queryKey: ['inventory-admin'] }), client.invalidateQueries({ queryKey: ['admin-catalog'] })]);
    },
  });
  useEffect(() => { ui.setQuantity(variant.defaultProductionQuantitySets); ui.setMode('add'); ui.setReason(''); mutation.reset(); }, [variant.productVariantId]);
  const delta = ui.mode === 'add' ? ui.quantity : -ui.quantity;
  const after = variant.availableSets + delta;
  const valid = Number.isSafeInteger(ui.quantity) && ui.quantity > 0 && after >= 0 && Boolean(ui.reason.trim());
  return <Paper withBorder p="md"><Stack gap="sm">
    <Title order={3}>עדכון מלאי</Title>
    <Text fw={600}>כרגע במלאי: {variant.availableSets} סטים</Text>
    <SegmentedControl aria-label="פעולת מלאי" value={ui.mode} disabled={mutation.isPending} data={[{ value: 'add', label: 'הוספת מלאי' }, { value: 'remove', label: 'הפחתת מלאי' }]} onChange={ui.setMode} />
    <NumberInput label={ui.mode === 'add' ? 'כמה סטים להוסיף?' : 'כמה סטים להפחית?'} min={1} value={ui.quantity || ''} allowDecimal={false} onChange={(value) => ui.setQuantity(Number(value))} disabled={mutation.isPending} />
    <Textarea label="סיבת השינוי" required value={ui.reason} onChange={(event) => ui.setReason(event.currentTarget.value)} disabled={mutation.isPending} />
    {ui.quantity > 0 && <Text c={after < 0 ? 'red' : undefined}>{after < 0 ? 'אי אפשר להפחית יותר מהכמות הזמינה.' : `לאחר השמירה יהיו במלאי ${after} סטים.`}</Text>}
    <Group><Button disabled={!valid} loading={mutation.isPending} onClick={() => mutation.mutate({ id: variant.productVariantId, deltaSets: delta, reason: ui.reason.trim() })}>שמירת עדכון המלאי</Button></Group>
    {mutation.isSuccess && <Alert color="green">המלאי עודכן: {mutation.data.stockBefore} ← {mutation.data.stockAfter} Sets</Alert>}
    {mutation.isError && <Alert color="red">{mutation.error.message}<Text size="sm">אם הבקשה נותקה, רענני ובדקי את היסטוריית התנועות לפני ניסיון נוסף.</Text></Alert>}
  </Stack></Paper>;
});
