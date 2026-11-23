import type { OrderCreatedResponse } from '../contracts/commerce.contracts.js';
import { ApiError } from '../http/api-error.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';

interface EditRequestRow extends Record<string, unknown> {
  request_hash: string; order_id: string; response: Omit<OrderCreatedResponse, 'confirmationToken'> | null;
}

export async function claimPendingEdit(client: SqlClient, key: string, hash: string, orderId: string): Promise<OrderCreatedResponse | null> {
  let inserted;
  try {
    inserted = await client.query(`insert into public.order_pending_edit_requests(idempotency_key,request_hash,order_id)
      values($1,$2,$3) on conflict(idempotency_key) do nothing`, [key, hash, orderId]);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '42P01') {
      throw new ApiError(503, 'PENDING_ORDER_EDIT_NOT_CONFIGURED', 'Pending order edit migration must be applied manually');
    }
    throw error;
  }
  const result = await client.query<EditRequestRow>(`select request_hash,order_id,response from public.order_pending_edit_requests
    where idempotency_key=$1 for update`, [key]);
  const row = result.rows[0];
  if (!row || row.request_hash !== hash || row.order_id !== orderId) throw new ApiError(409, 'CONFLICT', 'Idempotency-Key was used for a different pending edit');
  if (inserted.rowCount === 1) return null;
  if (!row.response) throw new ApiError(409, 'CONFLICT', 'Pending order edit is in progress');
  return { ...row.response, confirmationToken: '' };
}

export async function completePendingEdit(client: SqlClient, key: string, orderId: string, response: OrderCreatedResponse): Promise<void> {
  const metadata = { orderId: response.orderId, orderNumber: response.orderNumber, status: response.status,
    paymentStatus: response.paymentStatus, total: response.total, currency: response.currency, version: response.version, isTest: response.isTest };
  const result = await client.query(`update public.order_pending_edit_requests set response=$3::jsonb,completed_at=clock_timestamp()
    where idempotency_key=$1 and order_id=$2 and response is null`, [key, orderId, JSON.stringify(metadata)]);
  if (result.rowCount !== 1) throw new Error('Pending order edit completion failed');
}
