import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Evaluate isolated browser-independent TypeScript modules without a bundler or DB.
export async function loadSource(relativePath, imports = {}) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  let code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  for (const [specifier, target] of Object.entries(imports)) code = code.replaceAll(`'${specifier}'`, `'${target}'`);
  code = code.replaceAll('import.meta.env', 'globalThis.__testViteEnv');
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}