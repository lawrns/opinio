'use server';

import { revalidatePath } from 'next/cache';
import { query } from './db';
import { Widget } from './types';

export async function postReviewResponseAction(formData: FormData) {
  const reviewId = Number(formData.get('review_id'));
  const businessId = Number(formData.get('business_id'));
  const responderName = String(formData.get('responder_name') || 'Atención a Clientes Oficial');
  const responseText = String(formData.get('response_text') || '').trim();

  if (!reviewId || !businessId || !responseText) {
    return { success: false, error: 'Faltan datos obligatorios para la respuesta.' };
  }

  try {
    // Check if a response already exists
    const existing = await query(
      `SELECT id FROM review_responses WHERE review_id = $1 LIMIT 1`,
      [reviewId]
    );

    if (existing.rows.length > 0) {
      await query(
        `UPDATE review_responses 
         SET responder_name = $1, response_text = $2, created_at = NOW() 
         WHERE review_id = $3`,
        [responderName, responseText, reviewId]
      );
    } else {
      await query(
        `INSERT INTO review_responses (review_id, business_id, responder_name, response_text)
         VALUES ($1, $2, $3, $4)`,
        [reviewId, businessId, responderName, responseText]
      );
    }

    revalidatePath('/merchant/reviews');
    revalidatePath('/merchant');
    return { success: true };
  } catch (err: unknown) {
    console.error('Error posting review response:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function updateCaseRemedyAction(formData: FormData) {
  const caseId = Number(formData.get('case_id'));
  const remedyOffered = String(formData.get('remedy_offered') || '').trim();
  const status = String(formData.get('status') || 'remedy_offered');
  const resolutionSummary = String(formData.get('resolution_summary') || '').trim();
  const responderName = String(formData.get('responder_name') || 'Equipo de Resolución');

  if (!caseId || !remedyOffered) {
    return { success: false, error: 'Debe especificar el remedio ofrecido al cliente.' };
  }

  try {
    await query(
      `UPDATE resolution_cases 
       SET remedy_offered = $1, status = $2, resolution_summary = $3, updated_at = NOW()
       WHERE id = $4`,
      [remedyOffered, status, resolutionSummary || null, caseId]
    );

    // Also log a public or private message in the timeline
    await query(
      `INSERT INTO case_messages (case_id, sender_type, sender_name, message, is_private)
       VALUES ($1, 'merchant', $2, $3, false)`,
      [caseId, responderName, `Propuesta de solución: ${remedyOffered}`]
    );

    revalidatePath('/merchant/inbox');
    revalidatePath('/merchant');
    return { success: true };
  } catch (err: unknown) {
    console.error('Error updating case remedy:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function sendCaseMessageAction(formData: FormData) {
  const caseId = Number(formData.get('case_id'));
  const senderName = String(formData.get('sender_name') || 'Representante Oficial');
  const message = String(formData.get('message') || '').trim();
  const isPrivate = formData.get('is_private') === 'true';

  if (!caseId || !message) {
    return { success: false, error: 'Mensaje no puede estar vacío.' };
  }

  try {
    await query(
      `INSERT INTO case_messages (case_id, sender_type, sender_name, message, is_private)
       VALUES ($1, 'merchant', $2, $3, $4)`,
      [caseId, senderName, message, isPrivate]
    );

    await query(
      `UPDATE resolution_cases SET updated_at = NOW() WHERE id = $1`,
      [caseId]
    );

    revalidatePath('/merchant/inbox');
    return { success: true };
  } catch (err: unknown) {
    console.error('Error sending case message:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function triggerInvitationAction(formData: FormData) {
  const businessId = Number(formData.get('business_id'));
  const channel = String(formData.get('channel') || 'whatsapp') as 'whatsapp' | 'email' | 'sms';
  const recipientTarget = String(formData.get('recipient_target') || '').trim();
  const orderId = formData.get('order_id') ? Number(formData.get('order_id')) : null;

  if (!businessId || !recipientTarget) {
    return { success: false, error: 'Destinatario o teléfono/email es requerido.' };
  }

  const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  try {
    await query(
      `INSERT INTO invitations (business_id, order_id, token, channel, recipient_target, status, sent_at)
       VALUES ($1, $2, $3, $4, $5, 'sent', NOW())`,
      [businessId, orderId, token, channel, recipientTarget]
    );

    // Update invited_orders_count and recalculate coverage
    await query(
      `UPDATE businesses 
       SET invited_orders_count = invited_orders_count + 1,
           coverage_percentage = LEAST(100.0, ROUND(((invited_orders_count + 1)::numeric / GREATEST(observed_orders_count, 1)) * 100, 1)),
           updated_at = NOW()
       WHERE id = $1`,
      [businessId]
    );

    revalidatePath('/merchant/requests');
    revalidatePath('/merchant');
    return { success: true, token };
  } catch (err: unknown) {
    console.error('Error triggering invitation:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function updateBusinessSettingsAction(formData: FormData) {
  const businessId = Number(formData.get('business_id'));
  const legalName = String(formData.get('legal_name') || '').trim();
  const rfc = String(formData.get('rfc') || '').trim().toUpperCase();
  const clee = String(formData.get('clee') || '').trim();
  const whatsapp = String(formData.get('whatsapp') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const domain = String(formData.get('domain') || '').trim();
  const operatingArea = String(formData.get('operating_area') || 'Nacional (México)').trim();

  if (!businessId) {
    return { success: false, error: 'ID de negocio inválido.' };
  }

  try {
    await query(
      `UPDATE businesses 
       SET legal_name = $1, rfc = $2, clee = $3, whatsapp = $4, phone = $5, domain = $6, operating_area = $7, updated_at = NOW()
       WHERE id = $8`,
      [legalName, rfc, clee, whatsapp, phone, domain, operatingArea, businessId]
    );

    // Update or insert identity for RFC if provided
    if (rfc) {
      const existingRfc = await query(
        `SELECT id FROM identities WHERE business_id = $1 AND type = 'rfc' LIMIT 1`,
        [businessId]
      );
      if (existingRfc.rows.length > 0) {
        await query(
          `UPDATE identities SET identifier = $1, status = 'verified', verified_at = NOW() WHERE id = $2`,
          [rfc, existingRfc.rows[0].id]
        );
      } else {
        await query(
          `INSERT INTO identities (business_id, type, identifier, status, source)
           VALUES ($1, 'rfc', $2, 'verified', 'SAT Cédula de Identificación Fiscal')`,
          [businessId, rfc]
        );
      }
    }

    // Update or insert identity for CLEE if provided
    if (clee) {
      const existingClee = await query(
        `SELECT id FROM identities WHERE business_id = $1 AND type = 'denue' LIMIT 1`,
        [businessId]
      );
      if (existingClee.rows.length > 0) {
        await query(
          `UPDATE identities SET identifier = $1, status = 'verified', verified_at = NOW() WHERE id = $2`,
          [clee, existingClee.rows[0].id]
        );
      } else {
        await query(
          `INSERT INTO identities (business_id, type, identifier, status, source)
           VALUES ($1, 'denue', $2, 'verified', 'INEGI DENUE Establecimientos')`,
          [businessId, clee]
        );
      }
    }

    revalidatePath('/merchant/settings');
    revalidatePath('/merchant');
    return { success: true };
  } catch (err: unknown) {
    console.error('Error updating business settings:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function createOrUpdateWidgetAction(formData: FormData) {
  const businessId = Number(formData.get('business_id'));
  const widgetType = String(formData.get('widget_type') || 'badge');
  const theme = String(formData.get('theme') || 'light');
  const style = String(formData.get('style') || 'pill');
  const showScore = formData.get('showScore') === 'true';
  const showCoverage = formData.get('showCoverage') === 'true';

  if (!businessId) {
    return { success: false, error: 'ID de negocio inválido.' };
  }

  const token = `wgt_${businessId}_${widgetType}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    const res = await query<Widget>(
      `INSERT INTO widgets (business_id, token, widget_type, theme, config, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [businessId, token, widgetType, theme, JSON.stringify({ style, showScore, showCoverage })]
    );

    revalidatePath('/merchant/widgets');
    return { success: true, widget: res.rows[0] };
  } catch (err: unknown) {
    console.error('Error creating widget:', err);
    return { success: false, error: (err as Error).message };
  }
}
