import type {
  InventoryMovement,
  InventoryNotification,
  InventoryRepository,
  InventoryTransaction,
  InventoryVariant,
} from './inventory.types.js';

export interface SqlQueryResult<Row = Record<string, unknown>> {
  rows: Row[];
  rowCount: number | null;
}

export interface SqlClient {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<SqlQueryResult<Row>>;
  release?: () => void;
}

export type SqlClientFactory = () => Promise<SqlClient>;

interface VariantRow {
  [key: string]: unknown;
  product_variant_id: string;
  available_sets: number;
  low_stock_threshold_sets: number;
  default_production_quantity_sets: number;
}

function mapVariant(row: VariantRow): InventoryVariant {
  return {
    productVariantId: row.product_variant_id,
    availableSets: row.available_sets,
    lowStockThresholdSets: row.low_stock_threshold_sets,
    defaultProductionQuantitySets: row.default_production_quantity_sets,
  };
}

function createTransaction(client: SqlClient): InventoryTransaction {
  return {
    async getVariantForUpdate(productVariantId) {
      const result = await client.query<VariantRow>(
        `select product_variant_id, available_sets, low_stock_threshold_sets,
                default_production_quantity_sets
           from public.product_variants
          where product_variant_id = $1
            and is_deleted = false
          for update`,
        [productVariantId],
      );
      const row = result.rows[0];
      if (!row) throw new Error('Product variant not found');
      return mapVariant(row);
    },

    async updateAvailableSets(productVariantId, availableSets) {
      const result = await client.query(
        `update public.product_variants
            set available_sets = $2
          where product_variant_id = $1
            and is_deleted = false`,
        [productVariantId, availableSets],
      );
      if (result.rowCount !== 1) throw new Error('Product variant update failed');
    },

    async insertMovement(movement: InventoryMovement) {
      await client.query(
        `insert into public.inventory_movements
          (product_variant_id, order_id, movement_type,
           stock_before, stock_after, reason, created_by)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          movement.productVariantId,
          movement.orderId ?? null,
          movement.movementType,
          movement.stockBefore,
          movement.stockAfter,
          movement.reason,
          movement.createdBy ?? null,
        ],
      );
    },

    async createNotifications(notifications: InventoryNotification[]) {
      for (const notification of notifications) {
        await client.query(
          `insert into public.admin_notifications
            (admin_user_id, notification_type, title, body, order_id, product_variant_id)
           select admin_user_id, $1, $2, $3, $4, $5
             from public.admin_users
            where status = 'active'`,
          [
            notification.notificationType,
            notification.title,
            notification.body,
            notification.orderId ?? null,
            notification.productVariantId ?? null,
          ],
        );
      }
    },
  };
}

export function createPostgresInventoryRepository(factory: SqlClientFactory): InventoryRepository {
  return {
    async withTransaction<T>(work: (transaction: InventoryTransaction) => Promise<T>): Promise<T> {
      const client = await factory();
      try {
        await client.query('begin');
        const result = await work(createTransaction(client));
        await client.query('commit');
        return result;
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release?.();
      }
    },
  };
}
