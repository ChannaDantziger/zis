import { makeAutoObservable, runInAction } from 'mobx';
import { request } from '../../shared/api/http-client.js';
import type { ManagedGalleryImage } from './catalog.types.js';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
interface PendingImage { file: File; preview: string; storagePath?: string; }
export class GalleryStore {
  images: ManagedGalleryImage[] = [];
  pending: PendingImage[] = [];
  saving = false;
  loading = false;
  error = '';
  constructor() { makeAutoObservable(this); }
  selectFiles(files: File[]) {
    if (this.saving) return;
    this.error = '';
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type) || !file.size || file.size > MAX_BYTES) {
        this.error = 'חלק מהקבצים לא נוספו. ניתן להעלות JPEG, PNG או WebP עד 5 MiB לתמונה'; continue;
      }
      this.pending.push({ file, preview: URL.createObjectURL(file) });
    }
  }
  clearPending() {
    if (this.saving) return;
    for (const item of this.pending) URL.revokeObjectURL(item.preview);
    this.pending = [];
  }
  removePending(preview: string) {
    if (this.saving) return;
    const index = this.pending.findIndex((item) => item.preview === preview);
    if (index < 0) return;
    URL.revokeObjectURL(preview);
    this.pending.splice(index, 1);
  }
  async load() {
    this.loading = true;
    try {
      const images = await request<ManagedGalleryImage[]>('/admin/event-gallery');
      runInAction(() => { this.images = images.sort((a, b) => a.sortOrder - b.sortOrder); });
    } catch (error) { runInAction(() => { this.error = message(error); }); }
    finally { runInAction(() => { this.loading = false; }); }
  }
  async add() {
    if (!this.pending.length || this.saving || this.loading) return;
    this.saving = true; this.error = '';
    try {
      let order = Math.max(0, ...this.images.map((image) => image.sortOrder));
      while (this.pending.length) {
        const item = this.pending[0]!;
        if (!item.storagePath) {
          const uploaded = await request<{ storagePath: string }>('/admin/event-gallery/media/upload', {
            method: 'POST', body: item.file, headers: { 'Content-Type': item.file.type, 'X-File-Name': encodeURIComponent(item.file.name) },
          });
          runInAction(() => { item.storagePath = uploaded.storagePath; });
        }
        await request('/admin/event-gallery', { method: 'POST', body: JSON.stringify({ storagePath: item.storagePath, sortOrder: ++order }) });
        runInAction(() => { URL.revokeObjectURL(item.preview); this.pending.shift(); });
      }
    } catch (error) { runInAction(() => { this.error = message(error); }); }
    finally { await this.load(); runInAction(() => { this.saving = false; }); }
  }
  async move(imageId: string, position: number) {
    if (this.saving || this.loading) return;
    const from = this.images.findIndex((image) => image.imageId === imageId);
    const to = Math.max(0, Math.min(this.images.length - 1, position - 1));
    if (from < 0 || from === to) return;
    const previous = this.images;
    const next = [...previous]; next.splice(to, 0, next.splice(from, 1)[0]!);
    this.images = next.map((image, index) => ({ ...image, sortOrder: index + 1 }));
    this.saving = true; this.error = '';
    try { await request('/admin/event-gallery/order', { method: 'PATCH', body: JSON.stringify({ imageIds: next.map((image) => image.imageId) }) }); }
    catch (error) { runInAction(() => { this.images = previous; this.error = message(error); }); await this.load(); }
    finally { runInAction(() => { this.saving = false; }); }
  }
  async setActive(image: ManagedGalleryImage, isActive: boolean) {
    if (this.saving || this.loading) return;
    this.saving = true; this.error = '';
    try { await request(`/admin/event-gallery/${image.imageId}`, { method: 'PATCH', body: JSON.stringify({ isActive }) }); await this.load(); }
    catch (error) { runInAction(() => { this.error = message(error); }); }
    finally { runInAction(() => { this.saving = false; }); }
  }
  async setFeatured(image: ManagedGalleryImage) {
    if (this.saving || this.loading || image.isFeatured) return;
    this.saving = true; this.error = '';
    try { await request(`/admin/event-gallery/${image.imageId}/featured`, { method: 'PATCH' }); await this.load(); }
    catch (error) { runInAction(() => { this.error = message(error); }); }
    finally { runInAction(() => { this.saving = false; }); }
  }
  async remove(image: ManagedGalleryImage) {
    if (this.saving || this.loading) return;
    this.saving = true; this.error = '';
    try { await request(`/admin/event-gallery/${image.imageId}`, { method: 'DELETE' }); await this.load(); }
    catch (error) { runInAction(() => { this.error = message(error); }); }
    finally { runInAction(() => { this.saving = false; }); }
  }
}
function message(error: unknown) { return error instanceof Error ? error.message : 'הפעולה נכשלה'; }
export const galleryStore = new GalleryStore();
