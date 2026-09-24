export interface ServerEnvironment {
  DATABASE_URL?: string;
  DATABASE_URL_TRN?: string;
  NODE_ENV?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  CORS_ALLOWED_ORIGINS?: string;
}

export interface ServerConfig {
  databaseUrl?: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  databaseSource?: 'DATABASE_URL' | 'DATABASE_URL_TRN';
  allowedOrigins: string[];
}

/**
 * Resolves server configuration without exposing secret values.
 * Development accepts only DATABASE_URL_TRN. Production accepts only the
 * explicitly named DATABASE_URL connection string, preventing an accidental
 * production connection from a local development process.
 */
export function readServerConfig(environment: ServerEnvironment = process.env): ServerConfig {
  const allowedOrigins = parseAllowedOrigins(environment.CORS_ALLOWED_ORIGINS);
  if (environment.NODE_ENV === 'production' && environment.DATABASE_URL) {
    return {
      databaseUrl: environment.DATABASE_URL,
      databaseSource: 'DATABASE_URL',
      supabaseUrl: environment.SUPABASE_URL,
      supabaseServiceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY ?? environment.SUPABASE_SECRET_KEY,
      allowedOrigins,
    };
  }

  if (environment.NODE_ENV !== 'production' && environment.DATABASE_URL_TRN) {
    return {
      databaseUrl: environment.DATABASE_URL_TRN,
      databaseSource: 'DATABASE_URL_TRN',
      supabaseUrl: environment.SUPABASE_URL,
      supabaseServiceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY ?? environment.SUPABASE_SECRET_KEY,
      allowedOrigins,
    };
  }

  return {
    supabaseUrl: environment.SUPABASE_URL,
    supabaseServiceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY ?? environment.SUPABASE_SECRET_KEY,
    allowedOrigins,
  };
}

export function validateServerConfig(config: ServerConfig, environment: ServerEnvironment = process.env): string[] {
  const errors: string[] = [];
  if (environment.NODE_ENV === 'production' && !config.databaseUrl) {
    errors.push('DATABASE_URL is required in production');
  }
  if (environment.NODE_ENV === 'production' && !config.supabaseUrl) {
    errors.push('SUPABASE_URL is required in production');
  }
  if (environment.NODE_ENV === 'production' && !config.supabaseServiceRoleKey) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is required in production');
  }
  if (environment.NODE_ENV === 'production' && config.allowedOrigins.includes('*')) {
    errors.push('CORS_ALLOWED_ORIGINS cannot use * in production');
  }
  return errors;
}

function parseAllowedOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
