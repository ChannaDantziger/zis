// Temporary opt-in for browser tests against a verified development server only.
export const ENABLE_BUNDLE_ORDERING_FOR_TEST = true;
export function canEnableBundleTest(requested: boolean, hostname: string): boolean {
  return requested && ['localhost', '127.0.0.1'].includes(hostname);
}
export const BUNDLE_PURCHASE_ENABLED = canEnableBundleTest(ENABLE_BUNDLE_ORDERING_FOR_TEST,
  typeof window === 'undefined' ? '' : window.location.hostname);
