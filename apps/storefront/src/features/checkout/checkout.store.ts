import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '../../shared/api/http-client';
import { ApiError } from '../../shared/api/http-client';
import { checkoutApi } from './checkout.api';
import { customerErrors } from './customer-validation';
import { emptyCustomer, type CheckoutApi, type CheckoutItem, type Confirmation, type CustomerForm,
  type OrderCreated, type OrderInput, type Quote, type QuoteInput, type ShippingZone } from './checkout.types';
import type { StoreStatus } from '../../shared/store-status';
import { cartKey, cartStore, OUT_OF_STOCK_MESSAGE } from '../../stores/cart.store';
import { isQuantity, MAX_CART_LINES } from '../../stores/cart.persistence';
import { checkoutErrorMessage, testPaymentError } from './checkout.errors';
import { clearCheckoutRecovery, readCheckoutRecovery, writeCheckoutRecovery } from './checkout.recovery';

const TEST_AUTHORIZATION_TTL_MS = 60_000;
const TEST_AUTHORIZATION_EXPIRED_MESSAGE = 'הרשאת המנהלת כבר אינה פעילה כי עברו יותר מדי זמן. יש להתחבר שוב כדי לאשר את התשלום המדומה.';

export class CheckoutStore {
  status: StoreStatus | null = null;
  zones: ShippingZone[] = [];
  customer = emptyCustomer();
  deliveryDate = '';
  shippingZoneId = '';
  availableDates: string[] = [];
  datesLoading = false;
  datesError = '';
  private datesVersion = 0;
  quote: Quote | null = null;
  created: Omit<OrderCreated, 'confirmationToken'> | null = null;
  confirmation: Confirmation | null = null;
  busy = false;
  loading = false;
  error = '';
  confirmationError = '';
  private version = 0;
  private loadVersion = 0;
  private confirmationVersion = 0;
  private quotedInput = '';
  private attempt: { input: OrderInput; key: string } | null = null;
  private token = '';
  private adminToken = '';
  private adminTokenExpiresAt = 0;
  private adminTokenTimer: ReturnType<typeof setTimeout> | null = null;
  testAuthorizationExpired = false;
  testOrderRequested = false;
  private testOrderVersion = '';
  simulatedPaid = false;
  pendingItems: CheckoutItem[] = [];
  pendingCartKeys = new Set<string>();
  removedPendingItems: CheckoutItem[] = [];
  pendingConflict = false;
  private savedPendingItems = '';
  private pendingUpdate: { input: { items: CheckoutItem[]; expectedVersion: string }; key: string } | null = null;
  get pendingUpdatePending() { return Boolean(this.pendingUpdate); }
  get pendingItemsChanged() { return JSON.stringify(this.pendingItems) !== this.savedPendingItems; }
  get canEditPending() { return Boolean(this.created?.status === 'ordered' && this.created.paymentStatus === 'pending' && this.token && this.created.version) && !this.simulatedPaid && !this.busy && !this.pendingUpdate && !this.pendingConflict; }
  setPendingQuantity(key: string, quantitySets: number) {
    if (!this.canEditPending || !isQuantity(quantitySets)) return;
    const item = this.pendingItems.find(item => cartKey(item) === key);
    if (item) item.quantitySets = quantitySets;
  }
  addPendingItem(item: CheckoutItem) {
    if (!this.canEditPending || !isQuantity(item.quantitySets) || this.pendingItems.length >= MAX_CART_LINES
      || this.pendingItems.some(existing => cartKey(existing) === cartKey(item))) return;
    this.pendingItems.push({ ...item });
    this.pendingCartKeys.add(cartKey(item));
    this.removedPendingItems = this.removedPendingItems.filter(removed => cartKey(removed) !== cartKey(item));
  }
  removePendingItem(key: string) {
    if (!this.canEditPending || this.pendingItems.length <= 1) return;
    const removed = this.pendingItems.find(item => cartKey(item) === key);
    if (removed && !this.removedPendingItems.some(item => cartKey(item) === key)) this.removedPendingItems.push({ ...removed });
    this.pendingItems = this.pendingItems.filter(item => cartKey(item) !== key);
  }
  async savePendingItems() {
    if (!this.api.updatePending || !this.token || !this.created?.version || this.created.status !== 'ordered'
      || this.created.paymentStatus !== 'pending' || !this.pendingItems.length || this.busy || this.simulatedPaid || this.pendingConflict) return;
    if (!this.pendingUpdate) {
      if (!this.pendingItemsChanged) return;
      this.pendingUpdate = { key: this.makeKey(), input: { expectedVersion: this.created.version, items: this.pendingItems.map(item => ({ ...item })) } };
    }
    this.busy = true; this.confirmationError = '';
    const version = ++this.version;
    this.confirmationVersion++;
    try {
      const response = await this.api.updatePending(this.token, this.pendingUpdate.input, this.pendingUpdate.key);
      runInAction(() => {
        if (version !== this.version) return;
        const { confirmationToken, ...created } = response;
        this.created = created; this.token = confirmationToken; this.testOrderVersion = response.version ?? '';
        this.savedPendingItems = JSON.stringify(this.pendingUpdate!.input.items); this.pendingUpdate = null;
        this.confirmation = null;
      });
      if (version === this.version) await this.refreshConfirmation();
    } catch (error) {
      runInAction(() => {
        if (version !== this.version) return;
        const definitive = error instanceof ApiError && ([400, 401, 403, 404, 409, 422].includes(error.status)
          || (error.status === 503 && error.code === 'PENDING_ORDER_EDIT_NOT_CONFIGURED'));
        if (definitive) this.pendingUpdate = null;
        if (error instanceof ApiError && error.code === 'ORDER_CHANGED') this.pendingConflict = true;
        this.confirmationError = error instanceof ApiError && error.code === 'MINIMUM_ORDER_NOT_MET'
          ? 'סכום המוצרים נמוך ממינימום ההזמנה. הגדילו כמות או הוסיפו מוצרים להזמנה כדי לשמור את השינוי; דמי המשלוח אינם נכללים במינימום.'
        : definitive ? checkoutErrorMessage(error, false) : 'לא ניתן לאמת אם שינוי ההזמנה נשמר. נסו שוב כאן עם אותה בקשה לפני תשלום.';
      });
    } finally { runInAction(() => { if (version === this.version) this.busy = false; }); }
  }
  async reloadPendingItems() {
    if (!this.pendingConflict || !this.token || this.busy || this.pendingUpdate) return;
    const version = this.version; const request = ++this.confirmationVersion;
    this.busy = true;
    try {
      const confirmation = await this.api.confirmation(this.token);
      if (!confirmation.version || !confirmation.items?.length) throw new Error('Pending items are unavailable');
      runInAction(() => {
        if (version !== this.version || request !== this.confirmationVersion || !this.created) return;
        this.pendingItems = confirmation.items!.map(item => ({ productId: item.productId, quantitySets: item.quantitySets }));
        this.savedPendingItems = JSON.stringify(this.pendingItems);
        this.pendingItems.forEach(item => this.pendingCartKeys.add(cartKey(item))); this.removedPendingItems = [];
        this.created = { ...this.created, version: confirmation.version, total: confirmation.total, status: confirmation.status, paymentStatus: confirmation.paymentStatus };
        this.testOrderVersion = confirmation.version!; this.confirmation = confirmation; this.pendingConflict = false; this.confirmationError = '';
      });
    } catch { runInAction(() => { if (version === this.version && request === this.confirmationVersion) this.confirmationError = 'לא ניתן לטעון את פרטי ההזמנה העדכניים. העריכה והתשלום חסומים; נסו שוב כאן.'; }); }
    finally { runInAction(() => { if (version === this.version) this.busy = false; }); }
  }
  get testAuthorized() { return Boolean(this.adminToken && Date.now() < this.adminTokenExpiresAt); }
  async authorizeTest(email: string, password: string) {
    const result = await apiRequest<{ accessToken: string; user: { role: string } }>('/auth/login', { method: 'POST', cache: 'no-store', body: JSON.stringify({ email, password }) });
    if (result.user.role !== 'operations_manager') throw new Error('forbidden');
    runInAction(() => {
      this.clearTestAuthorizationTimer();
      this.adminToken = result.accessToken;
      this.adminTokenExpiresAt = Date.now() + TEST_AUTHORIZATION_TTL_MS;
      this.testAuthorizationExpired = false;
      this.testOrderRequested = true;
      this.confirmationError = '';
      this.adminTokenTimer = setTimeout(this.expireTestAuthorization, TEST_AUTHORIZATION_TTL_MS);
    });
    if (this.created && this.confirmation?.isTest) {
      await this.refreshConfirmation();
      if (this.confirmation?.paymentStatus !== 'pending') return;
    }
  }
  private clearTestAuthorizationTimer() {
    if (this.adminTokenTimer) clearTimeout(this.adminTokenTimer);
    this.adminTokenTimer = null;
  }
  private expireTestAuthorization() {
    runInAction(() => {
      this.adminToken = '';
      this.adminTokenExpiresAt = 0;
      this.adminTokenTimer = null;
      this.testAuthorizationExpired = true;
    });
  }
  async approveTestPayment() {
    if (!this.testAuthorized) {
      this.expireTestAuthorization();
      return;
    }
    if (!this.created || !this.confirmation?.isTest || !this.testOrderVersion || this.simulatedPaid || this.busy || this.pendingItemsChanged || this.pendingUpdate || this.pendingConflict) return;
    this.busy = true; this.confirmationError = '';
    try {
      const refreshed = await this.refreshConfirmation();
      if (!refreshed || this.pendingConflict || this.simulatedPaid || this.confirmation?.paymentStatus !== 'pending' || !this.confirmation.isTest) return;
      const approval = await apiRequest<{ paymentStatus: string; version: string }>('/admin/test-orders/' + encodeURIComponent(this.created.orderId) + '/approve-payment', {
        method: 'POST', cache: 'no-store', headers: { Authorization: 'Bearer ' + this.adminToken },
        body: JSON.stringify({ reason: 'אישור הזמנת ניסוי מהחנות — ללא חיוב אשראי', expectedVersion: this.testOrderVersion }),
      });
      runInAction(() => {
        this.simulatedPaid = approval.paymentStatus === 'paid';
        this.testOrderVersion = approval.version;
        if (this.created) {
          this.created.paymentStatus = approval.paymentStatus;
          this.created.version = approval.version;
        }
      });
      await this.refreshConfirmation();
      } catch (error) { runInAction(() => {
      this.confirmationError = testPaymentError(error);
    }); }
    finally { runInAction(() => { this.busy = false; }); }
  }
  constructor(private api: CheckoutApi = checkoutApi, private makeKey = () => crypto.randomUUID()) {
    makeAutoObservable<this, 'api' | 'makeKey' | 'adminTokenTimer' | 'adminTokenExpiresAt'>(this, {
      api: false, makeKey: false, adminTokenTimer: false, adminTokenExpiresAt: false,
    }, { autoBind: true });
  }
  get hasPrivateConfirmation() { return Boolean(this.token); }
  get locked() { return this.busy || Boolean(this.attempt) || Boolean(this.created); }
  get canQuote() { return !this.locked && !this.loading && !this.datesLoading && !this.datesError && this.status?.storeOpen
    && this.zones.some(zone => zone.shippingZoneId === this.shippingZoneId) && this.deliveryDate
    && (!this.api.dates || this.availableDates.includes(this.deliveryDate)); }
  get canCreate() { return Boolean(this.canQuote && this.quote && this.validCustomer); }
  canContinueDelivery(items: CheckoutItem[]) { return this.canCreate && JSON.stringify(this.quoteInput(items)) === this.quotedInput; }
  get retryPending() { return Boolean(this.attempt) && !this.created; }
  get validationErrors() { return customerErrors(this.customer); }
  get validCustomer() { return Object.values(this.validationErrors).every((error) => !error); }
  setCustomer(field: keyof CustomerForm, value: string) { if (!this.locked) this.customer[field] = value; }
  setDelivery(field: 'deliveryDate' | 'shippingZoneId', value: string) {
    if (this.locked) return;
    this[field] = value;
    this.invalidateQuote();
  }
  async loadDates() {
    const version = ++this.datesVersion;
    this.availableDates = []; this.datesError = ''; this.datesLoading = false;
    if (!this.api.dates) return;
    this.datesLoading = true;
    try {
      const result = await this.api.dates();
      runInAction(() => { if (version === this.datesVersion) this.availableDates = result.availableDates; });
    } catch { runInAction(() => { if (version === this.datesVersion) this.datesError = 'לא ניתן לטעון תאריכי משלוח. נסו שוב.'; }); }
    finally { runInAction(() => { if (version === this.datesVersion) this.datesLoading = false; }); }
  }
  invalidateQuote() { this.version++; this.busy = false; this.quote = null; this.quotedInput = ''; this.error = ''; }
  async load() {
    const version = ++this.loadVersion;
    this.loading = true; this.error = ''; this.quote = null;
    if (!this.created) {
      const recovery = readCheckoutRecovery();
      if (recovery) {
        this.token = recovery.token;
        this.created = recovery.order;
        this.pendingItems = [];
        this.pendingCartKeys.clear();
      }
    }
    void this.loadDates();
    try {
      const [status, zones] = await Promise.all([this.api.status(), this.api.zones()]);
      runInAction(() => {
        if (version !== this.loadVersion) return;
        this.status = status; this.zones = zones.data;
      });
    } catch { runInAction(() => { if (version === this.loadVersion) { this.status = null; this.error = 'לא ניתן לטעון את אפשרויות ההזמנה. נסו שוב.'; } }); }
    finally { runInAction(() => { if (version === this.loadVersion) this.loading = false; }); }
    if (version === this.loadVersion && this.token) await this.refreshConfirmation();
  }
  async preview(items: CheckoutItem[]) {
    if (!this.canQuote || !items.length) return;
    const version = ++this.version;
    const input = this.quoteInput(items);
    this.busy = true; this.quote = null; this.error = '';
    try {
      const availability = await this.api.availability({ deliveryDate: input.deliveryDate, items: input.items });
      if (!availability.available) throw new ApiError(OUT_OF_STOCK_MESSAGE, 422, 'STOCK_UNAVAILABLE');
      const quote = await this.api.quote(input);
      runInAction(() => {
        if (version !== this.version) return;
        if (quote.availability !== 'available') { this.error = OUT_OF_STOCK_MESSAGE; return; }
        this.quote = quote; this.quotedInput = JSON.stringify(input);
      });
    } catch (error) { runInAction(() => { if (version === this.version) this.error = checkoutErrorMessage(error, false); }); }
    finally { runInAction(() => { if (version === this.version) this.busy = false; }); }
  }
  async submit(items: CheckoutItem[]) {
    if (this.busy || this.created) return;
    if (this.testOrderRequested && !this.testAuthorized) {
      this.expireTestAuthorization();
      runInAction(() => { this.error = TEST_AUTHORIZATION_EXPIRED_MESSAGE; });
      return;
    }
    if (!this.attempt) {
      if (!this.canCreate || JSON.stringify(this.quoteInput(items)) !== this.quotedInput) {
        this.invalidateQuote(); this.error = 'פרטי ההזמנה השתנו. המתינו לחישוב הסכום המעודכן לפני ההמשך.'; return;
      }
      const zone = this.zones.find((entry) => entry.shippingZoneId === this.shippingZoneId);
      if (!zone) return;
      const customer = Object.fromEntries(Object.entries(this.customer).map(([key, value]) => [key, value.trim()])) as unknown as CustomerForm;
      this.attempt = { key: this.makeKey(), input: { ...this.quoteInput(items),
        customerName: customer.customerName, customerPhone: customer.customerPhone, deliveryPhone: customer.deliveryPhone, customerEmail: customer.customerEmail,
        deliveryAddress: { city: zone.city, neighborhood: zone.neighborhood, street: customer.street,
          houseNumber: customer.houseNumber, apartment: customer.apartment, postalCode: customer.postalCode, venueName: customer.venueName },
        dedicationText: customer.dedicationText, customerNotes: customer.customerNotes } };
    }
    const version = this.version;
    this.busy = true; this.error = '';
    try {
      const response = this.adminToken ? await apiRequest<OrderCreated & { version: string }>('/admin/test-orders', {
        method: 'POST', cache: 'no-store', headers: { Authorization: 'Bearer ' + this.adminToken, 'Idempotency-Key': this.attempt.key },
        body: JSON.stringify(this.attempt.input),
      }) : await this.api.create(this.attempt.input, this.attempt.key);
      runInAction(() => {
        if (version !== this.version) return;
        const { confirmationToken, ...created } = response;
        this.pendingItems = this.attempt!.input.items.map(item => ({ ...item }));
        this.pendingCartKeys = new Set(this.pendingItems.map(cartKey)); this.removedPendingItems = [];
        this.savedPendingItems = JSON.stringify(this.pendingItems);
        this.created = created; this.token = confirmationToken;
        writeCheckoutRecovery(confirmationToken, created);
        if (JSON.stringify(cartStore.items) === JSON.stringify(this.attempt!.input.items)) cartStore.clear();
        if ('version' in response) { this.testOrderVersion = String(response.version); this.simulatedPaid = response.paymentStatus === 'paid'; } this.customer = emptyCustomer();
        this.attempt = null; this.quote = null;
      });
      if (version === this.version) await this.refreshConfirmation();
    } catch (error) {
      runInAction(() => {
        if (version !== this.version) return;
        const definitive = error instanceof ApiError && ([400, 401, 403, 404, 422].includes(error.status)
          || (error.status === 503 && error.code === 'ORDER_CREATION_NOT_CONFIGURED'));
        if (definitive) { this.attempt = null; this.quote = null; }
        this.error = checkoutErrorMessage(error, !definitive);
      });
    } finally { runInAction(() => { if (version === this.version) this.busy = false; }); }
  }
  async refreshConfirmation(): Promise<boolean> {
    if (!this.token) return false;
    const version = this.version;
    const request = ++this.confirmationVersion;
    let refreshed = false;
    this.confirmationError = '';
    try {
      const confirmation = await this.api.confirmation(this.token);
      runInAction(() => {
        if (version !== this.version || request !== this.confirmationVersion) return;
        this.confirmation = confirmation;
        if (this.created?.paymentStatus === 'pending' && !this.pendingItems.length && confirmation.items?.length) {
          this.pendingItems = confirmation.items.map(item => ({ productId: item.productId, quantitySets: item.quantitySets }));
          this.savedPendingItems = JSON.stringify(this.pendingItems);
          this.pendingItems.forEach(item => this.pendingCartKeys.add(cartKey(item)));
        }
        if (this.created) this.created.status = confirmation.status;
        if (this.created?.paymentStatus === 'pending' && confirmation.paymentStatus === 'pending' && !this.simulatedPaid
          && this.created.version && confirmation.version && confirmation.version !== this.created.version) {
          this.pendingConflict = true; this.confirmationError = 'ההזמנה השתנתה במקביל. טענו את פרטי ההזמנה העדכניים לפני עריכה או תשלום.'; return;
        }
        if (this.created && confirmation.version) { this.created.version = confirmation.version; this.testOrderVersion = confirmation.version; }
        if (this.created && confirmation.paymentStatus === 'paid') this.created.paymentStatus = 'paid';
        if (confirmation.isTest) this.testOrderRequested = true;
        if (confirmation.isTest && confirmation.paymentStatus === 'paid') this.simulatedPaid = true;
        if (this.created) writeCheckoutRecovery(this.token, this.created);
        refreshed = true;
      });
      return refreshed;
    } catch {
      runInAction(() => { if (version === this.version && request === this.confirmationVersion) this.confirmationError = 'ההזמנה נשמרה, אך לא ניתן לרענן את האישור הפרטי כרגע.'; });
      return false;
    }
  }
  leave() { if (this.retryPending || this.pendingUpdate || (this.created?.paymentStatus === 'pending' && !this.simulatedPaid)) return; this.clearTestAuthorizationTimer(); this.adminToken = ''; this.adminTokenExpiresAt = 0; this.token = ''; clearCheckoutRecovery(); this.customer = emptyCustomer(); if (!this.created) this.dispose(); }
  dispose() {
    clearCheckoutRecovery();
    this.clearTestAuthorizationTimer();
    this.version++; this.loadVersion++; this.confirmationVersion++; this.datesVersion++; this.availableDates = []; this.datesLoading = false; this.customer = emptyCustomer(); this.attempt = null; this.token = '';
    this.adminToken = ''; this.adminTokenExpiresAt = 0; this.testAuthorizationExpired = false; this.testOrderRequested = false; this.testOrderVersion = ''; this.simulatedPaid = false; this.created = null; this.confirmation = null; this.quote = null; this.busy = false; this.loading = false;
    this.pendingItems = []; this.savedPendingItems = ''; this.pendingUpdate = null;
    this.pendingCartKeys.clear(); this.removedPendingItems = [];
    this.pendingConflict = false;
  }
  private quoteInput(items: CheckoutItem[]): QuoteInput {
    return { deliveryDate: this.deliveryDate, shippingZoneId: this.shippingZoneId,
      items: items.map(({ productId, quantitySets }) => ({ productId, quantitySets })) };
  }
}
export const checkoutStore = new CheckoutStore();
