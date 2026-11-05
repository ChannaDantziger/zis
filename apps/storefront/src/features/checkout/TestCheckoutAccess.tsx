import { useState } from 'react';
import { Alert, Button, Collapse, PasswordInput, Stack, TextInput } from '@mantine/core';
import { observer } from 'mobx-react-lite';
import { checkoutStore } from './checkout.store';

export const TestCheckoutAccess = observer(function TestCheckoutAccess() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (checkoutStore.testAuthorized) return <Alert color="orange">מצב ניסוי למנהלת: שם המזמין והרחוב יסומנו „ניסוי”. אישור הניסוי אינו חיוב אשראי.</Alert>;
  return <Stack gap="xs">
    <Button variant="subtle" size="compact-sm" disabled={checkoutStore.locked} aria-expanded={open} onClick={() => setOpen((value) => !value)}>כניסת מנהלת להזמנת ניסוי</Button>
    <Collapse in={open}><form onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setError('');
      try { await checkoutStore.authorizeTest(email, password); setEmail(''); }
      catch { setError('הכניסה נכשלה או שאין הרשאה להזמנת ניסוי.'); }
      finally { setPassword(''); setBusy(false); }
    }}><Stack>
      <TextInput label="דוא״ל מנהלת" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.currentTarget.value)} />
      <PasswordInput label="סיסמת מנהלת" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.currentTarget.value)} />
      {error && <Alert color="red">{error}</Alert>}
      <Button type="submit" loading={busy}>כניסה למצב ניסוי</Button>
    </Stack></form></Collapse>
  </Stack>;
});
