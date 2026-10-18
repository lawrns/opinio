import { randomInt } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { pool, query } from '@/lib/db';
import { toPublicCase } from '@/lib/case-access';
import { CASE_TRUST_FIELDS, TRUST_FIELD_ERROR, trustFieldsIn } from '@/lib/trust-fields';
import { CASE_CREATIONS_PER_CLIENT, CASE_CREATIONS_PER_EMAIL, PHONE_CONTACT, parseEmail } from '@/lib/authz/policy';
import { hashSecret } from '@/lib/authz/secrets';
import { allowCaseCreation, clientAddress } from '@/lib/auth/rate-limit';
import { inTransaction } from '@/lib/authz/transaction';
import { issueCaseAccessToken, recordTransportOutcome } from '@/lib/authz/buyer-access';
import { sendCaseAccessLink } from '@/lib/auth/case-email';
import { buyerProofEnabled } from '@/lib/auth/spike';

interface CaseInput {
  business_id: number;
  customer_name: string;
  customer_contact: string;
  issue_category: string;
  customer_requested_remedy: string;
  initial_message: string;
  access_email?: string;
  submission_key?: string;
}

const SUBMISSION_KEY = /^[A-Za-z0-9-]{16,64}$/;
const bad = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

interface CaseRow {
  id: number;
  business_id: number;
  review_id: number | null;
  order_id: number | null;
  case_number: string;
  customer_name: string;
  customer_contact: string;
  issue_category: string;
  customer_requested_remedy: string;
  status: string;
  is_consumer_confirmed: boolean;
  remedy_offered: string | null;
  resolution_summary: string | null;
  median_first_response_minutes: number;
  total_resolution_hours: string | number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  business_slug?: string;
  business_brand_name?: string;
}

interface BusinessRow {
  id: number;
  slug: string;
  brand_name: string;
  observed_orders_count: number;
}

