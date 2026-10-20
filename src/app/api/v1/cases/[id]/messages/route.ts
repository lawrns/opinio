import { NextRequest, NextResponse } from 'next/server';
import { pool, query } from '@/lib/db';
import { CONSUMER_CONFIRMATION_PENDING_ERROR, consumerConfirmationAttempt } from '@/lib/case-access';
import { TRUST_FIELD_ERROR } from '@/lib/trust-fields';
import { authorizeCaseSession } from '@/lib/authz';
import { authzErrorResponse } from '@/lib/authz/http';
import { servedOverHttps } from '@/lib/authz/https';
import { caseSessionCookieName } from '@/lib/authz/policy';
import { sameOrigin } from '@/lib/auth/same-origin';

interface MessageInput {
  sender_type?: unknown;
  sender_name: string;
  message: string;
  is_private?: unknown;
}

interface CaseMessageRow {
  id: number;
  case_id: number;
  sender_type: 'consumer' | 'merchant' | 'mediator';
  sender_name: string;
  message: string;
  is_private: boolean;
  created_at: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const identifier = rawId?.trim();

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'Identificador de caso requerido' },
        { status: 400 }
      );
    }

    const body = (await request.json()) as MessageInput & { status?: unknown; is_consumer_confirmed?: unknown };

    // Messages never change the buyer confirmation; refuse requests that try.
    if (consumerConfirmationAttempt(body)) {
      return NextResponse.json(
        { success: false, error: CONSUMER_CONFIRMATION_PENDING_ERROR },
        { status: 403 }
      );
    }

    // This public route always speaks for the buyer: who is sending is never
    // taken from the request. A merchant, mediator or staff sender, or a
    // private (mediator-only) message, is refused before any write; those
    // need an authenticated identity (merchant actions, B-series auth).
    if ((body.sender_type !== undefined && body.sender_type !== null && body.sender_type !== 'consumer') || body.is_private === true) {
      return NextResponse.json({ success: false, error: TRUST_FIELD_ERROR }, { status: 403 });
    }

    // B06: a buyer message always needs that case's session from the emailed
    // link; a guessable id or case number is never enough. With the switch
    // off no session can exist, so the write is refused (closed by default).
    // Every message reaching this point is a buyer's (sender_type 'consumer'
    // or absent), so all of them take this path.
    return postBuyerMessage(request, identifier, body.message);
  } catch (error) {
    console.error('[api/v1/cases/[id]/messages POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al enviar el mensaje' },
      { status: 500 }
    );
  }
}

/**
 * A buyer message. The sender is always the case's own buyer: client-sent
 * name, privacy and type fields are ignored. Every case, including one from
 * before B06 (no access email), requires that case's session; a missing case
 * and a case without this caller's session are denied alike.
 */
async function postBuyerMessage(request: NextRequest, identifier: string, rawMessage: unknown) {
  // Cookie-authenticated write: same-origin only.
  if (!sameOrigin(request)) return NextResponse.json({ success: false, error: 'Origen no permitido' }, { status: 403 });
  const message = typeof rawMessage === 'string' && rawMessage.length <= 5000 ? rawMessage.trim() : '';
  if (!message) {
    return NextResponse.json({ success: false, error: 'El mensaje no puede estar vacío' }, { status: 400 });
  }
  try {
    // Ids beyond the INTEGER range can't exist: treated like any unknown case, not a database error.
    const isNumeric = /^\d{1,10}$/.test(identifier) && Number(identifier) <= 2_147_483_647;
    const looksNumeric = /^\d+$/.test(identifier);
    type Found = { id: number; customer_name: string };
    const found =
      looksNumeric && !isNumeric
        ? { rows: [] as Found[] }
        : await query<Found>(
            isNumeric
              ? 'SELECT id, customer_name FROM resolution_cases WHERE id = $1'
              : 'SELECT id, customer_name FROM resolution_cases WHERE case_number = $1',
            [isNumeric ? Number(identifier) : identifier.slice(0, 50)],
          );
    const caseRow = found.rows[0];
    // A missing case and a case without this caller's session look the same.
    await authorizeCaseSession(pool, {
      sessionToken: caseRow ? request.cookies.get(caseSessionCookieName(caseRow.id, servedOverHttps()))?.value : undefined,
      caseId: caseRow?.id ?? 0,
    });
    const created = await query<CaseMessageRow>(
      `INSERT INTO case_messages (case_id, sender_type, sender_name, message, is_private, created_at)
       VALUES ($1, 'consumer', $2, $3, false, NOW()) RETURNING *`,
      [caseRow.id, caseRow.customer_name, message],
    );
    return NextResponse.json({ success: true, message: 'Mensaje agregado al caso exitosamente', data: created.rows[0] }, { status: 201 });
  } catch (error) {
    return authzErrorResponse(error);
  }
}

