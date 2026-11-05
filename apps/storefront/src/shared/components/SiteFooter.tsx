import { Container, Group, Image, Stack, Text, Anchor } from '@mantine/core';
import { Link } from 'react-router-dom';

export function SiteFooter() {
  return <footer className="site-footer">
    <Container className="content-width">
      <Group justify="space-between" align="start" gap="xl">
        <Image src="/zis-logo-light.png" w={110} h={90} fit="contain" alt="זיס" />
        <Stack gap="sm">
          <Text fw={700}>זיס</Text>
          <Anchor component={Link} to="/" c="inherit">דף הבית</Anchor>
          <Anchor component={Link} to="/catalog" c="inherit">לקטלוג</Anchor>
          <Anchor component={Link} to="/cart" c="inherit">לעגלה שלי</Anchor>
        </Stack>
        <Text size="sm" maw={340}>דמי המשלוח יחושבו לפי פרטי ההזמנה ויוצגו לפני התשלום.</Text>
      </Group>
    </Container>
  </footer>;
}
