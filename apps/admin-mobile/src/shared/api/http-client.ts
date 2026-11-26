const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = adminSessionStore.accessToken;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('לא ניתן להתחבר לשרת. ודאי ששרת ה־API פעיל ושכתובת החיבור שלו מוגדרת נכון.');
    }
    throw error;
  }
  if (path.startsWith('/admin/') && token !== adminSessionStore.accessToken) {
    throw new Error('המשתמש התחלף. יש לרענן את המסך לפני המשך עבודה.');
  }
  if (!response.ok) {
    if (response.status === 401 && path.startsWith('/admin/') && token === adminSessionStore.accessToken) {
      adminSessionStore.clearSession();
    }
    const payload = await response.json().catch(() => null) as { message?: string; error?: { code?: string; message?: string } | string } | null;
    if (payload?.error && typeof payload.error === 'object' && payload.error.code === 'PAYMENT_NOT_CONFIRMED') {
      throw new Error('יש לאשר את התשלום לפני העברת ההזמנה להכנה.');
    }
    const serverMessage = typeof payload?.error === 'object' ? payload.error.message : payload?.error;
    throw new Error(payload?.message ?? serverMessage ?? `הבקשה נכשלה (${response.status})`);
  }
  const payload = response.status === 204 || response.status === 205
    ? undefined as T
    : await response.json() as T;
  if (path.startsWith('/admin/') && token !== adminSessionStore.accessToken) {
    throw new Error('המשתמש התחלף. יש לרענן את המסך לפני המשך עבודה.');
  }
  return payload;
}

export { currentBusinessDate } from './business-date.js';
import { adminSessionStore } from '../../stores/admin-session.store.js';
