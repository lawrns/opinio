import { NextRequest, NextResponse } from 'next/server';
import { pool, query } from '@/lib/db';
import { CONSUMER_CONFIRMATION_PENDING_ERROR, consumerConfirmationAttempt } from '@/lib/case-access';
import { TRUST_FIELD_ERROR } from '@/lib/trust-fields';
import { authorizeCaseSession } from '@/lib/authz';
import { authzErrorResponse } from '@/lib/authz/http';
import { servedOverHttps } from '@/lib/authz/https';
import { caseSessionCookieName } from '@/lib/authz/policy';
import { buyerProofEnabled } from '@/lib/auth/spike';

interface MessageInput {
  sender_type?: unknown;
  sender_name: string;
  message: string;
  is_private?: unknown;
}

interface CaseRow {
  id: number;
  business_id: number;
  status: string;
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

    // B06: with buyer proof on, a buyer message needs that case's session
    // from the emailed link; a guessable id or case number is never enough.
    // Every message reaching this point is a buyer's (sender_type 'consumer'
    // or absent), so all of them take this branch.
    if (buyerProofEnabled()) {
      return postBuyerMessage(request, identifier, body.message);
    }

    if (!body.sender_name || typeof body.sender_name !== 'string' || body.sender_name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'sender_name es requerido' },
        { status: 400 }
      );
    }

    if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'El mensaje no puede estar vacío' },
        { status: 400 }
      );
    }

    const isNumeric = /^\d+$/.test(identifier);
    const findSql = isNumeric
      ? `SELECT id, business_id, status FROM resolution_cases
         WHERE id = $1 OR case_number = $2
         LIMIT 1`
      : `SELECT id, business_id, status FROM resolution_cases
         WHERE case_number = $1
         LIMIT 1`;
    const findParams = isNumeric ? [parseInt(identifier, 10), identifier] : [identifier];
    const findRes = await query<CaseRow>(findSql, findParams);

    if (findRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Caso no encontrado: ${identifier}` },
        { status: 404 }
      );
    }

    const caseData = findRes.rows[0];
    const caseId = caseData.id;

    // Insert Message
    const msgRes = await query<CaseMessageRow>(
      `INSERT INTO case_messages (case_id, sender_type, sender_name, message, is_private, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [
        caseId,
        'consumer',
        body.sender_name.trim(),
        body.message.trim(),
        false,
      ]
    );

    const createdMessage = msgRes.rows[0];

    return NextResponse.json(
      {
        success: true,
        message: 'Mensaje agregado al caso exitosamente',
        data: createdMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api/v1/cases/[id]/messages POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al enviar el mensaje' },
      { status: 500 }
    );
  }
}

/**
 * A buyer message under B06: the case session for the resolved case is
 * required, and the sender is always that case's buyer. Client-sent name,
 * privacy and type fields are ignored.
 */
async function postBuyerMessage(request: NextRequest, identifier: string, rawMessage: unknown) {
  const message = typeof rawMessage === 'string' && rawMessage.length <= 5000 ? rawMessage.trim() : '';
  if (!message) {
    return NextResponse.json({ success: false, error: 'El mensaje no puede estar vacío' }, { status: 400 });
  }
  try {
    const isNumeric = /^\d{1,12}$/.test(identifier);
    const found = await query<{ id: number; customer_name: string }>(
      isNumeric ? 'SELECT id, customer_name FROM resolution_cases WHERE id = $1' : 'SELECT id, customer_name FROM resolution_cases WHERE case_number = $1',
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

