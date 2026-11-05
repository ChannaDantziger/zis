import { Alert, Select, SimpleGrid, Stack, Text } from '@mantine/core';

// Only synthetic choices are accepted. No card data enters application state or requests.
export function DemoCredit() {
  return <Stack>
    <Alert color="yellow" title="תצוגת אשראי לניסוי בלבד — אין להזין כרטיס אמיתי">
      בחרו את פרטי הדוגמה כדי להכיר את התהליך. לא מתבצע חיוב. סליקה תתווסף לאחר חיבור ספק תשלום.
    </Alert>
    <Select label="מספר כרטיס לדוגמה" placeholder="בחרו מספר ניסוי" searchable={false}
      data={['4111 1111 1111 1111']} />
    <SimpleGrid cols={2}>
      <Select label="תוקף לדוגמה" data={['12/30']} placeholder="בחרו תוקף" />
      <Select label="קוד אבטחה לדוגמה" data={['123']} placeholder="בחרו קוד" />
    </SimpleGrid>
    <Text size="sm" c="dimmed">השדות מקבלים רק את הערכים הסינתטיים המוצגים. הבחירה נמחקת במעבר לשלב הבא.</Text>
  </Stack>;
}
