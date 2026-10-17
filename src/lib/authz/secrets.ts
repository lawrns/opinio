import { createHash, randomBytes } from 'node:crypto';

/** A new bearer secret: 32 random bytes, base64url. Show or send it once; store only `hashSecret`. */
export function generateSecret(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 hex digest; the only form in which secrets are persisted. */
export function hashSecret(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** A machine key: `opk_<prefix>_<secret>`. The prefix is stored for display only. */
export function generateMachineKey(): { key: string; prefix: string } {
  const prefix = randomBytes(6).toString('base64url');
  return { key: `opk_${prefix}_${generateSecret()}`, prefix };
}
