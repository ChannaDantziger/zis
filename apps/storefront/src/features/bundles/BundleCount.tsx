import { Text } from '@mantine/core';

export function BundleCount({ quantity }: { quantity: number }) {
  return <Text size="sm" c="dimmed" fw={400}><strong>{quantity}</strong> {quantity === 1 ? 'מארז' : 'מארזים זהים'}</Text>;
}
