import React from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { query } from '@/lib/db';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { publicCaseColumnsSql, toPublicCase, toPublicMessages } from '@/lib/case-access';
import { CasePortalClient, CaseData } from './CasePortalClient';
import { pool } from '@/lib/db';
import { authorizeCaseSession } from '@/lib/authz';
import { caseSessionCookieName } from '@/lib/authz/policy';
import { servedOverHttps } from '@/lib/authz/https';

/** True when the request carries a live buyer session for this exact case (B06). Never throws. */
async function hasCaseProof(caseId: number): Promise<boolean> {
  const token = (await cookies()).get(caseSessionCookieName(caseId, servedOverHttps()))?.value;
  if (!token) return false;
  return authorizeCaseSession(pool, { sessionToken: token, caseId }).then(
    () => true,
    () => false,
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0; // Dynamic case portal

// Static, purpose-only metadata: the portal is a private record page, so its
// title and description never carry case identifiers, merchant names, contact
// details or submitted form values.
export const metadata: Metadata = {
  title: 'Seguimiento de caso | Opinio México',
  description: 'Página de seguimiento de un caso de compra registrado en Opinio México.',
};

export default async function CasoDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Query case by numeric id or by case_number. Public projection only: this
  // page is served without authentication, so no buyer contact fields.
  const isNumeric = /^\d+$/.test(id);
  const caseQuery = isNumeric
    ? `SELECT ${publicCaseColumnsSql('c')}, b.brand_name, b.slug as business_slug
       FROM resolution_cases c
       JOIN businesses b ON c.business_id = b.id
       WHERE c.id = $1 LIMIT 1`
    : `SELECT ${publicCaseColumnsSql('c')}, b.brand_name, b.slug as business_slug
       FROM resolution_cases c
       JOIN businesses b ON c.business_id = b.id
       WHERE c.case_number = $1 LIMIT 1`;

  const caseRes = await query<CaseData & { business_slug: string; brand_name: string }>(caseQuery, [isNumeric ? parseInt(id, 10) : id]);

  if (caseRes.rows.length === 0) {
    notFound();
  }

  const row = caseRes.rows[0];
  // The thread and the free-text outcome are private to the buyer: without
  // this case's session only the public summary renders, and the messages are
  // never read from the database.
  const verified = await hasCaseProof(row.id);
  const caseData: CaseData = {
    ...toPublicCase(row),
    ...(verified ? {} : { remedy_offered: null, resolution_summary: null }),
    brand_name: row.brand_name,
    business_slug: row.business_slug,
  };

  const messages = verified
    ? toPublicMessages(
        (
          await query<{
            id: number;
            case_id: number;
            sender_type: 'consumer' | 'merchant' | 'mediator';
            sender_name: string;
            message: string;
            is_private: boolean;
            created_at: string;
          }>(
            `SELECT id, case_id, sender_type, sender_name, message, is_private, created_at
             FROM case_messages
             WHERE case_id = $1
             ORDER BY created_at ASC`,
            [caseData.id]
          )
        ).rows
      )
    : [];

  return (
    <div className="min-h-screen bg-[var(--op-canvas)] text-[var(--op-ink-primary)] flex flex-col font-sans selection:bg-[var(--op-verified-ink)] selection:text-[var(--op-sheet)]">
      <Navbar />
      <main id="contenido" className="flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {verified && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-4 text-sm" data-testid="case-access-verified">
              <p>Entraste a este caso con el enlace de tu correo. Confirmar una solución todavía no está disponible.</p>
              <form method="post" action="/caso/acceso/salir">
                <input type="hidden" name="caseId" value={caseData.id} />
                <button type="submit" className="font-bold underline">Salir de este caso</button>
              </form>
            </div>
          )}
          <CasePortalClient
            initialCase={caseData}
            initialMessages={messages}
            canViewThread={verified}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
