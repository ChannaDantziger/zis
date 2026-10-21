import { makeAutoObservable, runInAction } from 'mobx';
import { ApiError } from '../../shared/api/http-client';
import { checkoutApi } from './checkout.api';
import { emptyCustomer, type CheckoutApi, type CheckoutItem, type Confirmation, type CustomerForm,
  type OrderCreated, type OrderInput, type Quote, type QuoteInput, type ShippingMethod, type ShippingZone } from './checkout.types';
import type { StoreStatus } from '../../shared/store-status';

export class CheckoutStore {
  status: StoreStatus | null = null;
  zones: ShippingZone[] = [];
  methods: ShippingMethod[] = [];
  customer = emptyCustomer();
  deliveryDate = '';
  shippingZoneId = '';
  shippingMethodId = '';
  quote: Quote | null = null;
  created: Omit<OrderCreated, 'confirmationToken'> | null = null;
  confirmation: Confirmation | null = null;
  busy = false;
  loading = false;
  error = '';
  confirmationError = '';
  private version = 0;
  private loadVersion = 0;
  private quotedInput = '';
  private attempt: { input: OrderInput; key: string } | null = null;
  private token = '';
  constructor(private api: CheckoutApi = checkoutApi, private makeKey = () => crypto.randomUUID()) {
    makeAutoObservable<this, 'api' | 'makeKey'>(this, { api: false, makeKey: false }, { autoBind: true });
  }
  get hasPrivateConfirmation() { return Boolean(this.token); }
  get locked() { return this.busy || Boolean(this.attempt) || Boolean(this.created); }
  get canQuote() { return !this.locked && this.status?.storeOpen && this.shippingZoneId && this.shippingMethodId && this.deliveryDate; }
  get canCreate() { return !this.locked && Boolean(this.quote) && this.validCustomer; }
  get retryPending() { return Boolean(this.attempt) && !this.created; }
  get validCustomer() {
    return Boolean(this.customer.customerName.trim() && this.customer.customerName.trim().length <= 150 && /^[+0-9() -]{7,20}$/.test(this.customer.customerPhone.trim())
      && this.customer.customerPhone.replace(/\D/g, '').length >= 7 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.customer.customerEmail.trim())
      && this.customer.street.trim() && this.customer.houseNumber.trim());
  }
  setCustomer(field: keyof CustomerForm, value: string) { if (!this.locked) this.customer[field] = value; }
  setDelivery(field: 'deliveryDate' | 'shippingZoneId' | 'shippingMethodId', value: string) {
    if (this.locked) return;
    this[field] = value;
    this.invalidateQuote();
  }
  invalidateQuote() { this.version++; this.busy = false; this.quote = null; this.quotedInput = ''; this.error = ''; }
  async load() {
    const version = ++this.loadVersion;
    this.loading = true; this.error = ''; this.quote = null;
    try {
      const [status, zones, methods] = await Promise.all([this.api.status(), this.api.zones(), this.api.methods()]);
      runInAction(() => {
        if (version !== this.loadVersion) return;
        this.status = status; this.zones = zones.data; this.methods = methods.data;
      });
    } catch { runInAction(() => { if (version === this.loadVersion) { this.status = null; this.error = 'לא ניתן לטעון את אפשרויות ההזמנה. נסו שוב.'; } }); }
    finally { runInAction(() => { if (version === this.loadVersion) this.loading = false; }); }
  }
  async preview(items: CheckoutItem[]) {
    if (!this.canQuote || !items.length) return;
    const version = ++this.version;
    const input = this.quoteInput(items);
    this.busy = true; this.quote = null; this.error = '';
    try {
      const availability = await this.api.availability({ deliveryDate: input.deliveryDate, items: input.items });
      if (!availability.available) throw new Error('unavailable');
      const quote = await this.api.quote(input);
      runInAction(() => {
        if (version !== this.version) return;
        if (quote.availability !== 'available') { this.error = 'הכמות המבוקשת אינה זמינה. חזרו לעגלה לעדכון הפריטים.'; return; }
        this.quote = quote; this.quotedInput = JSON.stringify(input);
      });
    } catch (error) { runInAction(() => { if (version === this.version) this.error = message(error, false); }); }
    finally { runInAction(() => { if (version === this.version) this.busy = false; }); }
  }
  async submit(items: CheckoutItem[]) {
    if (this.busy || this.created) return;
    if (!this.attempt) {
      if (!this.canCreate || JSON.stringify(this.quoteInput(items)) !== this.quotedInput) {
        this.invalidateQuote(); this.error = 'בדקו שוב מחיר וזמינות לפני יצירת ההזמנה.'; return;
      }
      const zone = this.zones.find((entry) => entry.shippingZoneId === this.shippingZoneId);
      if (!zone) return;
      const customer = Object.fromEntries(Object.entries(this.customer).map(([key, value]) => [key, value.trim()])) as unknown as CustomerForm;
      this.attempt = { key: this.makeKey(), input: { ...this.quoteInput(items),
        customerName: customer.customerName, customerPhone: customer.customerPhone, customerEmail: customer.customerEmail,
        deliveryAddress: { city: zone.city, neighborhood: zone.neighborhood, street: customer.street,
          houseNumber: customer.houseNumber, apartment: customer.apartment, postalCode: customer.postalCode, venueName: customer.venueName },
        dedicationText: customer.dedicationText, customerNotes: customer.customerNotes } };
    }
    const version = this.version;
    this.busy = true; this.error = '';
    try {
      const response = await this.api.create(this.attempt.input, this.attempt.key);
      runInAction(() => {
        if (version !== this.version) return;
        const { confirmationToken, ...created } = response;
        this.created = created; this.token = confirmationToken; this.customer = emptyCustomer();
        this.attempt = null; this.quote = null;
      });
      if (version === this.version) await this.refreshConfirmation();
    } catch (error) {
      runInAction(() => {
        if (version !== this.version) return;
        const definitive = error instanceof ApiError && ([400, 401, 403, 404, 422].includes(error.status)
          || (error.status === 503 && ['ORDER_CREATION_NOT_CONFIGURED', 'COMMERCE_TAX_NOT_CONFIGURED'].includes(error.code)));
        if (definitive) { this.attempt = null; this.quote = null; }
        this.error = message(error, !definitive);
      });
    } finally { runInAction(() => { if (version === this.version) this.busy = false; }); }
  }
  async refreshConfirmation() {
    if (!this.token) return;
    const version = this.version;
    this.confirmationError = '';
    try {
      const confirmation = await this.api.confirmation(this.token);
      runInAction(() => { if (version === this.version) this.confirmation = confirmation; });
    } catch { runInAction(() => { if (version === this.version) this.confirmationError = 'ההזמנה נשמרה, אך לא ניתן לרענן את האישור הפרטי כרגע.'; }); }
  }
  leave() { if (this.retryPending) return; this.token = ''; this.customer = emptyCustomer(); if (!this.created) this.dispose(); }
  dispose() {
    this.version++; this.loadVersion++; this.customer = emptyCustomer(); this.attempt = null; this.token = '';
    this.created = null; this.confirmation = null; this.quote = null; this.busy = false; this.loading = false;
  }
  private quoteInput(items: CheckoutItem[]): QuoteInput {
    return { deliveryDate: this.deliveryDate, shippingZoneId: this.shippingZoneId, shippingMethodId: this.shippingMethodId,
      items: items.map(({ productId, productVariantId, quantitySets }) => ({ productId, productVariantId, quantitySets })) };
  }
}
function message(error: unknown, uncertain: boolean) {
  if (error instanceof ApiError && error.code === 'MINIMUM_ORDER_NOT_MET') return 'סכום המוצרים נמוך ממינימום ההזמנה. הוסיפו מוצרים לעגלה כדי להמשיך; דמי המשלוח אינם נכללים במינימום.';
  if (error instanceof ApiError && error.status === 503) return 'יצירת הזמנות אינה זמינה כרגע. לא בוצע חיוב. אפשר לנסות שוב את אותה בקשה לאחר חזרת השירות.';
  if (uncertain) return 'לא ניתן לאמת אם ההזמנה נשמרה. נסו שוב כאן עם אותה בקשה; אל תפתחו הזמנה נוספת ואל תרעננו את הדף.';
  if (error instanceof ApiError && error.status === 503) return 'יצירת הזמנות אינה זמינה כרגע. לא בוצע חיוב.';
  if (error instanceof ApiError && error.status === 422) return 'לא ניתן להזמין במועד, באזור או בכמות שבחרתם. בדקו את פרטי המשלוח, המינימום והזמינות.';
  return 'לא ניתן לאשר מחיר וזמינות. בדקו את הפרטים ונסו שוב. הפריטים נשארים בעגלה.';
}

export const checkoutStore = new CheckoutStore();
