import type { ServerConfig } from './server-config.js';

// Temporary opt-in for local testing authorized by the store owner.
export const ENABLE_BUNDLE_ORDERING_FOR_TEST = true;

export function bundleOrderingEnabled(config: ServerConfig, requested = ENABLE_BUNDLE_ORDERING_FOR_TEST): boolean {
  return requested && config.applicationMode === 'development' && Boolean(config.databaseSource);
}
