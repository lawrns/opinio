import React from 'react';
import { notFound } from 'next/navigation';
import { query } from '@/lib/db';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CasePortalClient, CaseData, MessageData } from './CasePortalClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0; // Dynamic case portal

export default async function CasoDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Query case by numeric id or by case_number
  const isNumeric = /^\d+$/.test(id);
  const caseQuery = isNumeric
    ? `SELECT c.*, b.brand_name, b.slug as business_slug
       FROM resolution_cases c
       JOIN businesses b ON c.business_id = b.id
       WHERE c.id = $1 LIMIT 1`
    : `SELECT c.*, b.brand_name, b.slug as business_slug
       FROM resolution_cases c
       JOIN businesses b ON c.business_id = b.id
       WHERE c.case_number = $1 LIMIT 1`;

  const caseRes = await query<CaseData>(caseQuery, [isNumeric ? parseInt(id, 10) : id]);

  if (caseRes.rows.length === 0) {
    notFound();
  }

  const caseData = caseRes.rows[0];

  // Query messages
  const messagesRes = await query<MessageData>(
    `SELECT id, case_id, sender_type, sender_name, message, is_private, created_at
     FROM case_messages
     WHERE case_id = $1
     ORDER BY created_at ASC`,
    [caseData.id]
  );

  const messages = messagesRes.rows;

  return (
    <div className="min-h-screen bg-[var(--op-canvas)] text-[var(--op-ink-primary)] flex flex-col font-sans selection:bg-[var(--op-verified-ink)] selection:text-[var(--op-sheet)]">
      <Navbar />
      <main id="contenido" className="flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <CasePortalClient
            initialCase={caseData}
            initialMessages={messages}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
