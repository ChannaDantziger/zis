import { useState } from 'react';
import { Alert, Button, Modal, Stack, Text, Textarea } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { OrderDetails } from '../../entities/admin.types.js';
import { request } from '../../shared/api/http-client.js';

type PaymentOrder = Pick<OrderDetails, 'orderId' | 'orderNumber' | 'version' | 'status' | 'paymentStatus'> & Pick<Partial<OrderDetails>, 'payments'>;

export function ManualPaymentControl({ order }: { order: PaymentOrder }) {
  const [action, setAction] = useState<'confirm' | 'revert' | null>(null);
  const [note, setNote] = useState('');
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => request(`/admin/orders/${encodeURIComponent(order.orderId)}/manual-payment`, {
      method: 'POST', body: JSON.stringify({ action, version: order.version, note: note.trim() }),
    }),
    onSuccess: async () => {
      setAction(null); setNote('');
      await Promise.all(['order-details', 'orders', 'orders-status-count', 'home-orders', 'dashboard', 'production']
        .map(key => client.invalidateQueries({ queryKey: [key] })));
    },
  });
  if (order.status !== 'ordered') return null;
  const canConfirm = order.paymentStatus === 'pending';
  const canRevert = order.paymentStatus === 'paid' && order.payments?.some(payment => payment.provider === 'manual_external' && payment.status === 'paid');
  if (!canConfirm && !canRevert) return null;
  const open = (next: 'confirm' | 'revert') => { mutation.reset(); setNote(''); setAction(next); };
  return <>
    {canConfirm && <Button variant="light" onClick={() => open('confirm')}>אישור תשלום שהתקבל מחוץ לאתר</Button>}
    {canRevert && <Button variant="light" color="orange" onClick={() => open('revert')}>החזרה לממתינה לתשלום</Button>}
    <Modal opened={action !== null} onClose={() => { if (!mutation.isPending) setAction(null); }} title={action === 'confirm' ? 'אישור תשלום חיצוני' : 'החזרה לממתינה לתשלום'}>
      <Stack>
        <Text>{action === 'confirm' ? 'אשרי רק לאחר שהתשלום התקבל בפועל. הפעולה תפחית מלאי ואינה מחייבת אשראי.' : 'הפעולה מבטלת את האישור הידני ומחזירה את המלאי שהופחת. אין בה החזר כספי.'}</Text>
        <Textarea required label={action === 'confirm' ? 'כיצד התקבל התשלום?' : 'מדוע התשלום אינו מוסדר?'} description={action === 'confirm' ? 'למשל: מזומן או העברה בנקאית' : undefined} value={note} maxLength={1000} onChange={event => setNote(event.currentTarget.value)} />
        {mutation.isError && <Alert color="red" role="alert">{paymentError(mutation.error.message)}</Alert>}
        <Button loading={mutation.isPending} disabled={!note.trim()} onClick={() => mutation.mutate()}>{action === 'confirm' ? 'אישור קבלת התשלום' : 'החזרה להמתנה'}</Button>
      </Stack>
    </Modal>
  </>;
}

function paymentError(message: string) {
  if (/stock/i.test(message)) return 'לא ניתן לעדכן את המלאי. בדקי את המלאי ופרטי ההזמנה ונסי שוב.';
  if (/refresh|changed/i.test(message)) return 'ההזמנה השתנתה. רענני את הפרטים ונסי שוב.';
  if (/manager|permission|forbidden/i.test(message)) return 'נדרשת הרשאת מנהלת תפעול פעילה.';
  if (/payment|order/i.test(message)) return 'לא ניתן להשלים את שינוי התשלום במצב הנוכחי. רענני ובדקי את פרטי ההזמנה והתשלומים.';
  return message;
}
