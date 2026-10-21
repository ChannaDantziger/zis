import type { CommerceSettingsRepository, CommerceSettingsService } from './commerce-settings.types.js';

export function createCommerceSettingsService(repository: CommerceSettingsRepository): CommerceSettingsService {
  return {
    getSettings: () => repository.getSettings(),
    updateBusinessSettings: (input, adminUserId) => repository.updateBusinessSettings(input, adminUserId),
    createShippingZone: (input, adminUserId) => repository.createShippingZone(input, adminUserId),
    updateShippingZone: (input, adminUserId) => repository.updateShippingZone(input, adminUserId),
    updateShippingMethod: (input, adminUserId) => repository.updateShippingMethod(input, adminUserId),
    createShippingRule: (input, adminUserId) => repository.createShippingRule(input, adminUserId),
    updateShippingRule: (input, adminUserId) => repository.updateShippingRule(input, adminUserId),
    createClosure: (input, adminUserId) => repository.createClosure(input, adminUserId),
    updateClosure: (input, adminUserId) => repository.updateClosure(input, adminUserId),
  };
}
