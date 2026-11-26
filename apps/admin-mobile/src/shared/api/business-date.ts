export function currentBusinessDate(): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isBusinessDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function shouldResetOrderDate(previousPath: string, nextPath: string, selectedDate: string, today: string): boolean {
  const inOrders = (path: string) => path === '/orders' || path.startsWith('/orders/');
  return inOrders(previousPath) && !inOrders(nextPath) && selectedDate !== today;
}
