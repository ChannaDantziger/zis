import type { Request, Response } from 'express';

const SERVICE_NAME = 'zis-api';

export function getHealth(_request: Request, response: Response): void {
  response.status(200).json({
    status: 'ok',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
  });
}
