import type { CustomerForm } from './checkout.types';

export function validPhone(value: string) {
  return /^\d{2,3}(?:[- .]?\d+)+$/.test(value.trim()) && /^\d{9,10}$/.test(value.replace(/[- .]/g, '').trim());
}

export function customerErrors(customer: CustomerForm) {
  return {
    customerName: !customer.customerName.trim() ? 'יש למלא שם מלא' : customer.customerName.trim().length > 150 ? 'השם ארוך מדי' : '',
    customerPhone: validPhone(customer.customerPhone) ? '' : 'יש להזין 9 או 10 ספרות; אפשר להפריד במקף, רווח או נקודה',
    deliveryPhone: validPhone(customer.deliveryPhone) ? '' : 'יש להזין מספר זמין לקבלת המשלוח: 9 או 10 ספרות',
    customerEmail: /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(customer.customerEmail.trim()) ? '' : 'יש להזין כתובת דוא״ל תקינה, לדוגמה name@example.com',
    street: customer.street.trim() ? '' : 'יש למלא רחוב',
    houseNumber: customer.houseNumber.trim() ? '' : 'יש למלא מספר בית',
  };
}
