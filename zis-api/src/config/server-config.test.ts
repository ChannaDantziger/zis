import assert from 'node:assert/strict';
import test from 'node:test';
import { readServerConfig, validateServerConfig } from './server-config.js';

test('Development uses only DATABASE_URL_TRN', () => {
  const config = readServerConfig({
    DATABASE_TARGET: 'development', APP_ENV: 'development',
    DATABASE_URL: 'production-url',
    DATABASE_URL_TRN: 'development-url',
  });

  assert.equal(config.databaseUrl, 'development-url');
  assert.equal(config.databaseSource, 'DATABASE_URL_TRN');
  assert.deepEqual(config.allowedOrigins, ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174']);
});

test('Production uses only DATABASE_URL', () => {
  const config = readServerConfig({
    DATABASE_TARGET: 'production', APP_ENV: 'production',
    DATABASE_URL: 'production-url',
    DATABASE_URL_TRN: 'development-url',
  });

  assert.equal(config.databaseUrl, 'production-url');
  assert.equal(config.databaseSource, 'DATABASE_URL');
});

test('Development does not fall back to DATABASE_URL', () => {
  const config = readServerConfig({
    DATABASE_TARGET: 'development',
    DATABASE_URL: 'production-url',
  });

  assert.equal(config.databaseUrl, undefined);
  assert.equal(config.databaseSource, undefined);
});

test('Development keeps storefront origins when custom origins are configured', () => {
  const config = readServerConfig({
    DATABASE_TARGET: 'development', APP_ENV: 'development',
    CORS_ALLOWED_ORIGINS: 'http://localhost:5173,http://dev.example.test,http://localhost:5173',
  });

  assert.deepEqual(config.allowedOrigins, [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://dev.example.test',
  ]);
});

test('Production uses only explicitly configured origins', () => {
  const config = readServerConfig({
    DATABASE_TARGET: 'development', APP_ENV: 'production',
    CORS_ALLOWED_ORIGINS: 'https://shop.example.test',
  });

  assert.deepEqual(config.allowedOrigins, ['https://shop.example.test']);
});

test('Development app can explicitly use the production database independently', () => {
  const config = readServerConfig({
    DATABASE_TARGET: 'production', APP_ENV: 'development', DATABASE_URL: 'production-url',
    CORS_ALLOWED_ORIGINS: 'https://shop.example.test',
  });

  assert.equal(config.databaseSource, 'DATABASE_URL');
  assert.deepEqual(config.allowedOrigins, [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'https://shop.example.test',
  ]);
});

test('production database and app config validation are independent', () => {
  const config = readServerConfig({ DATABASE_TARGET: 'production', APP_ENV: 'production', CORS_ALLOWED_ORIGINS: '*' });
  assert.deepEqual(validateServerConfig(config, { DATABASE_TARGET: 'production', APP_ENV: 'production' }), [
    'DATABASE_URL is required when DATABASE_TARGET=production',
    'SUPABASE_URL is required when DATABASE_TARGET=production',
    'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is required when DATABASE_TARGET=production',
    'CORS_ALLOWED_ORIGINS cannot use * when APP_ENV=production',
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
