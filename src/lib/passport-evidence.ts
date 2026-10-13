export interface IdentityEvidenceRow {
  type: string;
  identifier: string;
  /**
   * Stored as a plain string on purpose: the table can carry statuses outside
   * the known union, and those must surface as `unknown` rather than being
   * narrowed away by a cast.
   */
  status: string;
  source: string | null;
}

export interface OfficialRecordEvidenceRow {
  record_date: string;
}

export interface MerchantFact {
  /** Identity type stored in the `identities` table (`rfc`, `denue`, `domain`, `whatsapp`, ...). */
  type: string;
  value: string | null;
}

export type FactVerificationStatus = 'missing' | 'registered' | 'verified' | 'pending' | 'rejected' | 'unknown';

export interface FactStatus {
  status: FactVerificationStatus;
  /** Visitor-facing record status, attributed to Opinio's records rather than an authority guarantee. */
  label: string;
  /** Recorded source of the verification, or null when the record has none. */
  source: string | null;
  /** Explicit provenance note for records that exist, or null when there is no record to attribute. */
  sourceNote: string | null;
}

const VERIFICATION_LEVEL_LABELS: Record<string, string> = {
  unverified: 'Sin verificar',
  public_info: 'Información pública',
  identity_verified: 'Identidad verificada',
  connected_orders: 'Pedidos conectados',
  transparent_coverage: 'Cobertura transparente',
};

const FACT_STATUS_LABELS: Record<FactVerificationStatus, string> = {
  missing: 'Sin información disponible',
  registered: 'Registrado sin verificación en Opinio',
  verified: 'Verificado en el registro de Opinio',
  pending: 'Verificación pendiente en Opinio',
  rejected: 'Verificación rechazada en Opinio',
  unknown: 'Estado de verificación no reconocido',
};

const normalizeIdentifier = (value: string) => value.replace(/[^a-z0-9]/gi, '').toLowerCase();

const IDENTIFIER_LABEL_PREFIX = /^(rfc|clee|denue|sat|inegi)[\s:.\-/]+/i;

/**
 * Describes what Opinio's records actually support for one merchant fact (RFC,
 * CLEE, domain, WhatsApp). A value registered on the business row is never
 * treated as verified; only an identity record of the same type can produce a
 * verified, pending or rejected state, and the recorded source is attributed
 * as Opinio's record — never as proof that the authority itself verified it.
 */
export function factStatus(fact: MerchantFact, identities: IdentityEvidenceRow[]): FactStatus {
  if (!fact.value) {
    return { status: 'missing', label: FACT_STATUS_LABELS.missing, source: null, sourceNote: null };
  }

  const normalizedValue = normalizeIdentifier(fact.value);
  const matchesFact = (row: IdentityEvidenceRow) => {
    if (row.type !== fact.type) return false;
    if (row.identifier === fact.value) return true;
    const withoutLabel = row.identifier.replace(IDENTIFIER_LABEL_PREFIX, '');
    return normalizedValue.length > 0 && normalizeIdentifier(withoutLabel) === normalizedValue;
  };

  const identity = identities.find(matchesFact);
  if (!identity) {
    return { status: 'registered', label: FACT_STATUS_LABELS.registered, source: null, sourceNote: null };
  }

  const source = identity.source?.trim() || null;
  const status: FactVerificationStatus =
    identity.status === 'verified'
      ? 'verified'
      : identity.status === 'pending'
        ? 'pending'
        : identity.status === 'rejected'
          ? 'rejected'
          : 'unknown';
  return {
    status,
    label: FACT_STATUS_LABELS[status],
    source,
    sourceNote: `Fuente registrada: ${source || 'no registrada'}`,
  };
}

/** Maps the stored `verified_level` code to visitor-readable text. */
export function verificationLevelLabel(level: string | null | undefined): string {
  return (level && VERIFICATION_LEVEL_LABELS[level]) || 'Sin nivel de verificación registrado';
}

/**
 * Parses a source record date. Source records use day-first dates
 * (`dd/mm/yyyy`, as published by the Mexican sources) or ISO dates; anything
 * else stays unknown rather than being guessed.
 */
export function parseRecordDate(value: string): Date | null {
  const trimmed = value.trim();
  const dayFirst = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  const parts = dayFirst
    ? { year: Number(dayFirst[3]), month: Number(dayFirst[2]), day: Number(dayFirst[1]) }
    : iso
      ? { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) }
      : null;

  if (!parts) return null;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const valid =
    date.getUTCFullYear() === parts.year &&
    date.getUTCMonth() === parts.month - 1 &&
    date.getUTCDate() === parts.day;
  return valid ? date : null;
}

/** Formats a source record date for display, or null when it is not a real date. */
export function formatRecordDate(value: string): string | null {
  const date = parseRecordDate(value);
  if (!date) return null;
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Returns the `record_date` value of the most recent official source record, or
 * null when no record carries a parseable date. Used to show freshness only
 * where an actual source record exists.
 */
export function latestRecordDateValue(records: OfficialRecordEvidenceRow[]): string | null {
  let latestDate: Date | null = null;
  let latestRaw: string | null = null;
  for (const record of records) {
    const date = parseRecordDate(record.record_date);
    if (date && (!latestDate || date > latestDate)) {
      latestDate = date;
      latestRaw = record.record_date;
    }
  }
  return latestRaw;
}
