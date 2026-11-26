import assert from 'node:assert/strict';
import test from 'node:test';
import { bundleOrderingEnabled } from './bundle-feature.js';
import { readServerConfig } from './server-config.js';

test('bundle ordering is limited to an opted-in development app with a configured database', () => {
  const config = readServerConfig({ APP_ENV:'development', DATABASE_TARGET:'development', DATABASE_URL_TRN:'fixture' });
  assert.equal(bundleOrderingEnabled(config),true);
  assert.equal(bundleOrderingEnabled(config,false),false);
  assert.equal(bundleOrderingEnabled(config,true),true);
  assert.equal(bundleOrderingEnabled({ ...config, applicationMode:'production' },true),false);
  assert.equal(bundleOrderingEnabled({ ...config, databaseSource:'DATABASE_URL' },true),true);
  assert.equal(bundleOrderingEnabled({ ...config, databaseSource:undefined },true),false);
});
