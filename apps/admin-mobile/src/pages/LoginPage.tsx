import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Center, PasswordInput, Stack, Text, TextInput, ThemeIcon, Title } from '@mantine/core';
import { IconLock, IconTruck } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { request } from '../shared/api/http-client.js';
import { adminSessionStore } from '../stores/admin-session.store.js';

type LoginResponse = { accessToken: string };

export function LoginPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      client.clear();
      adminSessionStore.setSession(result.accessToken);
      navigate('/', { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'ההתחברות נכשלה');
    } finally {
      setIsSubmitting(false);
    }
  }

  return <Center mih="100vh" p="md" className="login-page"><Card component="form" onSubmit={submit} withBorder radius="xl" p={{ base: 'lg', sm: 36 }} maw={440} w="100%" shadow="sm">
    <Stack gap="lg">
      <Stack align="center" gap="xs"><ThemeIcon size={54} radius="xl" color="orange"><IconTruck size={28} /></ThemeIcon><Title order={1}>כניסה לניהול ZIS</Title><Text c="dimmed" ta="center">ניהול הזמנות, ייצור ומשלוחים במקום אחד</Text></Stack>
      {error && <Alert color="red" icon={<IconLock size={18} />} title="לא הצלחנו להתחבר">{error}</Alert>}
      <TextInput label="אימייל" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.currentTarget.value)} required autoComplete="email" />
      <PasswordInput label="סיסמה" placeholder="הסיסמה שלך" value={password} onChange={(event) => setPassword(event.currentTarget.value)} required autoComplete="current-password" />
      <Button type="submit" size="md" loading={isSubmitting} fullWidth>כניסה לדשבורד</Button>
      <Text size="xs" c="dimmed" ta="center">הגישה זמינה למשתמשי Admin פעילים בלבד.</Text>
    </Stack>
  </Card></Center>;
}
