import type { Request } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AdminUserResolution,
  AdminUserResolver,
} from '../controllers/admin-inventory.controller.js';

/**
 * Resolves an authenticated active Admin from a Supabase access token.
 * The Supabase client must be created server-side and must never be exposed
 * to the browser.
 */
export function createSupabaseAuthResolver(
  supabase: SupabaseClient,
): AdminUserResolver {
  return async function resolveAdminUserId(
    request: Request,
  ): Promise<AdminUserResolution> {
    const authorization = request.header('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return { status: 'unauthenticated' };
    }

    const accessToken = authorization.slice('Bearer '.length).trim();

    if (!accessToken) {
      return { status: 'unauthenticated' };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return { status: 'unauthenticated' };
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('admin_user_id, status, role')
      .eq('admin_user_id', user.id)
      .maybeSingle();

    if (adminError || !adminUser || adminUser.status !== 'active') {
      return { status: 'forbidden' };
    }

    return { status: 'authenticated', adminUserId: adminUser.admin_user_id, role: adminUser.role };
  };
}
