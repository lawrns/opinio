import { describe, it, expect } from 'vitest';
import {
  passportDescription,
  passportRecordScope,
  passportTitle,
  type PassportRecordFacts,
} from './passport-metadata';

// Record facts as observed on the live production passports during the audit
// (razón social, categoría and cobertura are the values the pages render).
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

describe('passport metadata for same-brand merchant records', () => {
  it.each(OBSERVED_PAIRS)('renders distinguishable titles and descriptions', (first, second) => {
    const titles = [passportTitle(first), passportTitle(second)].map((value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ''));
    const descriptions = [passportDescription(first), passportDescription(second)].map((value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ''));
    expect(titles[0]).not.toBe(titles[1]);
    expect(descriptions[0]).not.toBe(descriptions[1]);
  });

  it('keeps a record without published identity out of the identity claim', () => {
    const [withoutLegalName] = OBSERVED_PAIRS[0];
    expect(passportTitle(withoutLegalName)).toBe(
      '¿Es confiable Mercado Pago? Comercio Electrónico Especializado · cobertura nacional | Opinio México'
    );
    expect(passportDescription(withoutLegalName)).not.toContain('razón social');
  });

  it('states the razón social and the recorded scope for a specific-scope record', () => {
    const [, innovaSportNational] = OBSERVED_PAIRS[2];
    expect(passportTitle(innovaSportNational)).toBe(
      '¿Es confiable Innovasport? Belleza, moda y calzado · cobertura nacional | Opinio México'
    );
    expect(passportDescription(innovaSportNational)).toContain('razón social: Innovasport, S.A. de C.V.');
    expect(passportDescription(innovaSportNational)).toContain('Cobertura nacional.');
  });
});

describe('record scope classification', () => {
  it.each(['Nacional (México)', 'Plataforma nacional'])('reads national coverage from %j', (area) => {
    expect(passportRecordScope(area).kind).toBe('national');
  });

  it('keeps a compact place verbatim', () => {
    expect(passportRecordScope('Monterrey, Nuevo León')).toMatchObject({
      kind: 'place',
      titlePhrase: 'cobertura en Monterrey, Nuevo León',
    });
    expect(passportTitle({ brandName: 'X', operatingArea: 'Guadalajara, Jalisco' })).toContain('cobertura en Guadalajara, Jalisco');
  });

  it('does not read "internacional" as national coverage', () => {
    const scope = passportRecordScope('AEROPUERTO INTERNACIONAL DE MONTERREY. TERMINAL C, CARRETERA MIGUEL ALEMÁN KM 24, APODACA, NL, MÉXICO, C.P. 66600');
    expect(scope.kind).toBe('address');
  });

  it.each(['NO PROPORCIONA', 'DATOS POR SUCURSAL. CONSULTAR', '', '   ', null, undefined])(
    'states no scope for the non-informative value %j',
    (area) => {
      const scope = passportRecordScope(area);
      expect(scope.kind).toBe('unknown');
      expect(scope.titlePhrase).toBeNull();
      const title = passportTitle({ brandName: 'X', legalName: 'Equis, S.A. de C.V.', operatingArea: area });
      const description = passportDescription({ brandName: 'X', legalName: 'Equis, S.A. de C.V.', operatingArea: area });
      expect(title).not.toMatch(/cobertura|domicilio/);
      expect(description).not.toMatch(/cobertura|domicilio/);
    }
  );

  it('never publishes a raw street address in the title or the description', () => {
    const address = 'DURANGO NO. 230, COLONIA ROMA, ALCALDÍA CUAUHTÉMOC, C.P. 06700, CIUDAD DE MÉXICO';
    const facts: PassportRecordFacts = { brandName: 'El Palacio de Hierro', legalName: 'El Palacio de Hierro, S.A. de C.V.', category: 'Retail y departamentales', operatingArea: address };
    expect(passportRecordScope(address).kind).toBe('address');
    expect(passportTitle(facts)).toContain('domicilio registrado');
    expect(passportTitle(facts)).not.toContain('DURANGO');
    expect(passportDescription(facts)).not.toContain('DURANGO');
  });
});

describe('razón social that only repeats the brand', () => {
  it('distinguishes through the catalogue category instead of repeating the brand', () => {
    const facts: PassportRecordFacts = { brandName: 'Innovasport', legalName: 'Innovasport, S.A. de C.V.', category: 'Moda, Calzado y Accesorios', operatingArea: 'Monterrey, Nuevo León' };
    const title = passportTitle(facts);
    expect(title).toBe('¿Es confiable Innovasport? Moda, Calzado y Accesorios · cobertura en Monterrey, Nuevo León | Opinio México');
    expect(title.match(/Innovasport/g)).toHaveLength(1);
    expect(passportDescription(facts)).toContain('razón social: Innovasport, S.A. de C.V.');
  });

  it('falls back to a plain passport title when no distinguishing fact is known', () => {
    expect(passportTitle({ brandName: 'X' })).toBe('¿Es confiable X? Pasaporte de Confianza | Opinio México');
    expect(passportDescription({ brandName: 'X' })).toBe(
      'Pasaporte de confianza de X. Consulta su identidad, registros públicos y opiniones en Opinio México.'
    );
  });
});
