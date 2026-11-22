export interface ServerEnvironment {
  DATABASE_URL?: string;
  DATABASE_URL_TRN?: string;
  NODE_ENV?: string;
  DATABASE_TARGET?: 'development' | 'production';
  APP_ENV?: 'development' | 'production';
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  CORS_ALLOWED_ORIGINS?: string;
  ORDER_CONFIRMATION_TOKEN_TTL_SECONDS?: string;
  ORDER_CONFIRMATION_TOKEN_SECRET?: string;
}

export interface ServerConfig {
  databaseUrl?: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  databaseSource?: 'DATABASE_URL' | 'DATABASE_URL_TRN';
  allowedOrigins: string[];
  orderConfirmationTokenTtlSeconds?: number;
  orderConfirmationTokenSecret?: string;
}

const DEVELOPMENT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
] as const;

/**
 * Resolves server configuration without exposing secret values.
 * Database selection and browser-origin policy are independent settings.
 */
export function readServerConfig(environment: ServerEnvironment = process.env): ServerConfig {
  const orderConfirmation = parseOrderConfirmationConfig(environment);
  const allowedOrigins = parseAllowedOrigins(
    environment.CORS_ALLOWED_ORIGINS,
    environment.APP_ENV,
  );
  if (environment.DATABASE_TARGET === 'production' && environment.DATABASE_URL) {
    return {
      databaseUrl: environment.DATABASE_URL,
      databaseSource: 'DATABASE_URL',
      supabaseUrl: environment.SUPABASE_URL,
      supabaseServiceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY ?? environment.SUPABASE_SECRET_KEY,
      allowedOrigins,
      ...orderConfirmation,
    };
  }

  if (environment.DATABASE_TARGET === 'development' && environment.DATABASE_URL_TRN) {
    return {
      databaseUrl: environment.DATABASE_URL_TRN,
      databaseSource: 'DATABASE_URL_TRN',
      supabaseUrl: environment.SUPABASE_URL,
      supabaseServiceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY ?? environment.SUPABASE_SECRET_KEY,
      allowedOrigins,
      ...orderConfirmation,
    };
  }

  return {
    supabaseUrl: environment.SUPABASE_URL,
    supabaseServiceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY ?? environment.SUPABASE_SECRET_KEY,
    allowedOrigins,
    ...orderConfirmation,
  };
}

export function validateServerConfig(config: ServerConfig, environment: ServerEnvironment = process.env): string[] {
  const errors: string[] = [];
  if (!['development', 'production'].includes(environment.DATABASE_TARGET ?? '')) errors.push('DATABASE_TARGET must be development or production');
  if (!['development', 'production'].includes(environment.APP_ENV ?? '')) errors.push('APP_ENV must be development or production');
  if (environment.DATABASE_TARGET === 'production' && !config.databaseUrl) {
    errors.push('DATABASE_URL is required when DATABASE_TARGET=production');
  }
  if (environment.DATABASE_TARGET === 'production' && !config.supabaseUrl) {
    errors.push('SUPABASE_URL is required when DATABASE_TARGET=production');
  }
  if (environment.DATABASE_TARGET === 'production' && !config.supabaseServiceRoleKey) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is required when DATABASE_TARGET=production');
  }
  if (environment.APP_ENV === 'production' && config.allowedOrigins.includes('*')) {
    errors.push('CORS_ALLOWED_ORIGINS cannot use * when APP_ENV=production');
  }
  return errors;
}

function parseAllowedOrigins(value: string | undefined, appEnvironment: string | undefined): string[] {
  const configuredOrigins = (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (appEnvironment === 'production') return configuredOrigins;
  return [...new Set([...DEVELOPMENT_ORIGINS, ...configuredOrigins])];
}

function parseOrderConfirmationConfig(environment: ServerEnvironment) {
  const rawTtl = environment.ORDER_CONFIRMATION_TOKEN_TTL_SECONDS;
  const secret = environment.ORDER_CONFIRMATION_TOKEN_SECRET;
  const ttl = rawTtl && /^\d+$/.test(rawTtl) ? Number(rawTtl) : NaN;
  if (!Number.isSafeInteger(ttl) || ttl < 1 || ttl > 2_147_483_647 || !secret || secret.length < 32) return {};
  return { orderConfirmationTokenTtlSeconds: ttl, orderConfirmationTokenSecret: secret };
}
