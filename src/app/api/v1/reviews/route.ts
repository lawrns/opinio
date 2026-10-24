import { NextRequest, NextResponse } from 'next/server';
import { isOperationEnabled } from '@/lib/containment';
import { parseConversionContext } from '@/lib/conversion/context';
import { afterResponse } from '@/lib/conversion/after';
import { recordMilestone } from '@/lib/conversion/ledger';
import { query, withTransaction } from '@/lib/db';
import { TRUST_FIELD_ERROR, reviewTrustFieldsIn } from '@/lib/trust-fields';
import { toPublicReview } from '@/lib/public-reviews';
import { VERIFICATION_WEIGHTS } from '@/lib/scoring';
import { REVIEWS_PER_CLIENT_PER_HOUR, parseEmail } from '@/lib/authz/policy';
import { clientAddress } from '@/lib/auth/rate-limit';
import {
  reviewBodyHash,
  reviewClientHash,
  reviewEmailHash,
  verifyCaptcha,
} from '@/lib/review-moderation';

interface ReviewInput {
  business_id: number;
  order_id?: number | null;
  rating: number;
  title?: string;
  body: string;
  author_name: string;
  author_masked_contact?: string;
  /** Used only to detect repeat reviews; stored as a hash, never returned. */
  author_email?: string;
  /** Cloudflare Turnstile token; checked only when TURNSTILE_SECRET_KEY is set. */
  captcha_token?: string;
  verification_level?: 'confirmed_payment' | 'confirmed_store_order' | 'reviewed_proof' | 'unverified_experience';
  product_name?: string;
  /** CONVERSION-001 browser association; re-validated server-side. */
  conversion?: unknown;
}

interface ReviewRow {
  id: number;
  business_id: number;
  order_id: number | null;
  invitation_id: number | null;
  rating: number;
  title: string | null;
  body: string;
  author_name: string;
  author_masked_contact: string | null;
  verification_level: 'confirmed_payment' | 'confirmed_store_order' | 'reviewed_proof' | 'unverified_experience';
  score_weight: string | number;
  integrity_factor: string | number;
  product_name: string | null;
  status: string;
  upvotes: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  business_slug?: string;
  business_brand_name?: string;
}

interface BusinessStatsRow {
  id: number;
  observed_orders_count: number;
  invited_orders_count: number;
  median_response_hours: string | number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReviewInput;

    if (!body.business_id || typeof body.business_id !== 'number') {
      return NextResponse.json(
        { success: false, error: 'El campo business_id es requerido y debe ser un número' },
        { status: 400 }
      );
    }

