export function minimumPackageCount(order: { items: readonly unknown[]; bundles?: ReadonlyArray<{ quantity: number }> }): number {
  const bundles = (order.bundles ?? []).reduce((sum, bundle) => sum + bundle.quantity, 0);
  return Math.max(1, bundles + (order.items.length > 0 ? 1 : 0));
}

export const MAX_PACKAGE_COUNT = 9999;
export function needsPackageResetChoice(fromStatus: string, targetStatus: string): boolean {
  const stages = ['ordered', 'in_preparation', 'packed', 'in_transit', 'delivered', 'approved'];
  const from = stages.indexOf(fromStatus), to = stages.indexOf(targetStatus);
  return to >= 0 && from > to && from >= stages.indexOf('packed') && to <= stages.indexOf('in_transit');
}
type PackageOrder = { items: readonly unknown[]; bundles?: ReadonlyArray<{ quantity: number }>; packageCount?: number | null };
export function packageCountFor(order: PackageOrder, chosen?: number | string): number | string {
  return chosen ?? Math.max(order.packageCount ?? 0, minimumPackageCount(order));
}
export function validPackageCount(order: PackageOrder, count: number | string): boolean {
  return typeof count === 'number' && Number.isInteger(count) && count >= minimumPackageCount(order) && count <= MAX_PACKAGE_COUNT;
}

export function packageCountError(reason?: string): string | undefined {
  return reason === 'PACKAGE_COUNT_BELOW_MINIMUM' ? 'מספר האריזות נמוך מהמינימום הנדרש לפי תכולת ההזמנה. רענני ובדקי את הכמות.' : reason;
}
