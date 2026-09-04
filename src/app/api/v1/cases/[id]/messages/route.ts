import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface MessageInput {
  sender_type: 'consumer' | 'merchant' | 'mediator';
  sender_name: string;
  message: string;
  is_private?: boolean;
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

const VALID_SENDER_TYPES = ['consumer', 'merchant', 'mediator'] as const;

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

    const body = (await request.json()) as MessageInput;

    if (!body.sender_type || !VALID_SENDER_TYPES.includes(body.sender_type)) {
      return NextResponse.json(
        { success: false, error: 'sender_type debe ser: consumer, merchant o mediator' },
        { status: 400 }
      );
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
        body.sender_type,
        body.sender_name.trim(),
        body.message.trim(),
        Boolean(body.is_private),
      ]
    );

    const createdMessage = msgRes.rows[0];

    // If merchant replies to an opened case, acknowledge it automatically
    if (body.sender_type === 'merchant' && caseData.status === 'opened') {
      await query(
        "UPDATE resolution_cases SET status = 'acknowledged', updated_at = NOW() WHERE id = $1",
        [caseId]
      );
    }

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
