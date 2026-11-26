import { Box, Group, Image, Paper, Stack, Text } from '@mantine/core';
import type { OrderDetails } from '../../entities/admin.types.js';
import { BundleCount } from './BundleCount.js';

type Bundle = NonNullable<OrderDetails['bundles']>[number];

export function BundleContents({ bundle }: { bundle: Bundle }) {
  return <Paper withBorder radius="md" p="sm" aria-label={`תכולת ${bundle.bundleName}`}>
    <Group align="end" wrap="nowrap" gap="sm">
      <Stack gap="sm" style={{ flex: 1, minWidth: 0 }}>
        <Group wrap="nowrap"><Thumbnail src={bundle.imageUrl} name={bundle.bundleName} />
          <div><Text fw={700}>{bundle.bundleName}</Text><BundleCount quantity={bundle.quantity} /></div></Group>
        <Stack gap="xs" ms="xl" ps="sm" style={{ borderInlineStart: '2px solid var(--mantine-color-gray-3)' }}>
          {bundle.components.map(component => <Group key={component.productId} wrap="nowrap">
            <Thumbnail src={component.imageUrl} name={component.productName} />
            <Text size="sm">{component.productName}: {component.quantity} למארז (סה״כ {component.quantity * bundle.quantity} יחידות)</Text>
          </Group>)}
        </Stack>
      </Stack>
      <Text fw={700} style={{ whiteSpace: 'nowrap' }} dir="ltr">₪{bundle.lineTotal}</Text>
    </Group>
  </Paper>;
}

function Thumbnail({ src, name }: { src?: string | null; name: string }) {
  return src ? <Image src={src} alt={name} w={55} h={55} radius="sm" fit="cover" />
    : <Box className="home-thumb home-thumb-empty" role="img" aria-label={`אין תמונה ל${name}`}>אין תמונה</Box>;
}