    if (!body.rating || typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { success: false, error: 'La calificación debe ser un entero entre 1 y 5' },
        { status: 400 }
      );
    }

    if (!body.body || typeof body.body !== 'string' || body.body.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'El texto de la opinión debe tener al menos 5 caracteres' },
        { status: 400 }
      );
    }

    if (!body.author_name || typeof body.author_name !== 'string' || body.author_name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'El nombre del autor es requerido' },
        { status: 400 }
      );
    }

    // Contained (src/lib/containment.ts): an order_id or "reviewed_proof" in
    // the request body is a claim, not proof. While claims aren't trusted, a
    // body that makes one (or sets any server-only field) is refused before
    // any read or write (src/lib/trust-fields.ts).
    const trustClaims = isOperationEnabled('review_claimed_verification');
    if (reviewTrustFieldsIn(body, trustClaims).length > 0) {
      return NextResponse.json({ success: false, error: TRUST_FIELD_ERROR }, { status: 403 });
    }

    // Verify business exists
    const bizRes = await query<BusinessStatsRow>(
      'SELECT id, observed_orders_count, invited_orders_count, median_response_hours FROM businesses WHERE id = $1',
      [body.business_id]
    );

    if (bizRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Negocio con ID ${body.business_id} no existe` },
        { status: 404 }
      );
    }

    // Spam gates (BL-04): per-client hourly limit, then captcha (no-op unless
    // TURNSTILE_SECRET_KEY is set), then a well-formed optional email.
    const client = clientAddress(request.headers.get('x-forwarded-for'));
    const clientHash = reviewClientHash(client);
    const recent = await query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM reviews WHERE client_hash = $1 AND created_at > NOW() - INTERVAL '1 hour'",
      [clientHash]
    );
    if ((parseInt(recent.rows[0]?.count ?? '0', 10) || 0) >= REVIEWS_PER_CLIENT_PER_HOUR) {
      return NextResponse.json(
        { success: false, error: 'Recibimos muchas opiniones desde tu conexión. Intenta de nuevo en una hora.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      );
    }

    const captcha = await verifyCaptcha(body.captcha_token, client);
    if (captcha === 'invalid') {
      return NextResponse.json({ success: false, error: 'No pudimos verificar que eres una persona. Intenta de nuevo.' }, { status: 400 });
    }
    if (captcha === 'unavailable') {
      return NextResponse.json({ success: false, error: 'No pudimos verificar tu envío. Intenta de nuevo en unos minutos.' }, { status: 503 });
    }

    let emailHash: string | null = null;
    if (body.author_email !== undefined && body.author_email !== null && body.author_email !== '') {
      const email = typeof body.author_email === 'string' ? parseEmail(body.author_email) : null;
      if (!email) {
        return NextResponse.json({ success: false, error: 'El correo no es válido' }, { status: 400 });
      }
      emailHash = reviewEmailHash(email);
    }
    const bodyHash = reviewBodyHash(body.body);

    let verifiedLevel: 'confirmed_payment' | 'confirmed_store_order' | 'reviewed_proof' | 'unverified_experience' = 'unverified_experience';
    let verifiedOrderId: number | null = null;

    if (!trustClaims) {
      verifiedLevel = 'unverified_experience';
    } else if (body.order_id && typeof body.order_id === 'number') {
      const orderRes = await query<{ id: number; status: string }>(
        'SELECT id, status FROM orders WHERE id = $1 AND business_id = $2 LIMIT 1',
        [body.order_id, body.business_id]
      );

      if (orderRes.rows.length > 0) {
        // Prevent duplicate reviews on the same order
        const dupRes = await query<{ id: number }>(
          'SELECT id FROM reviews WHERE order_id = $1 AND business_id = $2 LIMIT 1',
          [body.order_id, body.business_id]
        );
        if (dupRes.rows.length > 0) {
          return NextResponse.json(
            { success: false, error: 'Este pedido ya cuenta con una opinión registrada' },
            { status: 400 }
          );
        }

        verifiedOrderId = orderRes.rows[0].id;
        const ordStatus = orderRes.rows[0].status;
        if (ordStatus === 'delivered' || ordStatus === 'fulfilled') {
          verifiedLevel = body.verification_level === 'confirmed_payment' ? 'confirmed_payment' : 'confirmed_store_order';
        } else {
          verifiedLevel = 'confirmed_store_order';
        }
      } else {
        // Order not found for this business: fail safe to unverified_experience
        verifiedLevel = 'unverified_experience';
      }
    } else if (body.verification_level === 'reviewed_proof') {
      verifiedLevel = 'reviewed_proof';
    } else {
      verifiedLevel = 'unverified_experience';
    }

    const scoreWeight = VERIFICATION_WEIGHTS[verifiedLevel] ?? 0.35;
    const integrityFactor = 1.0;

    // Mask author contact if provided or auto-mask name
    let maskedContact = body.author_masked_contact;
    if (!maskedContact) {
      const cleanName = body.author_name.trim().toLowerCase().replace(/\s+/g, '.');
      maskedContact = `${cleanName.slice(0, 2)}***@opinio.mx`;
    }

    const outcome = await withTransaction(async (client) => {
      // 1. Serialize per-client hourly rate limit and cross-business body-hash duplicate checks atomically
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext('opinio_review_client'), hashtext($1)), pg_advisory_xact_lock(hashtext('opinio_review_body'), hashtext($2))",
        [clientHash, bodyHash]
      );

      // 2. Acquire row lock on business to prevent concurrent lost updates
      const bizRes = await client.query<BusinessStatsRow>(
        'SELECT id, observed_orders_count, invited_orders_count, median_response_hours FROM businesses WHERE id = $1 FOR UPDATE',
        [body.business_id]
      );

      if (bizRes.rows.length === 0) {
        throw new Error(`Negocio con ID ${body.business_id} no existe`);
      }

      // 3. Re-verify per-client hourly rate limit atomically under the client_hash advisory lock
      const recentInTx = await client.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM reviews WHERE client_hash = $1 AND created_at > NOW() - INTERVAL '1 hour'",
        [clientHash]
      );
      if ((parseInt(recentInTx.rows[0]?.count ?? '0', 10) || 0) >= REVIEWS_PER_CLIENT_PER_HOUR) {
        return { rateLimited: true as const, duplicate: false as const };
      }

      // 4. Duplicate body (any business) or repeat email (same business)
      const dup = await client.query<{ id: number }>(
        `SELECT id FROM reviews
          WHERE body_hash = $1 OR ($2::text IS NOT NULL AND business_id = $3 AND author_email_hash = $2)
          LIMIT 1`,
        [bodyHash, emailHash, body.business_id]
      );
      if (dup.rows.length > 0) return { rateLimited: false as const, duplicate: true as const };

      // 5. Insert Review as pending: it is not public and does not move the
      // score until an administrator approves it (src/lib/review-moderation.ts).
      const insertRes = await client.query<ReviewRow>(
        `INSERT INTO reviews (
          business_id, order_id, rating, title, body, author_name,
          author_masked_contact, verification_level, score_weight,
          integrity_factor, product_name, status,
          body_hash, author_email_hash, client_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, $13, $14)
        RETURNING *`,
        [
          body.business_id,
          verifiedOrderId,
          Math.round(body.rating),
          body.title?.trim() || null,
          body.body.trim(),
          body.author_name.trim(),
          maskedContact,
          verifiedLevel,
          scoreWeight,
          integrityFactor,
          body.product_name?.trim() || 'Experiencia Comercial',
          bodyHash,
          emailHash,
          clientHash,
        ]
      );

      return { rateLimited: false as const, duplicate: false as const, createdReview: insertRes.rows[0] };
    });

    if (outcome.rateLimited) {
      return NextResponse.json(
        { success: false, error: 'Recibimos muchas opiniones desde tu conexión. Intenta de nuevo en una hora.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      );
    }

    if (outcome.duplicate) {
      return NextResponse.json(
        { success: false, error: 'Ya recibimos una opinión igual. No puedes enviarla de nuevo.' },
        { status: 409 }
      );
    }
    const { createdReview } = outcome;

    // CONVERSION-001: the review write has committed as 'pending' (moderation,
    // BL-04). Only the submission's conversion_identities association is stored
    // here (`pendingModeration: true`); `milestone_review_published` is recorded
    // and dispatched only after a platform administrator approves the review.
    const context = parseConversionContext(body.conversion);
    afterResponse(() =>
      recordMilestone({
        entityType: 'review',
        entityId: String(createdReview.id),
        milestone: 'review_published',
        journey: 'consumer_review',
        context,
        pendingModeration: true,
      }),
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Opinión recibida. Se publicará cuando la revisemos.',
        review: toPublicReview(createdReview),
        updated_metrics: null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api/v1/reviews POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al registrar la opinión' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const businessId = params.get('business_id');
    const limit = parseInt(params.get('limit') || '20');

    // TODO: implement real review listing query
    return NextResponse.json({ success: true, reviews: [], total: 0 });
  } catch (error) {
    console.error('[api/v1/reviews GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Error al cargar opiniones' }, { status: 500 });
  }
}
