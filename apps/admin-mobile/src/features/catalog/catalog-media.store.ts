import { makeAutoObservable, runInAction } from 'mobx';
import { request } from '../../shared/api/http-client.js';
import { catalogStore } from './catalog.store.js';
import type { ManagedImage, ManagedProduct } from './catalog.types.js';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export class CatalogMediaStore {
  private generation = 0;
  metadataSaved = false;
  file: File | null = null;
  preview = '';
  dimensions = '';
  imageId = '';
  version = '';
  productVariantId: string | null = null;
  isPrimary = false;
  altText = '';
  sortOrder = 0;
  uploaded: { storagePath: string; url: string } | null = null;
  saving = false;
  error = '';
  success = '';
  constructor() { makeAutoObservable(this); }
  reset() {
    if (this.saving) catalogStore.saving = false;
    this.generation++; this.metadataSaved = false; this.saving = false;
    if (this.preview) URL.revokeObjectURL(this.preview);
    this.file = null; this.preview = ''; this.dimensions = ''; this.imageId = ''; this.version = ''; this.uploaded = null;
    this.productVariantId = null; this.isPrimary = false; this.altText = ''; this.sortOrder = (catalogStore.product?.images.length ?? 0) * 10;
    this.error = ''; this.success = '';
  }
  selectFile(file: File | null) {
    if (this.saving || this.metadataSaved) return;
    if (this.preview) URL.revokeObjectURL(this.preview);
    this.file = null; this.preview = ''; this.dimensions = ''; this.uploaded = null; this.error = '';
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type) || !file.size || file.size > MAX_BYTES) { this.error = 'ניתן להעלות JPEG, PNG או WebP עד 5 MiB'; return; }
    this.file = file; this.preview = URL.createObjectURL(file);
    const url = this.preview, image = new Image();
    image.onload = () => runInAction(() => { if (this.preview === url) this.dimensions = `${image.naturalWidth} × ${image.naturalHeight} פיקסלים`; });
    image.onerror = () => runInAction(() => { if (this.preview === url) { this.error = 'לא ניתן לקרוא את התמונה'; this.file = null; } });
    image.src = url;
  }
  edit(image: ManagedImage) {
    this.reset(); this.imageId = image.imageId; this.version = image.version; this.altText = image.altText;
    this.sortOrder = image.sortOrder; this.productVariantId = image.productVariantId;
  }
  async save() {
    const productId = catalogStore.product?.productId;
    if (!productId || this.saving || catalogStore.saving) return;
    const generation = this.generation;
    this.saving = true; catalogStore.saving = true; this.error = ''; this.success = '';
    try {
      if (!this.metadataSaved && this.imageId) {
        await request(`/admin/product-images/${this.imageId}`, { method: 'PATCH', body: JSON.stringify({ version: this.version, altText: this.altText, sortOrder: this.sortOrder }) });
      } else if (!this.metadataSaved) {
        if (!this.file && !this.uploaded) throw new Error('בחרו תמונה');
        if (!this.uploaded) {
          const file = this.file!;
          const uploaded = await request<{ storagePath: string; url: string }>('/admin/media/upload', { method: 'POST', body: file, headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) } });
          if (generation !== this.generation) return;
          runInAction(() => { this.uploaded = uploaded; });
        }
        await request(`/admin/products/${productId}/images`, { method: 'POST', body: JSON.stringify({ storagePath: this.uploaded!.storagePath, productVariantId: this.productVariantId, altText: this.altText, sortOrder: this.sortOrder, isPrimary: this.isPrimary }) });
      }
      if (generation !== this.generation) return;
      runInAction(() => { this.metadataSaved = true; });
      const product = await request<ManagedProduct>(`/admin/products/${productId}`);
      if (generation !== this.generation) return;
      runInAction(() => { catalogStore.product = product; });
      await catalogStore.load();
      if (generation !== this.generation) return;
      runInAction(() => { catalogStore.product = product; this.saving = false; catalogStore.saving = false; this.reset(); this.success = 'התמונה נשמרה'; });
    } catch (error) { runInAction(() => { if (generation === this.generation) this.error = error instanceof Error ? error.message : 'שמירת התמונה נכשלה'; }); }
    finally { runInAction(() => { if (generation === this.generation) { this.saving = false; catalogStore.saving = false; } }); }
  }
  async removeImage() {
    if (!this.imageId || this.saving || !catalogStore.product?.productId) return;
    const generation = this.generation, productId = catalogStore.product.productId;
    this.saving = true; catalogStore.saving = true; this.error = '';
    try {
      await request(`/admin/product-images/${this.imageId}`, { method: 'DELETE' });
      if (generation !== this.generation) return;
      const product = await request<ManagedProduct>(`/admin/products/${productId}`);
      if (generation !== this.generation) return;
      runInAction(() => { catalogStore.product = product; });
      await catalogStore.load();
      if (generation === this.generation) { this.reset(); this.success = 'התמונה והקובץ נמחקו'; }
    } catch (error) { runInAction(() => { if (generation === this.generation) this.error = error instanceof Error ? error.message : 'מחיקת התמונה נכשלה'; }); }
    finally { runInAction(() => { if (generation === this.generation) { this.saving = false; catalogStore.saving = false; } }); }
  }
  async makePrimary(image: ManagedImage) {
    const productId = catalogStore.product?.productId;
    if (!productId || image.imageType === 'primary' || this.saving || catalogStore.saving) return;
    const generation = this.generation;
    this.saving = true; catalogStore.saving = true; this.error = ''; this.success = '';
    try {
      await request(`/admin/product-images/${image.imageId}`, { method: 'PATCH', body: JSON.stringify({ version: image.version, isPrimary: true }) });
      if (generation !== this.generation) return;
      const product = await request<ManagedProduct>(`/admin/products/${productId}`);
      if (generation !== this.generation) return;
      runInAction(() => { catalogStore.product = product; });
      await catalogStore.load();
      if (generation === this.generation) { this.reset(); this.success = 'התמונה הראשית עודכנה'; }
    } catch (error) { runInAction(() => { if (generation === this.generation) this.error = error instanceof Error ? error.message : 'עדכון התמונה הראשית נכשל'; }); }
    finally { runInAction(() => { if (generation === this.generation) { this.saving = false; catalogStore.saving = false; } }); }
  }
}
export const catalogMediaStore = new CatalogMediaStore();
