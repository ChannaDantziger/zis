import { useState } from 'react';
import { Alert, Button, Group, Modal, NumberInput, Stack, Text } from '@mantine/core';

export function PackageCountDialog({ initialCount, minimumCount, targetLabel, pending, error, onClose, onConfirm }: {
  initialCount: number | null | undefined; minimumCount: number; targetLabel: string; pending: boolean; error?: string;
  onClose: () => void; onConfirm: (count: number) => void;
}) {
  const [count, setCount] = useState<number | string>(Math.max(initialCount ?? 0, minimumCount));
  const valid = typeof count === 'number' && Number.isInteger(count) && count >= minimumCount && count <= 9999;
  return <Modal opened onClose={onClose} title="מספר מארזים">
    <Stack><Text>כמה מארזים יש בהזמנה? המספר יישמר בפרטי ההזמנה ויופיע במשלוח.</Text>
      <NumberInput label="מספר אריזות" description={`נדרשות לפחות ${minimumCount} אריזות לפי תכולת ההזמנה.`} value={count} onChange={setCount} min={minimumCount} max={9999} allowDecimal={false} allowNegative={false} required />
      {error && <Alert color="red">{error}</Alert>}
      <Group justify="end"><Button variant="subtle" onClick={onClose}>חזרה</Button>
        <Button disabled={!valid} loading={pending} onClick={() => { if (valid) onConfirm(count as number); }}>{targetLabel}</Button></Group>
    </Stack>
  </Modal>;
}
