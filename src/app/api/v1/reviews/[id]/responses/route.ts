import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface ResponseInput {
  responder_name?: string;
  response_text: string;
  business_id?: number;
}

interface ReviewRow {
  id: number;
  business_id: number;
  brand_name: string;
}

interface ReviewResponseRow {
  id: number;
  review_id: number;
  business_id: number;
  responder_name: string;
  response_text: string;
  created_at: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const reviewId = parseInt(rawId?.trim() || '', 10);

    if (!reviewId || isNaN(reviewId)) {
      return NextResponse.json(
        { success: false, error: 'ID de opinión inválido' },
        { status: 400 }
      );
    }

    const body = (await request.json()) as ResponseInput;

    if (!body.response_text || typeof body.response_text !== 'string' || body.response_text.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'El texto de la respuesta debe contener al menos 3 caracteres' },
        { status: 400 }
      );
    }

    // Verify review exists
    const revRes = await query<ReviewRow>(
      `SELECT r.id, r.business_id, b.brand_name
       FROM reviews r
       INNER JOIN businesses b ON b.id = r.business_id
       WHERE r.id = $1 LIMIT 1`,
      [reviewId]
    );

    if (revRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Opinión con ID ${reviewId} no encontrada` },
        { status: 404 }
      );
    }

    const review = revRes.rows[0];
    const responderName = body.responder_name?.trim() || `Equipo Oficial ${review.brand_name}`;

    // Insert response
    const insertRes = await query<ReviewResponseRow>(
      `INSERT INTO review_responses (review_id, business_id, responder_name, response_text, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [reviewId, review.business_id, responderName, body.response_text.trim()]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Respuesta oficial publicada exitosamente',
        response: insertRes.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api/v1/reviews/[id]/responses POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al publicar la respuesta a la opinión' },
      { status: 500 }
    );
  }
}
