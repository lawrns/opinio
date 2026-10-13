// Identity metadata for the public passport (/b/<slug>).
//
// The audit found five pairs of same-brand merchant records plus a large
// fallback family that shared one document title and one meta description
// (JEV-008/JEV-010/JEV-026/JEV-027). Records are never merged because a title
// matches: instead every passport states the identity and the record scope the
// page actually documents — the registered brand or razón social and the
// cobertura/domicilio the record carries — so two records of the same brand
// stay distinguishable in the rendered metadata.
//
// `operating_area` is a free-form source field: it holds a national coverage
// statement, a city, a registered street address, or a source placeholder such
// as "NO PROPORCIONA". Only what the value actually supports is stated; raw
// addresses are never parsed into places and placeholders never become a
// geographic claim.

export interface PassportRecordFacts {
  brandName: string;
  legalName?: string | null;
  category?: string | null;
  operatingArea?: string | null;
}

export type RecordScopeKind = 'national' | 'place' | 'address' | 'unknown';

export interface RecordScope {
  kind: RecordScopeKind;
  /** Short clause for the document title, or null when the scope is unknown. */
  titlePhrase: string | null;
  /** Sentence for the meta description, or null when the scope is unknown. */
  descriptionPhrase: string | null;
}

const SCOPE_PLACEHOLDER = /^(no proporciona|sin datos|no disponible|datos por sucursal|consultar)/i;
const NATIONAL_COVERAGE = /\bnacional\b/i;
const DIGITS = /\d/;
const MAX_PLACE_LENGTH = 40;

function normalizeToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * Classifies the recorded scope. "place" keeps a compact geographic value
 * verbatim; "address" marks a specific registered location whose street-level
 * detail belongs to the page, not to a title.
 */
export function passportRecordScope(operatingArea?: string | null): RecordScope {
  const area = (operatingArea ?? '').trim();

  if (!area || SCOPE_PLACEHOLDER.test(area)) {
    return { kind: 'unknown', titlePhrase: null, descriptionPhrase: null };
  }

  if (NATIONAL_COVERAGE.test(area)) {
    return { kind: 'national', titlePhrase: 'cobertura nacional', descriptionPhrase: 'Cobertura nacional.' };
  }

  if (!DIGITS.test(area) && area.length <= MAX_PLACE_LENGTH) {
    return { kind: 'place', titlePhrase: `cobertura en ${area}`, descriptionPhrase: `Cobertura: ${area}.` };
  }

  return {
    kind: 'address',
    titlePhrase: 'domicilio registrado',
    descriptionPhrase: 'Domicilio registrado en el expediente.',
  };
}

/**
 * The brand or entity that distinguishes this record, or null when the razón
 * social merely repeats the brand already named in the question (then the
 * catalogue category carries the distinction instead).
 */
function identityClause(facts: PassportRecordFacts): string | null {
  const legalName = (facts.legalName ?? '').trim();
  if (!legalName) return null;

  const entity = legalName.split(',')[0].trim() || legalName;
  const brand = normalizeToken(facts.brandName);
  if (brand && normalizeToken(entity).includes(brand)) return null;

  return entity;
}

/** Purpose title, brand identity and record scope for one passport. */
export function passportTitle(facts: PassportRecordFacts): string {
  const scope = passportRecordScope(facts.operatingArea);
  const distinction = identityClause(facts) ?? ((facts.category ?? '').trim() || null);
  const clauses = [distinction, scope.titlePhrase].filter(Boolean);

  return `¿Es confiable ${facts.brandName}? ${clauses.length ? clauses.join(' · ') : 'Pasaporte de Confianza'} | Opinio México`;
}

/**
 * Meta description: the full razón social and the recorded scope, then what the
 * page delivers. Nothing is asserted as verified — the fields are presented as
 * the record presents them.
 */
export function passportDescription(facts: PassportRecordFacts): string {
  const legalName = (facts.legalName ?? '').trim();
  const category = (facts.category ?? '').trim();
  const scope = passportRecordScope(facts.operatingArea);

  const parts = [
    `Pasaporte de confianza de ${facts.brandName}${legalName ? ` (razón social: ${legalName})` : ''}.`,
    scope.descriptionPhrase,
    category ? `Categoría: ${category}.` : null,
    'Consulta su identidad, registros públicos y opiniones en Opinio México.',
  ];

  return parts.filter(Boolean).join(' ');
}
