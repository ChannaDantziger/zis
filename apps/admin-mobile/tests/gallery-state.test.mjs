import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSource } from './load-source.mjs';
const requestUrl = `data:text/javascript;base64,${Buffer.from('export const request = (...args) => globalThis.galleryRequest(...args);').toString('base64')}`;
const source = await loadSource('../src/features/catalog/gallery.store.ts', { mobx: import.meta.resolve('mobx'), '../../shared/api/http-client.js': requestUrl });
const { GalleryStore } = await import(source);
const images = () => ['a', 'b', 'c'].map((imageId, index) => ({ imageId, sortOrder: (index + 1) * 10, isActive: true, isFeatured: imageId === 'a' }));
test('moving a picture persists the complete visual order and contiguous numbering', async () => {
  const store = new GalleryStore(); store.images = images();
  let body;
  globalThis.galleryRequest = async (path, init) => { assert.equal(path, '/admin/event-gallery/order'); body = JSON.parse(init.body); };
  await store.move('c', 1);
  assert.deepEqual(body.imageIds, ['c', 'a', 'b']);
  assert.deepEqual(store.images.map((image) => image.sortOrder), [1, 2, 3]);
});
test('failed reorder restores server order and exposes error', async () => {
  const store = new GalleryStore(); store.images = images();
  globalThis.galleryRequest = async (_path, init) => { if (init) throw new Error('conflict'); return images(); };
  await store.move('c', 1);
  assert.deepEqual(store.images.map((image) => image.imageId), ['a', 'b', 'c']);
  assert.equal(store.error, 'conflict');
});
test('batch retry retains uploaded file and does not repeat successful pictures', async () => {
  const store = new GalleryStore(); store.images = images();
  store.selectFiles([new File(['one'], 'one.png', { type: 'image/png' }), new File(['two'], 'two.png', { type: 'image/png' })]);
  let uploads = 0, metadata = 0;
  globalThis.galleryRequest = async (path, init) => {
    if (!init) return images();
    if (path.endsWith('/upload')) return { storagePath: `zis-event-gallery/${++uploads}.png` };
    if (++metadata === 2) throw new Error('metadata failed');
    return { imageId: 'saved' };
  };
  await store.add(); assert.equal(store.pending.length, 1); assert.equal(uploads, 2);
  await store.add(); assert.equal(store.pending.length, 0); assert.equal(uploads, 2); assert.equal(metadata, 3);
});
test('choosing a featured picture uses the dedicated endpoint and reloads the single selection', async () => {
  const store = new GalleryStore(); store.images = images();
  const calls = [];
  globalThis.galleryRequest = async (path, init) => {
    calls.push([path, init?.method]);
    return init ? undefined : images().map((image) => ({ ...image, isFeatured: image.imageId === 'b' }));
  };
  await store.setFeatured(store.images[1]);
  assert.deepEqual(calls, [['/admin/event-gallery/b/featured', 'PATCH'], ['/admin/event-gallery', undefined]]);
  assert.equal(store.images.filter((image) => image.isFeatured).length, 1);
  assert.equal(store.images.find((image) => image.isFeatured)?.imageId, 'b');
});
