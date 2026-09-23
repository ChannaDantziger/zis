import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import { HEALTH_ROUTE } from '../constants/http.js';

export const healthRouter = Router();

healthRouter.get(HEALTH_ROUTE, getHealth);
