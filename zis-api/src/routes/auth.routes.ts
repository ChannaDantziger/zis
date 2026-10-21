import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLoginController } from '../auth/auth.controller.js';

export function createAuthRouter(authClient: SupabaseClient, adminClient: SupabaseClient): Router {
  const router = Router();
  router.post('/auth/login', createLoginController(authClient, adminClient));
  return router;
}
