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
