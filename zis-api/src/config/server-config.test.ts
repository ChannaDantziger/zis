import assert from 'node:assert/strict';
import test from 'node:test';
import { readServerConfig, validateServerConfig } from './server-config.js';

test('Development uses only DATABASE_URL_TRN', () => {
  const config = readServerConfig({
    NODE_ENV: 'development',
    DATABASE_URL: 'production-url',
    DATABASE_URL_TRN: 'development-url',
  });

  assert.equal(config.databaseUrl, 'development-url');
  assert.equal(config.databaseSource, 'DATABASE_URL_TRN');
  assert.deepEqual(config.allowedOrigins, ['http://localhost:5173', 'http://127.0.0.1:5173']);
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

test('production config validation fails closed when critical settings are missing', () => {
  const config = readServerConfig({ NODE_ENV: 'production', CORS_ALLOWED_ORIGINS: '*' });
  assert.deepEqual(validateServerConfig(config, { NODE_ENV: 'production' }), [
    'DATABASE_URL is required in production',
    'SUPABASE_URL is required in production',
    'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is required in production',
    'CORS_ALLOWED_ORIGINS cannot use * in production',
  ]);
});

test('order confirmation requires both explicit TTL and a separate secret', () => {
  for (const ttl of [undefined, '', '0', '-1', '1.5', '3600x', '2147483648']) {
    const config = readServerConfig({ ORDER_CONFIRMATION_TOKEN_TTL_SECONDS: ttl, ORDER_CONFIRMATION_TOKEN_SECRET: 'x'.repeat(32) });
    assert.equal(config.orderConfirmationTokenTtlSeconds, undefined);
    assert.equal(config.orderConfirmationTokenSecret, undefined);
  }
  assert.equal(readServerConfig({ ORDER_CONFIRMATION_TOKEN_TTL_SECONDS: '3600', ORDER_CONFIRMATION_TOKEN_SECRET: 'short' }).orderConfirmationTokenTtlSeconds, undefined);
  const config = readServerConfig({ ORDER_CONFIRMATION_TOKEN_TTL_SECONDS: '3600', ORDER_CONFIRMATION_TOKEN_SECRET: 'x'.repeat(32) });
  assert.equal(config.orderConfirmationTokenTtlSeconds, 3600);
  assert.equal(config.orderConfirmationTokenSecret, 'x'.repeat(32));
});