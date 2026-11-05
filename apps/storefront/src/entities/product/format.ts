const currencyFormatter = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });
const AGOROT_PER_SHEKEL = 100;

export function formatPrice(value: string | number): string {
  return currencyFormatter.format(Number(value));
}

export function formatPurchasePrice(unitPrice: string | number, setSize: number, quantitySets: number) {
  const setAgorot = Math.round(Number(unitPrice) * AGOROT_PER_SHEKEL) * setSize;
  const setPrice = formatPrice(setAgorot / AGOROT_PER_SHEKEL);
  return {
    total: formatPrice(setAgorot * quantitySets / AGOROT_PER_SHEKEL),
    setDetail: `${formatPrice(unitPrice)} ליחידה × ${setSize} יחידות = ${setPrice} לסט`,
    detail: `${setPrice} לסט × ${quantitySets} ${quantitySets === 1 ? 'סט' : 'סטים'}`,
  };
}
