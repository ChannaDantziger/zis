import assert from 'node:assert/strict';
import test from 'node:test';
import { validateImageSignature } from './image-signature.js';
import { createSupabaseStorageService } from './storage.service.js';
const valid: Array<[string, Buffer]> = [
  ['image/png', Buffer.from([137,80,78,71,13,10,26,10])],
  ['image/jpeg', Buffer.from([255,216,255,224])],
  ['image/webp', Buffer.from('RIFF1234WEBP')],
];
test('supported image signatures match declared formats', () => {
  for (const [type, content] of valid) assert.doesNotThrow(() => validateImageSignature(type, content));
});
test('truncated, mismatched and script payloads fail before Storage upload', async () => {
  let calls = 0;
  const service = createSupabaseStorageService({ storage: { from: () => { calls++; throw new Error('must not call'); } } } as never);
  for (const content of [Buffer.from('<script>alert(1)</script>'), Buffer.from([137,80]), valid[1][1]]) {
    await assert.rejects(() => service.upload({ bucket: 'zis-product-media', fileName: 'image.png', contentType: 'image/png', byteLength: content.length }, content));
  }
  assert.equal(calls, 0);
});
