import { makeAutoObservable, runInAction } from 'mobx';
import { request } from '../../shared/api/http-client.js';
import type { ManagedCatalog, ManagedProduct, ManagedVariant } from './catalog.types.js';
import type { ManagedCategory } from './catalog.types.js';

const EMPTY_PRODUCT = { productId: '', categoryId: '', name: '', description: null as string | null, setSize: 1, pricePerUnit: '0.00', availableItems: 0, displayOrder: 10, status: 'active' as const, version: '', isVisible: false, visibilityReasons: ['המוצר טרם נשמר'], variants: [], images: [] };
const EMPTY_VARIANT = { productVariantId: '', name: '', productCode: '', pricePerUnit: '0.00', availableSets: 0, lowStockThresholdSets: 0, defaultProductionQuantitySets: 1, isDefault: false, status: 'hidden' as const, version: '' };

export class CatalogStore {
  private generation = 0;
  private loadSequence = 0;
  private savedProductId = '';
  private savedVariantProductId = '';
  private productSnapshot = '';
  catalog: ManagedCatalog | null = null;
  product: ManagedProduct | null = null;
  variant: ManagedVariant | null = null;
  page = 1;
  loading = false;
  saving = false;
  error = '';
  success = '';
  category: ManagedCategory | null = null;
  selectedCategoryId = '';
  editorMode: 'basic' | 'advanced' = 'basic';
  constructor() { makeAutoObservable(this); }
  get selectedCategory() { return this.catalog?.categories.find((category) => category.categoryId === this.selectedCategoryId); }
  get productHasChanges() { return !!this.product && snapshot(this.product) !== this.productSnapshot; }
  acceptProduct(product: ManagedProduct) { this.product = product; this.productSnapshot = snapshot(product); }
  setEditorMode(mode: 'basic' | 'advanced') { if (!this.saving) this.editorMode = mode; }
  selectCategory(categoryId: string) { if (this.saving || !this.close()) return; this.selectedCategoryId = categoryId; this.page = 1; this.success = ''; void this.load(1); }
  get productNeedsRefresh() { return !!this.savedProductId; }
  get variantNeedsRefresh() { return !!this.savedVariantProductId; }
  reset() { this.savedProductId = this.savedVariantProductId = ''; this.generation++; this.loadSequence++; this.catalog = null; this.product = null; this.variant = null; this.category = null; this.selectedCategoryId = ''; this.editorMode = 'basic'; this.page = 1; this.loading = false; this.saving = false; this.error = this.success = ''; }
  async load(page = this.page) {
    const generation = this.generation, sequence = ++this.loadSequence;
    this.loading = true; this.error = ''; this.page = page;
    const params = new URLSearchParams({ page: String(page) });
    if (this.selectedCategoryId) params.set('categoryId', this.selectedCategoryId);
    try { const data = await request<ManagedCatalog>(`/admin/products?${params}`); runInAction(() => { if (generation === this.generation && sequence === this.loadSequence) this.catalog = data; }); }
    catch (error) { runInAction(() => { if (generation === this.generation && sequence === this.loadSequence) this.error = message(error); }); }
    finally { runInAction(() => { if (generation === this.generation && sequence === this.loadSequence) this.loading = false; }); }
  }
  newProduct() { if (this.saving) return; this.savedProductId = this.savedVariantProductId = ''; this.acceptProduct({ ...EMPTY_PRODUCT, categoryId: this.selectedCategoryId, variants: [], images: [] }); this.editorMode = 'basic'; this.variant = null; this.success = ''; }
  editProduct(value: ManagedProduct) { if (this.saving) return; this.savedProductId = this.savedVariantProductId = ''; this.acceptProduct({ ...value }); this.editorMode = 'basic'; this.variant = null; this.success = ''; }
  editVariant(value?: ManagedVariant) { if (this.saving) return; this.savedVariantProductId = ''; this.variant = { ...(value ?? EMPTY_VARIANT) }; }
  editCategory(value?: ManagedCategory) { if (this.saving) return; this.category = value ? { ...value } : { categoryId: '', name: '', sortOrder: this.catalog?.categories.length ?? 0, status: 'active' }; this.error = ''; this.success = ''; }
  close(confirmUnsaved = true) {
    if (this.saving) return false;
    if (confirmUnsaved && this.productHasChanges && typeof window !== 'undefined' && !window.confirm('יש שינויים שלא נשמרו במוצר. לצאת בלי לשמור?')) return false;
    this.product = null; this.variant = null; this.category = null; return true;
  }
  closeCategory() { if (!this.saving) this.category = null; }
  async saveCategory() {
    if (!this.category || this.saving) return;
    const generation = this.generation, form = { ...this.category }, isEdit = !!form.categoryId;
    this.saving = true; this.error = ''; this.success = '';
    try {
      const result = await request<{ categoryId: string }>(isEdit ? `/admin/categories/${form.categoryId}` : '/admin/categories', { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify({ name: form.name, sortOrder: form.sortOrder, status: form.status }) });
      if (generation !== this.generation) return;
      this.category = null;
      if (!isEdit) { this.selectedCategoryId = result.categoryId; this.page = 1; }
      await this.load();
      if (generation === this.generation) this.success = isEdit ? 'הקטגוריה עודכנה' : 'הקטגוריה נוצרה';
    } catch (error) { runInAction(() => { if (generation === this.generation) this.error = message(error); }); }
    finally { runInAction(() => { if (generation === this.generation) this.saving = false; }); }
  }
  setProduct<K extends keyof ManagedProduct>(key: K, value: ManagedProduct[K]) { if (this.product && !this.productNeedsRefresh) this.product[key] = value; }
  setVariant<K extends keyof ManagedVariant>(key: K, value: ManagedVariant[K]) { if (this.variant && !this.variantNeedsRefresh) this.variant[key] = value; }
  async saveProduct() {
    if (!this.product || this.saving) return;
    const generation = this.generation;
    const form = { ...this.product }; this.saving = true; this.error = ''; this.success = '';
    try {
      const result = this.savedProductId ? { productId: this.savedProductId } : await request<{ productId: string }>(form.productId ? `/admin/products/${form.productId}` : '/admin/products', { method: form.productId ? 'PATCH' : 'POST', body: JSON.stringify(form) });
      if (generation !== this.generation) return;
      runInAction(() => { this.savedProductId = result.productId; });
      const saved = await request<ManagedProduct>("/admin/products/" + result.productId);
      if (generation !== this.generation) return;
      runInAction(() => { if (this.selectedCategoryId !== saved.categoryId) this.page = 1; this.selectedCategoryId = saved.categoryId; });
      await this.load();
      if (generation !== this.generation) return;
      runInAction(() => { this.acceptProduct(saved); this.savedProductId = ''; this.success = 'המוצר נשמר'; });
    } catch (error) { runInAction(() => { if (generation === this.generation) this.error = (this.savedProductId || this.savedVariantProductId ? 'הנתונים נשמרו; יש לנסות שוב לרענון בלבד. ' : '') + message(error); }); }
    finally { runInAction(() => { if (generation === this.generation) this.saving = false; }); }
  }
  async saveVariant() {
    if (!this.variant || !this.product?.productId || this.saving) return;
    const generation = this.generation;
    const form = { ...this.variant }, productId = this.product.productId;
    this.saving = true; this.error = ''; this.success = '';
    try {
      if (!this.savedVariantProductId) await request(form.productVariantId ? `/admin/product-variants/${form.productVariantId}` : `/admin/products/${productId}/variants`, {
        method: form.productVariantId ? 'PATCH' : 'POST', body: JSON.stringify(form),
      });
      if (generation !== this.generation) return;
      runInAction(() => { this.savedVariantProductId = productId; });
      const saved = await request<ManagedProduct>("/admin/products/" + productId);
      if (generation !== this.generation) return;
      await this.load();
      if (generation !== this.generation) return;
      runInAction(() => { this.acceptProduct(saved); this.variant = null; this.savedVariantProductId = ''; this.success = 'הווריאציה נשמרה'; });
    } catch (error) { runInAction(() => { if (generation === this.generation) this.error = (this.savedProductId || this.savedVariantProductId ? 'הנתונים נשמרו; יש לנסות שוב לרענון בלבד. ' : '') + message(error); }); }
    finally { runInAction(() => { if (generation === this.generation) this.saving = false; }); }
  }
}
function snapshot(product: ManagedProduct) { return JSON.stringify([product.name, product.categoryId, product.description, product.pricePerUnit, product.availableItems, product.setSize, product.displayOrder, product.status]); }
function message(error: unknown) { return error instanceof Error ? error.message : 'הפעולה נכשלה'; }
export const catalogStore = new CatalogStore();
