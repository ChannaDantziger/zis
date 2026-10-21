import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['src/**/*.{ts,tsx}'], languageOptions: { globals: {
    window: 'readonly', document: 'readonly', fetch: 'readonly',
    localStorage: 'readonly', URLSearchParams: 'readonly', AbortController: 'readonly',
    RequestInit: 'readonly', Storage: 'readonly', console: 'readonly', Headers: 'readonly',
    Response: 'readonly', DOMException: 'readonly',
  } } },
);
