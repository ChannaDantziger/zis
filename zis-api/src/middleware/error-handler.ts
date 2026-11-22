import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ContractValidationError } from '../contracts/validation.js';
import { ApiError } from '../http/api-error.js';

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new ApiError(404, 'NOT_FOUND', `Route ${request.method} ${request.path} was not found`));
};

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const apiError = toApiError(error);
  const requestId = response.locals.requestId;

  if (apiError.statusCode >= 500) {
    console.error(JSON.stringify({
      level: 'error',
      requestId,
      method: request.method,
      path: request.path,
      diagnosticCode: safeDiagnosticCode(error),
      code: apiError.code,
      message: apiError.message,
    }));
  }

  response.status(apiError.statusCode).json({
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.fields ? { fields: apiError.fields } : {}),
      ...(requestId ? { requestId } : {}),
    },
  });
};

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof ContractValidationError) {
    return new ApiError(400, 'VALIDATION_ERROR', error.message, error.fields);
  }

  if (isJsonSyntaxError(error)) {
    return new ApiError(400, 'VALIDATION_ERROR', 'Request body must be valid JSON');
  }

  return new ApiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}

function isJsonSyntaxError(error: unknown): error is SyntaxError & { status: number } {
  return error instanceof SyntaxError && 'status' in error && error.status === 400;
}

// Allow only known infrastructure codes; never log raw messages, SQL or connection details.
const INFRASTRUCTURE_CODES = new Set([
  'STORE_SETTINGS_NOT_CONFIGURED',
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN',
  'ENETUNREACH', 'EHOSTUNREACH', 'EACCES', 'ERR_TLS_CERT_ALTNAME_INVALID',
  'SELF_SIGNED_CERT_IN_CHAIN', 'DEPTH_ZERO_SELF_SIGNED_CERT',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED',
  '08000', '08001', '08003', '08006', '28P01', '28000', '42501',
  '42P01', '42P08', '42703', '42883', '42803', '42P10', '42601', '53300', '57P03',
]);

const MAX_ERROR_DEPTH = 3;
const MAX_AGGREGATE_ERRORS = 5;

function safeDiagnosticCode(error: unknown): string {
  return findDiagnosticCode(error, MAX_ERROR_DEPTH) ?? 'UNCLASSIFIED';
}

function findDiagnosticCode(error: unknown, depth: number): string | undefined {
  if (!error || typeof error !== 'object' || depth === 0) return undefined;
  if ('code' in error && typeof error.code === 'string' && INFRASTRUCTURE_CODES.has(error.code)) return error.code;
  if ('cause' in error) {
    const code = findDiagnosticCode(error.cause, depth - 1);
    if (code) return code;
  }
  if (error instanceof AggregateError) {
    for (const child of error.errors.slice(0, MAX_AGGREGATE_ERRORS)) {
      const code = findDiagnosticCode(child, depth - 1);
      if (code) return code;
    }
  }
  return undefined;
}
