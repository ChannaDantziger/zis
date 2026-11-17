import { useState } from 'react';
import { Alert, Button, Group, Modal, NumberInput, Stack, Text } from '@mantine/core';

export function PackageCountDialog({ initialCount, targetLabel, pending, error, onClose, onConfirm }: {
  initialCount: number | null | undefined; targetLabel: string; pending: boolean; error?: string;
  onClose: () => void; onConfirm: (count: number) => void;
}) {
  const [count, setCount] = useState<number | string>(initialCount ?? '');
  const valid = typeof count === 'number' && Number.isInteger(count) && count > 0 && count <= 9999;
  return <Modal opened onClose={onClose} title="מספר מארזים">
    <Stack><Text>כמה מארזים יש בהזמנה? המספר יישמר בפרטי ההזמנה ויופיע במשלוח.</Text>
      <NumberInput label="מספר מארזים" value={count} onChange={setCount} min={1} max={9999} allowDecimal={false} allowNegative={false} required />
      {error && <Alert color="red">{error}</Alert>}
      <Group justify="end"><Button variant="subtle" onClick={onClose}>חזרה</Button>
        <Button disabled={!valid} loading={pending} onClick={() => { if (valid) onConfirm(count as number); }}>{targetLabel}</Button></Group>
    </Stack>
  </Modal>;
}
