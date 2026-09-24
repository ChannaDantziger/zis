import type { Request, Response } from 'express';
import type { InventoryService } from '../inventory/inventory.service.js';

interface InventoryAdjustmentBody {
  deltaSets?: unknown;
  reason?: unknown;
}

export type AdminUserResolution =
  | { status: 'authenticated'; adminUserId: string; role?: AdminUserRole }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' };

export type AdminUserRole = 'operations_manager' | 'delivery_driver';

export type AdminUserResolver = (request: Request) => Promise<AdminUserResolution>;

export function createAdminInventoryController(service: InventoryService, resolveAdminUserId: AdminUserResolver) {
  return async function adjustInventory(request: Request, response: Response): Promise<void> {
    const body = request.body as InventoryAdjustmentBody;
    const adminResolution = await resolveAdminUserId(request);
    const deltaSets = body.deltaSets;
    const reason = body.reason;
    const productVariantParam = request.params.productVariantId;
    const productVariantId = typeof productVariantParam === 'string' ? productVariantParam : undefined;

    if (adminResolution.status === 'unauthenticated') {
      response.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (adminResolution.status === 'forbidden') {
      response.status(403).json({ error: 'Active admin access required' });
      return;
    }

    if (!productVariantId || typeof deltaSets !== 'number' || typeof reason !== 'string') {
      response.status(400).json({ error: 'admin identity, deltaSets and reason are required' });
      return;
    }

    try {
      const result = await service.updateByAdmin({
        productVariantId,
        deltaSets,
        reason,
        adminUserId: adminResolution.adminUserId,
      });
      response.status(200).json(result);
    } catch (error) {
      response.status(400).json({ error: error instanceof Error ? error.message : 'Inventory update failed' });
    }
  };
}
