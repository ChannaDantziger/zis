import { Alert, Center, Loader, Stack, Text } from '@mantine/core';

export function LoadingState() { return <Center py="xl"><Stack align="center"><Loader color="orange" /><Text c="dimmed">טוען נתונים…</Text></Stack></Center>; }
export function EmptyState({ children = 'אין נתונים להצגה' }: { children?: string }) { return <Center py="xl"><Text c="dimmed">{children}</Text></Center>; }
export function ErrorState({ message }: { message: string }) { return <Alert color="red" title="לא ניתן לטעון את הנתונים">{message}</Alert>; }
