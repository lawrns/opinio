import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { pool } from '@/lib/db';
import { isPlatformAdministrator } from '@/lib/authz/owners';
import { currentMerchantUserId } from '@/lib/authz/session';
import { gatedMetadata, merchantAuthEnabled } from '@/lib/auth/spike';
import { moderateReviewAction } from './actions';

export const dynamic = 'force-dynamic';
/** Metadata only for platform administrators; everyone else gets a plain 404 (no route title). */
export async function generateMetadata(): Promise<Metadata> {
  const admin = merchantAuthEnabled() && (await isPlatformAdministrator(pool, await currentMerchantUserId().catch(() => null)));
  return gatedMetadata(admin, { title: 'Moderación de opiniones | Opinio', robots: { index: false, follow: false } });
}

const RESULT: Record<string, string> = {
  aprobada: 'Opinión publicada. El puntaje del comercio se recalculó.',
  rechazada: 'Opinión rechazada. No se publicará.',
  not_pending: 'Esa opinión ya no está pendiente.',
  invalid_request: 'Solicitud no válida.',
  unavailable: 'No se pudo guardar. Intenta de nuevo.',
};

interface PendingReview {
  id: number;
  slug: string;
  rating: number;
  title: string | null;
  body: string;
  author_name: string;
  created_at: Date;
}

/** Pending-review queue for platform administrators only; everyone else gets 404. */
export default async function ReviewModerationPage({ searchParams }: { searchParams: Promise<{ resultado?: string }> }) {
  if (!merchantAuthEnabled()) notFound();
  if (!(await isPlatformAdministrator(pool, await currentMerchantUserId()))) notFound();
  const result = RESULT[(await searchParams).resultado ?? ''];
  const { rows } = await pool.query<PendingReview>(
    `SELECT r.id, b.slug, r.rating, r.title, r.body, r.author_name, r.created_at
       FROM reviews r JOIN businesses b ON b.id = r.business_id
      WHERE r.status = 'pending'
      ORDER BY r.created_at ASC LIMIT 50`,
  );

  return (
    <AuthShell title="Moderar opiniones">
      <p>Las opiniones nuevas no son públicas ni cambian el puntaje hasta que las apruebes aquí.</p>
      {result && <p role="status" data-testid="moderation-result">{result}</p>}
      {rows.length === 0 ? (
        <p data-testid="moderation-empty">No hay opiniones pendientes.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="space-y-2" data-testid={`pending-review-${r.id}`}>
              <p className="font-bold">
                #{r.id} · {r.slug} · {r.rating}/5 · {r.author_name}
              </p>
              {r.title && <p>{r.title}</p>}
              <p>{r.body}</p>
              <form action={moderateReviewAction} className="flex gap-4">
                <input type="hidden" name="reviewId" value={r.id} />
                <button type="submit" name="decision" value="approve" className="font-bold underline">Aprobar</button>
                <button type="submit" name="decision" value="reject" className="font-bold underline">Rechazar</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </AuthShell>
  );
}
