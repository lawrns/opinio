/** BL-04: moderateReviewAction is administrator-only and records approve/reject. Mocked deps. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  redirects: [] as string[],
  requireAdministrator: vi.fn(),
  moderateReview: vi.fn(),
  revalidatePath: vi.fn(),
  authEnabled: true,
  Denied: class Denied extends Error {},
  Unauth: class Unauth extends Error {},
}));
vi.mock('next/navigation', () => ({ redirect: (to: string) => { m.redirects.push(to); throw new Error(`REDIRECT:${to}`); } }));
vi.mock('next/cache', () => ({ revalidatePath: m.revalidatePath }));
vi.mock('@/lib/db', () => ({ pool: {} }));
vi.mock('@/lib/authz', () => ({ AccessDenied: m.Denied, Unauthenticated: m.Unauth }));
vi.mock('@/lib/authz/owners', () => ({ requireAdministrator: m.requireAdministrator }));
vi.mock('@/lib/authz/session', () => ({ currentMerchantUserId: async () => 3 }));
vi.mock('@/lib/authz/transaction', () => ({ inTransaction: async (_db: unknown, fn: (c: object) => unknown) => fn({}) }));
vi.mock('@/lib/auth/spike', () => ({ merchantAuthEnabled: () => m.authEnabled }));
vi.mock('@/lib/review-moderation', () => ({ moderateReview: m.moderateReview }));

import { moderateReviewAction } from './actions';

const form = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
const run = async (o: Record<string, string>) => { await moderateReviewAction(form(o)).catch(() => {}); return m.redirects.at(-1); };

beforeEach(() => {
  m.redirects.length = 0;
  vi.clearAllMocks();
  m.authEnabled = true;
  m.requireAdministrator.mockResolvedValue({ type: 'administrator', userId: 3 });
  m.moderateReview.mockResolvedValue(true);
});

describe('moderateReviewAction', () => {
  it('sends non-administrators to /acceso and moderates nothing', async () => {
    m.requireAdministrator.mockRejectedValue(new m.Denied());
    expect(await run({ reviewId: '9', decision: 'approve' })).toBe('/acceso');
    expect(m.moderateReview).not.toHaveBeenCalled();
  });

  it('redirects home when merchant auth is off', async () => {
    m.authEnabled = false;
    expect(await run({ reviewId: '9', decision: 'approve' })).toBe('/');
    expect(m.moderateReview).not.toHaveBeenCalled();
  });

  it('approves and revalidates the business pages', async () => {
    expect(await run({ reviewId: '9', decision: 'approve' })).toBe('/admin/resenas?resultado=aprobada');
    expect(m.moderateReview).toHaveBeenCalledWith({}, { reviewId: 9, decision: 'approve', administratorUserId: 3 });
    expect(m.revalidatePath).toHaveBeenCalledWith('/b/[slug]', 'page');
  });

  it('rejects without revalidating', async () => {
    expect(await run({ reviewId: '9', decision: 'reject' })).toBe('/admin/resenas?resultado=rechazada');
    expect(m.moderateReview).toHaveBeenCalledWith({}, { reviewId: 9, decision: 'reject', administratorUserId: 3 });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it('reports a review that is no longer pending', async () => {
    m.moderateReview.mockResolvedValue(false);
    expect(await run({ reviewId: '9', decision: 'approve' })).toBe('/admin/resenas?resultado=not_pending');
  });

  it('refuses a malformed id or decision before any write', async () => {
    expect(await run({ reviewId: 'abc', decision: 'approve' })).toBe('/admin/resenas?resultado=invalid_request');
    expect(await run({ reviewId: '9', decision: 'delete' })).toBe('/admin/resenas?resultado=invalid_request');
    expect(m.moderateReview).not.toHaveBeenCalled();
  });
});
