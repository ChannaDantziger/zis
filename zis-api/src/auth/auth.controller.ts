import type { Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from '../http/api-error.js';

const INVALID_CREDENTIALS_MESSAGE = 'פרטי ההתחברות שגויים או שהמשתמש אינו מנהל פעיל';

export function createLoginController(authClient: SupabaseClient, adminClient: SupabaseClient) {
  return async function login(request: Request, response: Response): Promise<void> {
    const email = readString(request.body?.email);
    const password = readString(request.body?.password);
    if (!email || !password) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Email and password are required');
    }

    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) {
      console.warn(JSON.stringify({
        level: 'warn',
        event: 'admin_login_auth_rejected',
        code: error?.code ?? 'missing_session',
        status: error?.status ?? 401,
      }));
      throw new ApiError(401, 'INVALID_CREDENTIALS', INVALID_CREDENTIALS_MESSAGE);
    }

    const { data: adminUser, error: adminError } = await adminClient
      .from('admin_users')
      .select('admin_user_id, status, role')
      .eq('admin_user_id', data.user.id)
      .maybeSingle();

    if (adminError || !adminUser || adminUser.status !== 'active') {
      console.warn(JSON.stringify({
        level: 'warn',
        event: 'admin_login_access_rejected',
        code: adminError?.code ?? (adminUser ? 'inactive_admin' : 'admin_not_found'),
      }));
      throw new ApiError(403, 'ADMIN_ACCESS_REQUIRED', INVALID_CREDENTIALS_MESSAGE);
    }

    response.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      user: { id: adminUser.admin_user_id, role: adminUser.role },
    });
  };
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
