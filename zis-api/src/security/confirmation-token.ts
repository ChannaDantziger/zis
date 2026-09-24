import { createHash, randomBytes } from 'node:crypto';

export interface ConfirmationCredential {
  token: string;
  tokenHash: string;
  expiresAt: string;
}

export function issueConfirmationCredential(now: Date, ttlMilliseconds: number): ConfirmationCredential {
  if (!Number.isSafeInteger(ttlMilliseconds) || ttlMilliseconds <= 0) {
    throw new Error('Confirmation token TTL must be a positive integer');
  }

  const token = randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashConfirmationToken(token),
    expiresAt: new Date(now.getTime() + ttlMilliseconds).toISOString(),
  };
}

export function hashConfirmationToken(token: string): string {
  if (!token.trim()) {
    throw new Error('Confirmation token is required');
  }

  return createHash('sha256').update(token, 'utf8').digest('hex');
}
