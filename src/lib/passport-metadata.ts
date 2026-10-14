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

type RecordScope =
  | { kind: 'documented'; value: string }
  | { kind: 'unknown'; value: null };

const SCOPE_PLACEHOLDER = /^(no proporciona|sin datos|no disponible|datos por sucursal|consultar)/i;

/** The recorded scope as the source states it, or unknown for placeholders. */
function passportRecordScope(operatingArea?: string | null): RecordScope {
  const value = (operatingArea ?? '').trim();
  if (!value || SCOPE_PLACEHOLDER.test(value)) {
    return { kind: 'unknown', value: null };
  }
  return { kind: 'documented', value };
}

/**
 * Title and meta description for one passport: purpose, the record's published
 * identity (razón social or catalogue category) and its recorded scope.
 */
export function passportMetadata(facts: PassportRecordFacts): PassportMetadata {
  const legalName = (facts.legal_name ?? '').trim();
  const category = (facts.category ?? '').trim();
  const scope = passportRecordScope(facts.operating_area);

  let distinction = legalName || category;
  if (scope.kind === 'documented') {
    const recordedScope = `ámbito registrado: ${scope.value}`;
    distinction = distinction ? `${distinction} · ${recordedScope}` : recordedScope;
  }
  const title = `¿Es confiable ${facts.brand_name}? ${distinction || 'Pasaporte de Confianza'} | Opinio México`;

  let description = `Pasaporte de confianza de ${facts.brand_name}${legalName ? ` (razón social: ${legalName})` : ''}.`;
  if (category) {
    description += ` Categoría: ${category}.`;
  }
  if (scope.kind === 'documented') {
    description += ` Ámbito registrado: ${scope.value}.`;
  }
  description += ' Consulta su identidad, registros públicos y opiniones en Opinio México.';

  return { title, description };
}
