import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const outputs = [];
for (const name of ['cart', 'catalog', 'checkout']) {
  const output = new URL(`../node_modules/.cache/zis-tests/${name}.test.mjs`, import.meta.url);
  await mkdir(new URL('./', output), { recursive: true });
  await build({
    entryPoints: [fileURLToPath(new URL(`./${name}.test.ts`, import.meta.url))],
    outfile: fileURLToPath(output), bundle: true, platform: 'node', format: 'esm',
    define: { 'import.meta.env': '{}' },
  });
  outputs.push(output);
}
for (const output of outputs) await import(output.href);
