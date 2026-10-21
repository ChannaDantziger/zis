// Offline verification against the repository's existing, installed Admin dependencies.
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const dependencyRoot = resolve(root, '../admin-mobile/node_modules');
const require = createRequire(resolve(root, '../admin-mobile/package.json'));
const { build: bundle } = require('esbuild');
const configPath = resolve(root, '.verify-tsconfig.json');
await writeFile(configPath, JSON.stringify({
  extends: './tsconfig.json',
  compilerOptions: {
    baseUrl: '.', typeRoots: [resolve(dependencyRoot, '@types')],
    paths: {
      react: ['../admin-mobile/node_modules/@types/react'],
      'react/*': ['../admin-mobile/node_modules/@types/react/*'],
      'react-dom/*': ['../admin-mobile/node_modules/@types/react-dom/*'],
      '*': ['../admin-mobile/node_modules/*'],
    },
  },
}, null, 2));
const check = spawnSync(process.execPath, [resolve(dependencyRoot, 'typescript/bin/tsc'), '--project', configPath], { cwd: root, encoding: 'utf8' });
console.log(check.stdout, check.stderr);
if (check.status !== 0) process.exit(check.status ?? 1);
console.log('Storefront TypeScript passed using installed repository dependencies.');

const { build } = await import(new URL('../../admin-mobile/node_modules/vite/dist/node/index.js', import.meta.url));
const modules = ['react', 'react-dom', 'react-router-dom', '@mantine/core', '@mantine/hooks', '@tanstack/react-query', '@tabler/icons-react', 'mobx', 'mobx-react-lite'];
const alias = modules.map(name => ({ find: name, replacement: resolve(dependencyRoot, name).replaceAll('\\', '/') }));
await build({ root, configFile: false, envDir: false, resolve: { alias, preserveSymlinks: true },
  build: { outDir: 'dist', rollupOptions: { onwarn(warning, warn) {
    if (warning.code !== 'MODULE_LEVEL_DIRECTIVE') warn(warning);
  } } } });
for (const testName of ['cart.test.ts', 'catalog.test.ts']) {
  const output = resolve(root, `.verify-${testName}.mjs`);
  await bundle({ entryPoints: [resolve(root, 'tests', testName)], outfile: output, bundle: true,
    platform: 'node', format: 'esm', define: { 'import.meta.env': '{}' }, alias: Object.fromEntries(modules.map(name => [name, resolve(dependencyRoot, name)])) });
  await import(new URL(`../.verify-${testName}.mjs`, import.meta.url).href);
}
