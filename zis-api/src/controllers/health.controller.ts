import type { Request, Response } from 'express';
import { checkReadiness, type ReadinessCheck } from '../health/readiness.js';

const SERVICE_NAME = 'zis-api';

export function getLiveness(_request: Request, response: Response): void {
  response.status(200).json({
    status: 'ok',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
  });
}

export function createReadinessController(checks: Record<string, ReadinessCheck>) {
  return async function getReadiness(_request: Request, response: Response): Promise<void> {
    const result = await checkReadiness(checks);
    response.status(result.ready ? 200 : 503).json({
      status: result.ready ? 'ok' : 'not_ready',
      service: SERVICE_NAME,
      checks: result.checks,
      timestamp: new Date().toISOString(),
    });
  };
}

export const getHealth = getLiveness;
