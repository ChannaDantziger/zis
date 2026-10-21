import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import type { OrderService } from '../commerce/order.types.js';
import { ApiError } from '../http/api-error.js';
import { createOrderRouter } from './order.routes.js';

const token = 'a'.repeat(43);
function fixture() {
  const calls: unknown[] = [];
  const service: OrderService = {
    async create(body, key) { calls.push({ body, key }); return { orderId: 'order', orderNumber: 'NUMBER', status: 'ordered', paymentStatus: 'pending', total: '25.50', currency: 'ILS', confirmationToken: token }; },
    async confirmation(value) {
      calls.push(value);
      if (value !== token) throw new ApiError(404, 'NOT_FOUND', 'Order confirmation is unavailable');
      return { orderNumber: 'NUMBER', status: 'ordered', paymentStatus: 'pending', deliveryDate: '2026-10-11', total: '25.50', currency: 'ILS' };
    },
  };
  return { calls, service };
}
function dispatch(service: OrderService, method: string, url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; body: unknown; headers: Record<string, unknown> }>((resolve, reject) => {
    const output = { status: 200, body: undefined as unknown, headers: {} as Record<string, unknown> };
    const request = { method, url, body, headers, get(name: string) { return headers[name.toLowerCase()]; } } as Request;
    const response = {
      setHeader(name: string, value: unknown) { output.headers[name.toLowerCase()] = value; },
      status(value: number) { output.status = value; return this; },
      json(value: unknown) { output.body = value; resolve(output); return this; },
    } as unknown as Response;
    createOrderRouter(service)(request, response, (error?: unknown) => {
      if (error instanceof ApiError) { output.status = error.statusCode; output.body = { code: error.code }; resolve(output); }
      else reject(error ?? new Error('Expected order route to handle request'));
    });
  });
}

test('order router forwards body/key and labels creation pending with no-store', async () => {
  const f = fixture(); const body = { items: [] };
  const result = await dispatch(f.service, 'POST', '/orders', body, { 'idempotency-key': 'abcdefghijklmnop' });
  assert.equal(result.status, 201); assert.equal(result.headers['cache-control'], 'no-store');
  assert.deepEqual(f.calls, [{ body, key: 'abcdefghijklmnop' }]);
  assert.equal((result.body as { paymentStatus: string }).paymentStatus, 'pending');
});
test('confirmation router accepts Bearer and returns minimal no-store response', async () => {
  const f = fixture(); const result = await dispatch(f.service, 'GET', '/orders/confirmation', undefined, { authorization: `Bearer ${token}` });
  assert.equal(result.status, 200); assert.equal(result.headers['cache-control'], 'no-store');
  assert.deepEqual(f.calls, [token]); assert.ok(!('orderId' in (result.body as object)));
});
test('query token and predictable order number never authorize confirmation', async () => {
  const f = fixture(); const result = await dispatch(f.service, 'GET', `/orders/confirmation?token=${token}&orderNumber=NUMBER`, undefined);
  assert.equal(result.status, 404); assert.deepEqual(f.calls, [undefined]); assert.equal(result.headers['cache-control'], 'no-store');
});
test('configuration failure passes through route with no-store and no success', async () => {
  const f = fixture(); f.service.create = async () => { throw new ApiError(503, 'ORDER_CREATION_NOT_CONFIGURED', 'Not configured'); };
  const result = await dispatch(f.service, 'POST', '/orders', {}, { 'idempotency-key': 'abcdefghijklmnop' });
  assert.equal(result.status, 503); assert.deepEqual(result.body, { code: 'ORDER_CREATION_NOT_CONFIGURED' });
  assert.equal(result.headers['cache-control'], 'no-store');
});