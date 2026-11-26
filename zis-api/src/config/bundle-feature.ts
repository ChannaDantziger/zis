import type { ServerConfig } from './server-config.js';

// Temporary development-only opt-in. Keep false until migration and test data are verified.
export const ENABLE_BUNDLE_ORDERING_FOR_TEST = false;

export function bundleOrderingEnabled(config: ServerConfig, requested = ENABLE_BUNDLE_ORDERING_FOR_TEST): boolean {
  return requested && config.applicationMode === 'development' && config.databaseSource === 'DATABASE_URL_TRN';
}
