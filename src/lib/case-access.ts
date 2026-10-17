// Access rules for resolution cases while the platform has no buyer or
// merchant credentials. Every case read served without authentication goes
// through these projections, and every case write goes through
// `consumerConfirmationAttempt`.
//
// Until a buyer credential exists, no caller can prove it is the buyer, so the
// consumer confirmation (the only signal that raises the resolution rate in the
// trust score) is refused on every path.

export const CONSUMER_CONFIRMED_STATUS = 'resolved_consumer_confirmed';

export const CONSUMER_CONFIRMATION_PENDING_ERROR =
  'La confirmación del comprador está pendiente de verificación y no se puede registrar todavía.';

/** Neutral sender label shown publicly instead of the buyer's name. */
export const PUBLIC_CONSUMER_SENDER = 'Comprador';

/**
 * SQL column list for public case reads. Kept explicit so a new private
 * column is never exposed by a `SELECT *`. Prefix with an alias as needed.
 */
export const PUBLIC_CASE_COLUMNS = [
  'id',
  'business_id',
  'review_id',
  'case_number',
  'issue_category',
  'customer_requested_remedy',
  'status',
  'is_consumer_confirmed',
  'remedy_offered',
  'resolution_summary',
  'median_first_response_minutes',
  'total_resolution_hours',
  'created_at',
  'updated_at',
  'resolved_at',
] as const;

export function publicCaseColumnsSql(alias?: string): string {
  return PUBLIC_CASE_COLUMNS.map((column) => (alias ? `${alias}.${column}` : column)).join(', ');
}

type PublicCaseColumn = (typeof PUBLIC_CASE_COLUMNS)[number];

export type PublicCase = Pick<
  {
    id: number;
    business_id: number;
    review_id: number | null;
    case_number: string;
    issue_category: string;
    customer_requested_remedy: string;
    status: string;
    is_consumer_confirmed: boolean;
    remedy_offered: string | null;
    resolution_summary: string | null;
    median_first_response_minutes: number;
    total_resolution_hours: number | null;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
  },
  PublicCaseColumn
>;

/** Copies only the public case fields; contact and order fields are dropped. */
export function toPublicCase(source: object): PublicCase {
  const row = source as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const column of PUBLIC_CASE_COLUMNS) {
    out[column] = row[column] ?? null;
  }
  out.total_resolution_hours =
    row.total_resolution_hours === null || row.total_resolution_hours === undefined
      ? null
      : Number(row.total_resolution_hours);
  out.is_consumer_confirmed = Boolean(row.is_consumer_confirmed);
  return out as PublicCase;
}

export interface PublicCaseMessage {
  id: number;
  case_id: number;
  sender_type: 'consumer' | 'merchant' | 'mediator';
  sender_name: string;
  message: string;
  created_at: string;
}

interface CaseMessageLike {
  id: number;
  case_id: number;
  sender_type: 'consumer' | 'merchant' | 'mediator';
  sender_name: string;
  message: string;
  is_private: boolean;
  created_at: string;
}

/** Drops private messages and replaces buyer names with a neutral label. */
export function toPublicMessages(messages: CaseMessageLike[]): PublicCaseMessage[] {
  return messages
    .filter((m) => !m.is_private)
    .map((m) => ({
      id: m.id,
      case_id: m.case_id,
      sender_type: m.sender_type,
      sender_name: m.sender_type === 'consumer' ? PUBLIC_CONSUMER_SENDER : m.sender_name,
      message: m.message,
      created_at: m.created_at,
    }));
}

/**
 * True when a write tries to record (or undo) the buyer's confirmation. Such
 * writes are refused with 403 until a buyer credential exists.
 */
export function consumerConfirmationAttempt(input: {
  status?: unknown;
  is_consumer_confirmed?: unknown;
}): boolean {
  const status = typeof input.status === 'string' ? input.status.trim().toLowerCase() : input.status;
  return status === CONSUMER_CONFIRMED_STATUS || input.is_consumer_confirmed !== undefined;
}
