import { Alert, Button, Card, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';

export function InventoryPage() {
  return <Stack gap="lg" maw={760} mx="auto">
    <Title order={1}>מלאי מוצרים</Title>
    <Card withBorder radius="lg"><Stack>
      <Text>המלאי מנוהל לכל מוצר לפי יחידות פיזיות. מספר הסטים הזמינים מחושב לפי גודל הסט שהוגדר במוצר.</Text>
      <Alert color="blue">פתחי את המוצר בקטלוג כדי לעדכן מחיר, מלאי וספי התראה.</Alert>
      <Button component={Link} to="/catalog" w="fit-content">מעבר לקטלוג המוצרים</Button>
    </Stack></Card>
  </Stack>;
}
