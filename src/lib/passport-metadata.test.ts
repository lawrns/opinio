import { describe, it, expect } from 'vitest';
import { passportMetadata, passportRecordScope, type PassportRecordFacts } from './passport-metadata';

// Record facts as observed on the live production passports during the audit
// (razón social, categoría and ámbito are the values those pages render).
const OBSERVED_PAIRS: Array<[PassportRecordFacts, PassportRecordFacts]> = [
  [
    { brandName: 'Mercado Pago', legalName: null, category: 'Comercio Electrónico Especializado', operatingArea: 'Nacional (México)' },
    { brandName: 'Mercado Pago', legalName: 'MP Agregador, S. de R.L. de C.V.', category: 'Fintech, neobancos y pagos', operatingArea: 'Nacional (México)' },
  ],
  [
    { brandName: 'Uber Eats', legalName: null, category: 'Comercio Electrónico Especializado', operatingArea: 'Nacional (México)' },
    { brandName: 'Uber Eats', legalName: 'Uber Portier México, S. de R.L. de C.V.', category: 'Delivery y quick commerce', operatingArea: 'Nacional (México)' },
  ],
  [
    { brandName: 'Innovasport', legalName: 'Innovasport, S.A. de C.V.', category: 'Moda, Calzado y Accesorios', operatingArea: 'Monterrey, Nuevo León' },
    { brandName: 'Innovasport', legalName: 'Innovasport, S.A. de C.V.', category: 'Belleza, moda y calzado', operatingArea: 'Nacional (México)' },
  ],
  [
    { brandName: 'Mercado Libre', legalName: 'DEREMATE.COM DE MÉXICO, S. DE R.L. DE C.V.', category: 'Joyería, Relojes y Artesanías', operatingArea: 'BLVD. MIGUEL DE CERVANTES SAAVEDRA 161, PISOS 14 Y 15, GRANADA, MIGUEL HIDALGO, 11520 CIUDAD DE MÉXICO, CDMX, MÉXICO' },
    { brandName: 'Mercado Libre', legalName: 'DeRemate.com de México, S. de R.L. de C.V.', category: 'Marketplaces y e-commerce', operatingArea: 'Nacional (México)' },
  ],
  [
    { brandName: 'El Palacio De Hierro', legalName: 'EL PALACIO DE HIERRO, S.A. DE C.V.', category: 'Marketplaces y Tiendas Departamentales', operatingArea: 'DURANGO NO. 230, COLONIA ROMA, ALCALDÍA CUAUHTÉMOC, C.P. 06700, CIUDAD DE MÉXICO' },
    { brandName: 'El Palacio de Hierro', legalName: 'El Palacio de Hierro, S.A. de C.V.', category: 'Retail y departamentales', operatingArea: 'Nacional (México)' },
  ],
];

const loose = (value: string) => value.toLowerCase().replace(/[^a-z0-9áéíóúñü]+/gi, '');

describe('same-brand merchant records', () => {
  it.each(OBSERVED_PAIRS)('stay distinguishable in title and description', (first, second) => {
    const firstMetadata = passportMetadata(first);
    const secondMetadata = passportMetadata(second);

    expect(loose(firstMetadata.title)).not.toBe(loose(secondMetadata.title));
    expect(loose(firstMetadata.description)).not.toBe(loose(secondMetadata.description));
    expect(firstMetadata.title).toContain(first.brandName);
    expect(secondMetadata.title).toContain(second.brandName);
  });

  it('quote each record scope verbatim instead of a classification', () => {
    const [addressRecord, nationalRecord] = OBSERVED_PAIRS[3];
    const addressScope = passportMetadata(addressRecord);
    const nationalScope = passportMetadata(nationalRecord);

    expect(addressScope.title).toContain(addressRecord.operatingArea);
    expect(addressScope.description).toContain(addressRecord.operatingArea);
    expect(nationalScope.title).toContain(nationalRecord.operatingArea);
    expect(nationalScope.title).not.toContain(addressRecord.operatingArea);
  });
});

describe('record scope', () => {
  it.each([
    '32 estados',
    'Monterrey, Nuevo León',
    'Nacional (México)',
    'Región Metropolitana del Valle de México y zonas conurbadas del norte del país',
    'DURANGO NO. 230, COLONIA ROMA, ALCALDÍA CUAUHTÉMOC, C.P. 06700, CIUDAD DE MÉXICO',
  ])('keeps the source value %j verbatim whatever its shape', (operatingArea) => {
    expect(passportRecordScope(operatingArea)).toEqual({ kind: 'documented', value: operatingArea });

    const { title, description } = passportMetadata({ brandName: 'Marca', operatingArea });
    expect(title).toContain(operatingArea);
    expect(description).toContain(operatingArea);
  });

  it.each(['NO PROPORCIONA', 'DATOS POR SUCURSAL. CONSULTAR', '', '   ', null, undefined])(
    'omits the non-informative source value %j instead of stating a scope',
    (operatingArea) => {
      expect(passportRecordScope(operatingArea)).toEqual({ kind: 'unknown', value: null });

      const { title, description } = passportMetadata({
        brandName: 'Marca',
        legalName: 'Marca, S.A. de C.V.',
        category: 'Comercio Electrónico Especializado',
        operatingArea,
      });
      expect(title).not.toMatch(/ámbito/i);
      expect(description).not.toMatch(/ámbito/i);
      if (operatingArea?.trim()) {
        expect(`${title} ${description}`).not.toContain(operatingArea.trim());
      }
    },
  );

  it.each(['32 estados', 'Guadalajara, Jalisco', 'BOULEVARD MANUEL ÁVILA CAMACHO NO. 5, C.P. 53390'])(
    'never turns the source value %j into a coverage or domicile claim',
    (operatingArea) => {
      const { title, description } = passportMetadata({ brandName: 'Marca', operatingArea });
      const withoutSourceValue = `${title} ${description}`.split(operatingArea).join('');

      expect(withoutSourceValue).not.toMatch(/cobertura|domicilio/i);
    },
  );
});

describe('record facts', () => {
  it('carries the published razón social and category as record data', () => {
    const facts: PassportRecordFacts = {
      brandName: 'Marca',
      legalName: 'Comercializadora Marca, S. de R.L. de C.V.',
      category: 'Hogar, Muebles y Decoración',
      operatingArea: 'Nacional (México)',
    };
    const { title, description } = passportMetadata(facts);

    expect(title).toContain(facts.legalName);
    expect(description).toContain(facts.legalName);
    expect(description).toContain(facts.category);
  });

  it('falls back to the catalogue category when no razón social is published', () => {
    const { title, description } = passportMetadata({ brandName: 'Marca', category: 'Comercio Electrónico Especializado' });

    expect(title).toContain('Comercio Electrónico Especializado');
    expect(description).not.toMatch(/razón social/i);
  });

  it('claims no identity, scope or verification the record does not publish', () => {
    const { title, description } = passportMetadata({ brandName: 'Marca' });

    expect(title).toContain('Marca');
    expect(description).toContain('Marca');
    expect(title).not.toMatch(/ámbito/i);
    expect(description).not.toMatch(/ámbito|razón social|categoría/i);
  });
});
