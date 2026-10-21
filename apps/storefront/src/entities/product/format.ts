const currencyFormatter = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });

export function formatPrice(value: string | number): string {
  return currencyFormatter.format(Number(value));
}
