import assert from 'node:assert/strict';
import test from 'node:test';
import { bundleOrderingEnabled } from './bundle-feature.js';
import { readServerConfig } from './server-config.js';

test('bundle ordering is explicitly opted in and limited to the declared development app and database', () => {
  const config = readServerConfig({ APP_ENV:'development', DATABASE_TARGET:'development', DATABASE_URL_TRN:'fixture' });
  assert.equal(bundleOrderingEnabled(config),false);
  assert.equal(bundleOrderingEnabled(config,true),true);
  assert.equal(bundleOrderingEnabled({ ...config, applicationMode:'production' },true),false);
  assert.equal(bundleOrderingEnabled({ ...config, databaseSource:'DATABASE_URL' },true),false);
  assert.equal(bundleOrderingEnabled({ ...config, databaseSource:undefined },true),false);
});
