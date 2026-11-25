import { makeAutoObservable, runInAction } from 'mobx';
import { request } from '../../shared/api/http-client.js';
import { catalogStore } from './catalog.store.js';

export interface BundleImage { imageId: string; storagePath: string; url?: string; altText: string; sortOrder: number; isPrimary: boolean; isDeleted: boolean; version: string }
export interface Bundle { bundleId: string; categoryId: string; name: string; description: string | null; unitCount: number; status: 'draft' | 'hidden'; version: string; images: BundleImage[] }
export class BundlesStore {
  items: Bundle[] = [];
  form: Bundle | null = null;
  loading = false;
  saving = false;
  error = '';
  private sequence = 0;
  private snapshot = '';
  private savedId = '';
  pendingUpload: { bundleId: string; storagePath: string; altText: string; metadataSaved: boolean } | null = null;
  constructor() { makeAutoObservable(this); }
  get changed() { return !!this.form && JSON.stringify(this.form) !== this.snapshot; }
  accept(form: Bundle) { this.form = form; this.snapshot = JSON.stringify(form); }
  async load(categoryId: string) {
    const sequence = ++this.sequence;
    this.loading = true; this.error = '';
    try { const items = await request<Bundle[]>(`/admin/bundles?categoryId=${encodeURIComponent(categoryId)}`);
      runInAction(() => { if (sequence === this.sequence) this.items = items; });
      return sequence === this.sequence;
    } catch (e) { runInAction(() => { if (sequence === this.sequence) this.error = errorMessage(e); }); return false; }
    finally { runInAction(() => { if (sequence === this.sequence) this.loading = false; }); }
  }
  create(categoryId: string) { this.savedId = ''; this.pendingUpload = null; this.error = ''; this.accept({ bundleId: '', categoryId, name: '', description: null, unitCount: 1, status: 'draft', version: '', images: [] }); }
  edit(bundle: Bundle) { this.savedId = ''; this.pendingUpload = null; this.error = ''; this.accept(JSON.parse(JSON.stringify(bundle)) as Bundle); }
  close() { if (this.saving) return false; if (this.changed && !window.confirm('יש שינויים שלא נשמרו. לצאת בלי לשמור?')) return false; this.form = null; return true; }
  set<K extends keyof Bundle>(key: K, value: Bundle[K]) { if (this.form && !this.savedId) this.form[key] = value; }
  async save() {
    if (!this.form || this.saving) return;
    const form = { ...this.form }; this.saving = true; this.error = '';
    try {
      const result = this.savedId ? { bundleId: this.savedId } : await request<{ bundleId: string }>(form.bundleId ? `/admin/bundles/${form.bundleId}` : '/admin/bundles',
        { method: form.bundleId ? 'PATCH' : 'POST', body: JSON.stringify(form) });
      runInAction(() => { this.savedId = result.bundleId; });
      if (!await this.load(form.categoryId)) throw new Error('טעינת המארז לאחר השמירה נכשלה');
      const saved = this.items.find(item => item.bundleId === result.bundleId);
      if (!saved) throw new Error('המארז נשמר אך לא נטען מחדש');
      runInAction(() => { this.accept(saved); this.savedId = ''; catalogStore.selectedCategoryId = saved.categoryId; });
      await catalogStore.load(1);
    } catch (e) { runInAction(() => { this.error = (this.savedId ? 'המארז נשמר; יש לנסות שוב כדי לרענן. ' : '') + errorMessage(e); }); }
    finally { runInAction(() => { this.saving = false; }); }
  }
  async upload(file?: File) {
    if (!this.form?.bundleId || this.changed || this.saving) return;
    if (!this.pendingUpload && (!file || !['image/jpeg','image/png','image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024)) { this.error = 'ניתן להעלות JPEG, PNG או WebP עד 5 MiB'; return; }
    this.saving = true; this.error = '';
    try {
      if (!this.pendingUpload) {
        const selected = file!;
        const uploaded = await request<{ storagePath: string }>('/admin/media/upload', { method: 'POST', body: selected, headers: { 'Content-Type': selected.type, 'X-File-Name': encodeURIComponent(selected.name) } });
        runInAction(() => { this.pendingUpload = { bundleId: this.form!.bundleId, storagePath: uploaded.storagePath, altText: this.form!.name, metadataSaved: false }; });
      }
      const pending = this.pendingUpload!;
      if (!pending.metadataSaved) {
        await request(`/admin/bundles/${pending.bundleId}/images`, { method: 'POST', body: JSON.stringify({ storagePath: pending.storagePath, altText: pending.altText }) });
        runInAction(() => { pending.metadataSaved = true; });
      }
      await this.refreshForm();
      if (!this.form?.images.some(image => image.storagePath === pending.storagePath && !image.isDeleted && image.url)) {
        throw new Error('התמונה לא נטענה מהשרת. יש לנסות לרענן שוב');
      }
      runInAction(() => { this.pendingUpload = null; });
    } catch (e) { runInAction(() => { this.error = errorMessage(e); }); }
    finally { runInAction(() => { this.saving = false; }); }
  }
  async removeImage(image: BundleImage) {
    if (!this.form || this.changed || this.saving || !window.confirm('למחוק את התמונה ואת הקובץ?')) return;
    this.saving = true; this.error = '';
    try { await request(`/admin/bundle-images/${image.imageId}`, { method: 'DELETE' }); await this.refreshForm(); }
    catch (e) { runInAction(() => { this.error = errorMessage(e); }); }
    finally { runInAction(() => { this.saving = false; }); }
  }
  async updateImage(image: BundleImage, altText: string, sortOrder: number) {
    if (!this.form || this.changed || this.saving) return;
    this.saving = true; this.error = '';
    try {
      await request(`/admin/bundle-images/${image.imageId}`, { method: 'PATCH', body: JSON.stringify({ version: image.version, altText, sortOrder }) });
      await this.refreshForm();
    } catch (e) { runInAction(() => { this.error = errorMessage(e); }); }
    finally { runInAction(() => { this.saving = false; }); }
  }
  async refreshForm() {
    const form = this.form; if (!form) return;
    if (!await this.load(form.categoryId)) throw new Error('טעינת המארז מהשרת נכשלה');
    const updated = this.items.find(item => item.bundleId === form.bundleId);
    if (!updated) throw new Error('המארז לא נמצא לאחר הרענון');
    runInAction(() => this.accept(updated));
  }
}
function errorMessage(e: unknown) { return e instanceof Error ? e.message : 'הפעולה נכשלה'; }
export const bundlesStore = new BundlesStore();
