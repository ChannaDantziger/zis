import { Router } from 'express';
import { createReadinessController, getLiveness } from '../controllers/health.controller.js';
import type { ReadinessCheck } from '../health/readiness.js';

export function createHealthRouter(checks: Record<string, ReadinessCheck> = {}): Router {
  const router = Router();
  router.get('/health', getLiveness);
  router.get('/health/live', getLiveness);
  router.get('/health/ready', createReadinessController(checks));
  return router;
}

export const healthRouter = createHealthRouter();
