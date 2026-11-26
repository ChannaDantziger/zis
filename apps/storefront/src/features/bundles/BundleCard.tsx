import { ActionIcon, AspectRatio, Badge, Button, Card, Group, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { SafeImage } from '../product-gallery/SafeImage';
import { formatBundlePrice, priceAgorot } from './allocation';
import type { Bundle, BundleProduct, Selection } from './types';

export function BundleCard({ bundle, products, initial, onOpen }: { bundle: Bundle; products: BundleProduct[]; initial: Selection | null; onOpen: () => void }) {
  const image = bundle.images.find(item => item.isPrimary);
  return <Card className="product-card" withBorder p="md" h="100%">
    <button type="button" className="product-card-link" onClick={onOpen} aria-label={`פרטי ${bundle.name}`} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer' }}>
      <AspectRatio ratio={4 / 3}>{image ? <SafeImage src={image.url} alt={image.altText || bundle.name} fit="cover" /> : <Text c="dimmed">תמונה תתווסף בהמשך</Text>}</AspectRatio>
    </button>
    <Stack gap="xs" mt="md" flex={1}>
      <Text size="xs" c="dimmed">{bundle.categoryName}</Text>
      <Title order={3} size="h4">{bundle.name}</Title>
      <Text size="sm" lineClamp={2}>{bundle.description || 'לפרטים נוספים על המארז'}</Text>
      <Text size="sm">{bundle.unitCount} יחידות במארז</Text>
      {initial ? <Group gap="xs" align="center"><Text fw={700}>{formatBundlePrice(priceAgorot(products, initial))}</Text>
        <Tooltip label="המחיר מותאם לתכולה שתבחרו" withArrow events={{ hover: true, focus: true, touch: true }}>
          <ActionIcon variant="subtle" color="gray" aria-label="המחיר מותאם לתכולה שתבחרו"><IconInfoCircle size={18} /></ActionIcon>
        </Tooltip></Group> : <Badge color="gray">לא זמין כרגע</Badge>}
      <Button variant="subtle" mt="auto" onClick={onOpen}>פרטים והרכבת המארז</Button>
    </Stack>
  </Card>;
}
