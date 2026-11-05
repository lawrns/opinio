// Identity metadata for the public passport (/b/<slug>).
//
// The audit found five pairs of same-brand merchant records plus a large
// fallback family that shared one document title and one meta description
// (JEV-008/JEV-010/JEV-026/JEV-027). Records are never merged because a title
// matches: the passport states the record's own facts — the published brand or
// razón social, the catalogue category and the recorded scope — so two records
// of the same brand stay distinguishable in the rendered metadata.
//
// `operating_area` is free-form source data, so it is quoted verbatim as the
// record's scope ("ámbito registrado: …") and never classified: a short value is
// not assumed to be a city, a long value is not assumed to be a street address,
// and neither is turned into a coverage or domicile claim. Source placeholders
// ("NO PROPORCIONA", "DATOS POR SUCURSAL. CONSULTAR") carry no scope, so they
// are omitted instead of being published as a value.

export interface PassportRecordFacts {
  brand_name: string;
  legal_name?: string | null;
  category?: string | null;
  operating_area?: string | null;
}

export interface PassportMetadata {
  title: string;
  description: string;
}

const SCOPE_PLACEHOLDER = /^(no proporciona|sin datos|no disponible|datos por sucursal|consultar)/i;

/**
 * The recorded scope as the source states it, or null when the source carries
 * no scope at all (empty value or a placeholder such as "NO PROPORCIONA").
 */
function recordedScopeValue(operatingArea?: string | null): string | null {
  const value = (operatingArea ?? '').trim();
  return !value || SCOPE_PLACEHOLDER.test(value) ? null : value;
}

/** Google rewrites titles past this. The question plus a short distinguisher fits; the legal name does not. */
const TITLE_MAX = 60;
const TITLE_TAIL = ' | Opinio';

/**
 * A short category label for the title. Stops at a comma or at "y" so the
 * snippet does not end mid-phrase ("Marketplaces y"). Caps a long first word.
 */
function shortCategory(category: string): string {
  const head = category.split(/[,;/]/)[0]?.trim() ?? '';
  const words = head.split(/\s+/).filter(Boolean);
  let out = '';
  for (const word of words) {
    if (word.toLowerCase() === 'y') break;
    const next = out ? `${out} ${word}` : word;
    if (next.length > 22) break;
    out = next;
  }
  const label = out || words[0] || '';
  return label.length <= 22 ? label : label.slice(0, 22);
}

/**
 * Title and meta description for one passport.
 *
 * The title carries the query ("¿Es confiable {marca}?") and, when the record
 * has one, a short category so two passports of the same brand stay distinct
 * in the SERP. The razón social and the recorded scope stay in the description:
 * they are what made titles 160–270 characters and got rewritten.
 */
export function passportMetadata(facts: PassportRecordFacts): PassportMetadata {
  const legalName = (facts.legal_name ?? '').trim();
  const category = (facts.category ?? '').trim();
  const recordedScope = recordedScopeValue(facts.operating_area);

  const question = `¿Es confiable ${facts.brand_name.trim()}?`;
  const distinguisher = category ? shortCategory(category) : '';
  const middle = distinguisher || 'Opiniones';
  let title = `${question} ${middle}${TITLE_TAIL}`;
  if (title.length > TITLE_MAX) {
    const room = TITLE_MAX - question.length - 1 - TITLE_TAIL.length;
    title = room >= 8
      ? `${question} ${middle.slice(0, room).replace(/[\s·]+$/, '')}${TITLE_TAIL}`
      : question.length + TITLE_TAIL.length <= TITLE_MAX
        ? `${question}${TITLE_TAIL}`
        : question.slice(0, TITLE_MAX);
  }

  let description = `¿Es confiable ${facts.brand_name}? Opiniones, quejas y análisis verificados en su pasaporte de confianza${legalName ? ` (razón social: ${legalName})` : ''}.`;
  if (category) {
    description += ` Categoría: ${category}.`;
  }
  if (recordedScope) {
    description += ` Ámbito registrado: ${recordedScope}.`;
  }
  description += ' Consulta su identidad, registros públicos y opiniones en Opinio México.';

  return { title, description };
}
