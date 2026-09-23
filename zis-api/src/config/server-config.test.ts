import assert from 'node:assert/strict';
import test from 'node:test';
import { readServerConfig } from './server-config.js';

test('Development uses only DATABASE_URL_TRN', () => {
  const config = readServerConfig({
    NODE_ENV: 'development',
    DATABASE_URL: 'production-url',
    DATABASE_URL_TRN: 'development-url',
  });

  assert.equal(config.databaseUrl, 'development-url');
  assert.equal(config.databaseSource, 'DATABASE_URL_TRN');
});

test('Production uses only DATABASE_URL', () => {
  const config = readServerConfig({
    NODE_ENV: 'production',
    DATABASE_URL: 'production-url',
    DATABASE_URL_TRN: 'development-url',
  });

  assert.equal(config.databaseUrl, 'production-url');
  assert.equal(config.databaseSource, 'DATABASE_URL');
});

test('Development does not fall back to DATABASE_URL', () => {
  const config = readServerConfig({
    NODE_ENV: 'development',
    DATABASE_URL: 'production-url',
  });

  assert.equal(config.databaseUrl, undefined);
  assert.equal(config.databaseSource, undefined);
});
