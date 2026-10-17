'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { pool } from '@/lib/db';
import { AccessDenied, AuthorityUnavailable, Unauthenticated } from '@/lib/authz';
import { KeyRejected, createMachineKey, revokeMachineKey, rotateMachineKey } from '@/lib/authz/keys';
import { currentMerchantUserId } from '@/lib/authz/session';
import { merchantAuthEnabled } from '@/lib/auth/spike';

/** What the key form shows next. `key` is present only in the response to the owner's own request, once. */
export type KeyActionState = { outcome: string | null; key?: string; prefix?: string };

function idField(formData: FormData, name: string): number {
  const raw = formData.get(name);
  return typeof raw === 'string' && raw.length <= 12 ? Number(raw) : NaN;
}

function failure(error: unknown, what: string): string {
  if (error instanceof Unauthenticated) redirect('/acceso');
  if (error instanceof AccessDenied) redirect('/cuenta');
  if (error instanceof AuthorityUnavailable) return 'unavailable';
  if (error instanceof KeyRejected) return error.reason;
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown';
  console.error(`[authz] ${what} failed (code ${code})`);
  return 'unavailable';
}

/** Owner only: issues a key with the chosen scopes and returns it once. */
export async function createKeyAction(_prev: KeyActionState, formData: FormData): Promise<KeyActionState> {
  if (!merchantAuthEnabled()) redirect('/');
  const businessId = idField(formData, 'businessId');
  try {
    const created = await createMachineKey(pool, {
      ownerUserId: await currentMerchantUserId(),
      businessId,
      label: formData.get('label'),
      scopes: formData.getAll('scopes'),
    });
    revalidatePath(`/cuenta/negocios/${businessId}`);
    return { outcome: 'creada', key: created.key, prefix: created.prefix };
  } catch (error) {
    return { outcome: failure(error, 'machine key creation') };
  }
}

/** Owner only: replaces a key with a new one of the same scopes and returns it once; the old one stops working. */
export async function rotateKeyAction(_prev: KeyActionState, formData: FormData): Promise<KeyActionState> {
  if (!merchantAuthEnabled()) redirect('/');
  try {
    const created = await rotateMachineKey(pool, { ownerUserId: await currentMerchantUserId(), keyId: idField(formData, 'keyId') });
    revalidatePath(`/cuenta/negocios/${idField(formData, 'businessId')}`);
    return { outcome: 'rotada', key: created.key, prefix: created.prefix };
  } catch (error) {
    return { outcome: failure(error, 'machine key rotation') };
  }
}

/** Owner only: revokes a key; it fails on its next use. */
export async function revokeKeyAction(_prev: KeyActionState, formData: FormData): Promise<KeyActionState> {
  if (!merchantAuthEnabled()) redirect('/');
  try {
    await revokeMachineKey(pool, { ownerUserId: await currentMerchantUserId(), keyId: idField(formData, 'keyId') });
    revalidatePath(`/cuenta/negocios/${idField(formData, 'businessId')}`);
    return { outcome: 'revocada' };
  } catch (error) {
    return { outcome: failure(error, 'machine key revocation') };
  }
}
