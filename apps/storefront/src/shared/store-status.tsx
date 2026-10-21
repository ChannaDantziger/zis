import { Alert, Button } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from './api/http-client';

export interface StoreStatus {
  storeOpen: boolean;
  lockMessage: string | null;
  dispatchTime: string | null;
  sameDayCutoffTime: string;
  timezone: string;
}

export function useStoreStatus() {
  return useQuery({ queryKey: ['store-status'], queryFn: () => apiRequest<StoreStatus>('/store-status') });
}

export function StoreStatusBanner() {
  const status = useStoreStatus();
  if (status.isError) return <Alert color="orange" title="לא ניתן לבדוק כרגע אם החנות פתוחה" role="alert">
    אפשר לעיין בקטלוג. הוספה לעגלה תתאפשר לאחר אימות זמינות החנות.
    <Button variant="subtle" onClick={() => void status.refetch()}>ניסיון נוסף</Button>
  </Alert>;
  if (!status.data || status.data.storeOpen) return null;
  return <Alert color="orange" title="החנות סגורה להזמנות כרגע" role="status">
    {status.data.lockMessage || 'אפשר להמשיך לעיין בקטלוג.'}
  </Alert>;
}