export async function POST(request: NextRequest) {
  if (buyerProofEnabled()) return createCaseWithAccessEmail(request);
  try {
    const body = (await request.json()) as CaseInput;

    // No client trust fields (status, confirmation, resolution, order/review
    // link, role): refused before any read or write (src/lib/trust-fields.ts).
    if (trustFieldsIn(body, CASE_TRUST_FIELDS).length > 0) {
      return NextResponse.json({ success: false, error: TRUST_FIELD_ERROR }, { status: 403 });
    }

    if (!body.business_id || typeof body.business_id !== 'number') {
      return NextResponse.json(
        { success: false, error: 'El campo business_id es requerido y debe ser un número' },
        { status: 400 }
      );
    }

    if (!body.customer_name || typeof body.customer_name !== 'string' || body.customer_name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'El nombre del cliente es requerido' },
        { status: 400 }
      );
    }

    if (!body.customer_contact || typeof body.customer_contact !== 'string' || body.customer_contact.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'El medio de contacto del cliente (WhatsApp o email) es requerido' },
        { status: 400 }
      );
    }

    if (!body.issue_category || typeof body.issue_category !== 'string') {
      return NextResponse.json(
        { success: false, error: 'La categoría del problema es requerida' },
        { status: 400 }
      );
    }

    if (!body.customer_requested_remedy || typeof body.customer_requested_remedy !== 'string') {
      return NextResponse.json(
        { success: false, error: 'La solución solicitada es requerida' },
        { status: 400 }
      );
    }

    if (!body.initial_message || typeof body.initial_message !== 'string' || body.initial_message.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'El mensaje inicial del caso debe contener al menos 5 caracteres' },
        { status: 400 }
      );
    }

    // Verify business exists
    const bizRes = await query<BusinessRow>(
      'SELECT id, slug, brand_name, observed_orders_count FROM businesses WHERE id = $1',
      [body.business_id]
    );

    if (bizRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Negocio con ID ${body.business_id} no existe` },
        { status: 404 }
      );
    }

    const business = bizRes.rows[0];

    // Generate unique case_number
    const slugPrefix = business.slug.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'GEN';
    const year = new Date().getFullYear();
    // Same format as before, now from crypto randomness (randomInt). The
    // number stays guessable by design (public case pages); writes are bound
    // to the buyer by B06.
    const randomSuffix = randomInt(1000, 10000);
    const caseNumber = `CASO-${slugPrefix}-${year}-${randomSuffix}`;

    // Insert Resolution Case
    const insertRes = await query<CaseRow>(
      `INSERT INTO resolution_cases (
        business_id, review_id, order_id, case_number, customer_name,
        customer_contact, issue_category, customer_requested_remedy, status,
        is_consumer_confirmed, median_first_response_minutes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'opened', false, 45, NOW(), NOW())
      RETURNING *`,
      [
        body.business_id,
        null,
        null,
        caseNumber,
        body.customer_name.trim(),
        body.customer_contact.trim(),
        body.issue_category.trim(),
        body.customer_requested_remedy.trim(),
      ]
    );

    const createdCase = insertRes.rows[0];

    // Insert initial customer message
    await query(
      `INSERT INTO case_messages (case_id, sender_type, sender_name, message, is_private, created_at)
       VALUES ($1, 'consumer', $2, $3, false, NOW())`,
      [createdCase.id, body.customer_name.trim(), body.initial_message.trim()]
    );

    // Update issues_per_thousand in business table
    const countCasesRes = await query<{ count: string }>(
      'SELECT COUNT(*)::text as count FROM resolution_cases WHERE business_id = $1',
      [body.business_id]
    );
    const totalCases = parseInt(countCasesRes.rows[0]?.count || '1', 10);
    if (business.observed_orders_count > 0) {
      const issuesPerThousand = Math.round((totalCases / (business.observed_orders_count / 1000)) * 10) / 10;
      await query(
        'UPDATE businesses SET issues_per_thousand = $1, updated_at = NOW() WHERE id = $2',
        [issuesPerThousand, body.business_id]
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Caso de resolución abierto con éxito',
        case: toPublicCase(createdCase),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api/v1/cases POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al abrir el caso de resolución' },
      { status: 500 }
    );
  }
}

/**
 * B06 contract (OPINIO_BUYER_PROOF=1): a separate, required private access
 * email and an optional phone contact, which is never emailed. The case, its
 * first message and a hashed single-use access token are written together;
 * the link is then emailed to the access address only. The response never
 * carries the token or any private proof. A repeated submission (same
 * `submission_key`) returns the same case without a second message or email.
 */
async function createCaseWithAccessEmail(request: NextRequest) {
  let body: CaseInput;
  try {
    body = (await request.json()) as CaseInput;
  } catch {
    return bad('Solicitud inválida');
  }
  const text = (value: unknown, max: number) => (typeof value === 'string' && value.length <= max ? value.trim() : '');
  const accessEmail = parseEmail(body.access_email);
  const phone = text(body.customer_contact, 30);
  const name = text(body.customer_name, 150);
  const category = text(body.issue_category, 100);
  const remedy = text(body.customer_requested_remedy, 100);
  const message = text(body.initial_message, 5000);
  const submissionKey = typeof body.submission_key === 'string' && SUBMISSION_KEY.test(body.submission_key) ? body.submission_key : null;
  if (!Number.isSafeInteger(body.business_id) || body.business_id <= 0) return bad('El campo business_id es requerido y debe ser un número');
  if (!name) return bad('El nombre del cliente es requerido');
  if (!accessEmail) return bad('Escribe el correo privado donde recibirás el enlace de acceso a tu caso');
  if (phone && (phone.includes('@') || !PHONE_CONTACT.test(phone))) return bad('El teléfono es opcional; si lo escribes, usa al menos 10 dígitos');
  if (!category) return bad('La categoría del problema es requerida');
  if (!remedy) return bad('La solución solicitada es requerida');
  if (message.length < 5) return bad('El mensaje inicial del caso debe contener al menos 5 caracteres');

  try {
    const business = (await query<BusinessRow>('SELECT id, slug, brand_name, observed_orders_count FROM businesses WHERE id = $1', [body.business_id])).rows[0];
    if (!business) return bad(`Negocio con ID ${body.business_id} no existe`, 404);

    // A retry of an earlier submission is answered before any limit: it sends nothing new.
    const earlier = submissionKey
      ? (await query<CaseRow>('SELECT * FROM resolution_cases WHERE business_id = $1 AND submission_key = $2', [business.id, submissionKey])).rows[0]
      : undefined;
    if (earlier) return NextResponse.json({ success: true, message: 'Caso de resolución abierto con éxito', case: toPublicCase(earlier), access_link: await firstLinkStatus(earlier.id) }, { status: 200 });

    // Each new case emails its access address: bound it per client address and per recipient (hashed).
    const client = clientAddress(request.headers.get('x-forwarded-for'));
    if (
      !(await allowCaseCreation(pool, { scope: 'client', key: client, limit: CASE_CREATIONS_PER_CLIENT })) ||
      !(await allowCaseCreation(pool, { scope: 'email', key: hashSecret(accessEmail), limit: CASE_CREATIONS_PER_EMAIL }))
    ) {
      return bad('Recibimos muchos casos en poco tiempo. Intenta de nuevo en unos minutos.', 429);
    }

    const outcome = await inTransaction(pool, async (client) => {
      if (submissionKey) {
        const existing = (await client.query<CaseRow>('SELECT * FROM resolution_cases WHERE business_id = $1 AND submission_key = $2', [business.id, submissionKey])).rows[0];
        if (existing) return { created: false as const, row: existing };
      }
      const slugPrefix = business.slug.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'GEN';
      const caseNumber = `CASO-${slugPrefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const inserted = await client.query<CaseRow>(
        `INSERT INTO resolution_cases (
          business_id, review_id, order_id, case_number, customer_name, customer_contact, access_email, submission_key,
          issue_category, customer_requested_remedy, status, is_consumer_confirmed, median_first_response_minutes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'opened', false, 45, NOW(), NOW())
        ON CONFLICT (business_id, submission_key) WHERE submission_key IS NOT NULL DO NOTHING
        RETURNING *`,
        [business.id, null, null, caseNumber, name, phone, accessEmail, submissionKey, category, remedy],
      );
      const row = inserted.rows[0];
      if (!row) {
        // A concurrent request with the same submission key won.
        const winner = (await client.query<CaseRow>('SELECT * FROM resolution_cases WHERE business_id = $1 AND submission_key = $2', [business.id, submissionKey])).rows[0];
        return { created: false as const, row: winner };
      }
      await client.query(
        `INSERT INTO case_messages (case_id, sender_type, sender_name, message, is_private, created_at)
         VALUES ($1, 'consumer', $2, $3, false, NOW())`,
        [row.id, name, message],
      );
      const access = await issueCaseAccessToken(client, row.id);
      return { created: true as const, row, access };
    });

    let linkSent: boolean | null = null;
    if (outcome.created) {
      linkSent = await sendCaseAccessLink(accessEmail, outcome.access.token);
      await recordTransportOutcome(pool, outcome.access.tokenId, linkSent);
      const totalCases = Number((await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM resolution_cases WHERE business_id = $1', [business.id])).rows[0]?.count || '1');
      if (business.observed_orders_count > 0) {
        await query('UPDATE businesses SET issues_per_thousand = $1, updated_at = NOW() WHERE id = $2', [
          Math.round((totalCases / (business.observed_orders_count / 1000)) * 10) / 10,
          business.id,
        ]);
      }
    }
    return NextResponse.json(
      {
        success: true,
        message: 'Caso de resolución abierto con éxito',
        case: toPublicCase(outcome.row),
        // Only whether the transport took the email; never the link itself.
        access_link: outcome.created ? (linkSent ? 'sent' : 'not_sent') : await firstLinkStatus(outcome.row.id),
      },
      { status: outcome.created ? 201 : 200 },
    );
  } catch {
    console.error('[api/v1/cases POST] case with access email failed');
    return bad('Error al abrir el caso de resolución', 500);
  }
}

/** For a repeated submission: whether the case's first link was accepted by the transport ('already_sent') or not ('not_sent'). */
async function firstLinkStatus(caseId: number): Promise<'already_sent' | 'not_sent'> {
  const first = (await query<{ transport_accepted_at: string | null }>(
    'SELECT transport_accepted_at FROM case_access_tokens WHERE case_id = $1 ORDER BY id LIMIT 1',
    [caseId],
  )).rows[0];
  return first?.transport_accepted_at ? 'already_sent' : 'not_sent';
}

export async function GET() {
  try {
    // TODO: implement real case listing
    return NextResponse.json({ success: true, cases: [], total: 0 });
  } catch (error) {
    console.error('[api/v1/cases GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Error al cargar casos' }, { status: 500 });
  }
}
