import assert from 'node:assert/strict';
import test from 'node:test';
import { createSupabaseStorageService } from './storage.service.js';

test('storage service validates media before calling Supabase', async () => {
  let uploadCalls = 0;
  const service = createSupabaseStorageService({
    storage: {
      from: () => ({
        upload: async () => {
          uploadCalls += 1;
          return { error: null };
        },
        createSignedUrl: async () => ({ data: { signedUrl: 'https://example.invalid/signed' }, error: null }),
        remove: async () => ({ error: null }),
      }),
    },
  } as never);

  await assert.rejects(
    () => service.upload({
      bucket: 'zis-product-media',
      fileName: 'bad.gif',
      contentType: 'image/gif' as never,
      byteLength: 3,
    }, Buffer.from('abc')),
    /Unsupported media bucket or content type/,
  );
  assert.equal(uploadCalls, 0);
});
