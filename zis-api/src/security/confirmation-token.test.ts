import assert from 'node:assert/strict';
import test from 'node:test';
import { hashConfirmationToken, issueConfirmationCredential } from './confirmation-token.js';

test('confirmation credential returns a raw token and a different stored representation', () => {
  const now = new Date('2026-09-24T10:00:00.000Z');
  const credential = issueConfirmationCredential(now, 60_000);

  assert.notEqual(credential.token, credential.tokenHash);
  assert.equal(credential.tokenHash, hashConfirmationToken(credential.token));
  assert.equal(credential.expiresAt, '2026-09-24T10:01:00.000Z');
});
