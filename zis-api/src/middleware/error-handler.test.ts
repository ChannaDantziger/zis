import { ApiError } from '../http/api-error.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { errorHandler } from './error-handler.js';

for (const code of ['42703', 'ECONNREFUSED', 'SELF_SIGNED_CERT_IN_CHAIN']) {
  test(`internal errors log safe ${code} diagnostics without exposing details`, (context) => {
    const messages: string[] = [];
    context.mock.method(console, 'error', (message: string) => { messages.push(message); });
    const secret = 'private-connection-details';
    const response = handleError(Object.assign(new Error(secret), { code, detail: secret, query: secret }));
    assert.equal(response.statusCode, 500);
    assert.deepEqual(response.body, { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
    assert.equal(messages.length, 1);
    assert.equal(JSON.parse(messages[0]).diagnosticCode, code);
    assert.equal(messages[0].includes(secret), false);
    assert.equal(JSON.stringify(response.body).includes(code), false);
  });
}

test('unknown diagnostic codes and raw connection messages are not logged', (context) => {
  const messages: string[] = [];
  context.mock.method(console, 'error', (message: string) => { messages.push(message); });
  const secret = 'private-connection-details';
  handleError(Object.assign(new Error(secret), { code: secret }));
  assert.equal(JSON.parse(messages[0]).diagnosticCode, 'UNCLASSIFIED');
  assert.equal(messages[0].includes(secret), false);
});

function handleError(error: unknown): { statusCode: number; body: unknown } {
  const result = { statusCode: 0, body: undefined as unknown };
  const response = {
    locals: {},
    status: (status: number) => { result.statusCode = status; return response; },
    json: (body: unknown) => { result.body = body; return response; },
  };
  errorHandler(error, { method: 'GET', path: '/failure' } as Request, response as unknown as Response, () => {});
  return result;
}

test('wrapped and aggregate connection errors retain only the known diagnostic code', (context) => {
  const messages: string[] = [];
  context.mock.method(console, 'error', (message: string) => { messages.push(message); });
  const child = Object.assign(new Error('private-host'), { code: 'ECONNREFUSED' });
  handleError(new Error('private-wrapper', { cause: child }));
  handleError(new AggregateError([new Error('private-other'), child], 'private-aggregate'));
  assert.deepEqual(messages.map((entry) => JSON.parse(entry).diagnosticCode), ['ECONNREFUSED', 'ECONNREFUSED']);
  assert.equal(messages.some((entry) => entry.includes('private-')), false);
});

test('a cyclic error cause terminates with a visible unclassified marker', (context) => {
  const messages: string[] = [];
  context.mock.method(console, 'error', (message: string) => { messages.push(message); });
  const error = new Error('private-message');
  error.cause = error;
  handleError(error);
  assert.equal(JSON.parse(messages[0]).diagnosticCode, 'UNCLASSIFIED');
  assert.equal(messages[0].includes('private-message'), false);
});

test('missing settings configuration is identifiable in logs and the public response', (context) => {
  const messages: string[] = [];
  context.mock.method(console, 'error', (message: string) => { messages.push(message); });
  const response = handleError(new ApiError(503, 'STORE_SETTINGS_NOT_CONFIGURED', 'Shop settings are missing'));
  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, { error: { code: 'STORE_SETTINGS_NOT_CONFIGURED', message: 'Shop settings are missing' } });
  assert.equal(JSON.parse(messages[0]).diagnosticCode, 'STORE_SETTINGS_NOT_CONFIGURED');
});
