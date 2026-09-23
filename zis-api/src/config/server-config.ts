export interface ServerEnvironment {
  DATABASE_URL?: string;
  DATABASE_URL_TRN?: string;
  NODE_ENV?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
}

export interface ServerConfig {
  databaseUrl?: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  databaseSource?: 'DATABASE_URL' | 'DATABASE_URL_TRN';
}

/**
 * Resolves server configuration without exposing secret values.
 * Development accepts only DATABASE_URL_TRN. Production accepts only the
 * explicitly named DATABASE_URL connection string, preventing an accidental
 * production connection from a local development process.
 */
export function readServerConfig(environment: ServerEnvironment = process.env): ServerConfig {
  if (environment.NODE_ENV === 'production' && environment.DATABASE_URL) {
    return {
      databaseUrl: environment.DATABASE_URL,
      databaseSource: 'DATABASE_URL',
      supabaseUrl: environment.SUPABASE_URL,
      supabaseServiceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY ?? environment.SUPABASE_SECRET_KEY,
    };
  }

  if (environment.NODE_ENV !== 'production' && environment.DATABASE_URL_TRN) {
    return {
      databaseUrl: environment.DATABASE_URL_TRN,
      databaseSource: 'DATABASE_URL_TRN',
      supabaseUrl: environment.SUPABASE_URL,
      supabaseServiceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY ?? environment.SUPABASE_SECRET_KEY,
    };
  }

  return {
    supabaseUrl: environment.SUPABASE_URL,
    supabaseServiceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY ?? environment.SUPABASE_SECRET_KEY,
  };
}
