export interface AdminShippingZone {
  shippingZoneId: string;
  name: string;
  city: string;
  neighborhood: string | null;
  dispatchTime: string | null;
  isActive: boolean;
}

export interface AdminShippingMethod {
  shippingMethodId: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface UpdateShippingMethodInput {
  shippingMethodId: string;
  name?: string;
  isActive?: boolean;
}

export interface AdminShippingRule {
  shippingRuleId: string;
  shippingZoneId: string;
  shippingMethodId: string;
  basePrice: string;
  sizeFromSets: number;
  sizeToSets: number | null;
  sizeSurcharge: string;
  timeSurcharge: string;
  urgencySurcharge: string;
  isActive: boolean;
}

export interface AdminStoreClosure {
  storeClosureId: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  isActive: boolean;
}

export interface AdminBusinessSettings {
  storeOpen: boolean;
  lockMode: 'open' | 'closed' | 'scheduled';
  lockMessage: string | null;
  minimumProductSubtotal: string;
  maxAdvanceDays: number;
  dispatchTime: string | null;
  sameDayCutoffTime: string;
  workingDays: string[];
  businessTimezone: string;
  blockHolidayEves: boolean;
  deliveryCalendarCountry: string;
  orderPreparationStatus: string;
}

export interface AdminCommerceSettings {
  business: AdminBusinessSettings;
  shippingZones: AdminShippingZone[];
  shippingMethods: AdminShippingMethod[];
  shippingRules: AdminShippingRule[];
  closures: AdminStoreClosure[];
}

export interface UpdateBusinessSettingsInput {
  storeOpen?: boolean;
  lockMode?: 'open' | 'closed' | 'scheduled';
  lockMessage?: string | null;
  minimumProductSubtotal?: string;
  maxAdvanceDays?: number;
  dispatchTime?: string | null;
  sameDayCutoffTime?: string;
  workingDays?: string[];
  businessTimezone?: string;
  blockHolidayEves?: boolean;
  deliveryCalendarCountry?: string;
  orderPreparationStatus?: string;
}

export interface CreateShippingZoneInput {
  name: string;
  city: string;
  neighborhood: string | null;
  dispatchTime: string | null;
  isActive: boolean;
}

export interface UpdateShippingZoneInput extends Partial<CreateShippingZoneInput> {
  shippingZoneId: string;
}

export interface CreateShippingRuleInput {
  shippingZoneId: string;
  shippingMethodId: string;
  basePrice: string;
  sizeFromSets: number;
  sizeToSets: number | null;
  sizeSurcharge: string;
  timeSurcharge: string;
  urgencySurcharge: string;
  isActive: boolean;
}

export interface UpdateShippingRuleInput extends Partial<CreateShippingRuleInput> {
  shippingRuleId: string;
}

export interface CreateStoreClosureInput {
  startsAt: string;
  endsAt: string;
  reason: string | null;
  isActive: boolean;
}

export interface UpdateStoreClosureInput extends Partial<CreateStoreClosureInput> {
  storeClosureId: string;
}

export interface CommerceSettingsRepository {
  getSettings(): Promise<AdminCommerceSettings>;
  updateBusinessSettings(input: UpdateBusinessSettingsInput, adminUserId: string): Promise<AdminBusinessSettings>;
  createShippingZone(input: CreateShippingZoneInput, adminUserId: string): Promise<AdminShippingZone>;
  updateShippingZone(input: UpdateShippingZoneInput, adminUserId: string): Promise<AdminShippingZone>;
  updateShippingMethod(input: UpdateShippingMethodInput, adminUserId: string): Promise<AdminShippingMethod>;
  createShippingRule(input: CreateShippingRuleInput, adminUserId: string): Promise<AdminShippingRule>;
  updateShippingRule(input: UpdateShippingRuleInput, adminUserId: string): Promise<AdminShippingRule>;
  createClosure(input: CreateStoreClosureInput, adminUserId: string): Promise<AdminStoreClosure>;
  updateClosure(input: UpdateStoreClosureInput, adminUserId: string): Promise<AdminStoreClosure>;
}

export type CommerceSettingsService = CommerceSettingsRepository;
