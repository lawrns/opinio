import { describe, it, expect } from 'vitest';
import { passportMetadata, type PassportRecordFacts } from './passport-metadata';

// Record facts as observed on the live production passports during the audit
// (razón social, categoría and ámbito are the values those pages render).
const OBSERVED_PAIRS: Array<[PassportRecordFacts, PassportRecordFacts]> = [
  [
    { brand_name: 'Mercado Pago', legal_name: null, category: 'Comercio Electrónico Especializado', operating_area: 'Nacional (México)' },
    { brand_name: 'Mercado Pago', legal_name: 'MP Agregador, S. de R.L. de C.V.', category: 'Fintech, neobancos y pagos', operating_area: 'Nacional (México)' },
  ],
  [
    { brand_name: 'Uber Eats', legal_name: null, category: 'Comercio Electrónico Especializado', operating_area: 'Nacional (México)' },
    { brand_name: 'Uber Eats', legal_name: 'Uber Portier México, S. de R.L. de C.V.', category: 'Delivery y quick commerce', operating_area: 'Nacional (México)' },
  ],
  [
    { brand_name: 'Innovasport', legal_name: 'Innovasport, S.A. de C.V.', category: 'Moda, Calzado y Accesorios', operating_area: 'Monterrey, Nuevo León' },
    { brand_name: 'Innovasport', legal_name: 'Innovasport, S.A. de C.V.', category: 'Belleza, moda y calzado', operating_area: 'Nacional (México)' },
  ],
  [
    { brand_name: 'Mercado Libre', legal_name: 'DEREMATE.COM DE MÉXICO, S. DE R.L. DE C.V.', category: 'Joyería, Relojes y Artesanías', operating_area: 'BLVD. MIGUEL DE CERVANTES SAAVEDRA 161, PISOS 14 Y 15, GRANADA, MIGUEL HIDALGO, 11520 CIUDAD DE MÉXICO, CDMX, MÉXICO' },
    { brand_name: 'Mercado Libre', legal_name: 'DeRemate.com de México, S. de R.L. de C.V.', category: 'Marketplaces y e-commerce', operating_area: 'Nacional (México)' },
  ],
  [
    { brand_name: 'El Palacio De Hierro', legal_name: 'EL PALACIO DE HIERRO, S.A. DE C.V.', category: 'Marketplaces y Tiendas Departamentales', operating_area: 'DURANGO NO. 230, COLONIA ROMA, ALCALDÍA CUAUHTÉMOC, C.P. 06700, CIUDAD DE MÉXICO' },
    { brand_name: 'El Palacio de Hierro', legal_name: 'El Palacio de Hierro, S.A. de C.V.', category: 'Retail y departamentales', operating_area: 'Nacional (México)' },
  ],
];

const loose = (value: string) => value.toLowerCase().replace(/[^a-z0-9áéíóúñü]+/gi, '');

describe('same-brand merchant records', () => {
  it.each(OBSERVED_PAIRS)('stay distinguishable in title and description', (first, second) => {
    const firstMetadata = passportMetadata(first);
    const secondMetadata = passportMetadata(second);

    expect(loose(firstMetadata.title)).not.toBe(loose(secondMetadata.title));
    expect(loose(firstMetadata.description)).not.toBe(loose(secondMetadata.description));
  });
});

describe('unknown record scope', () => {
  it.each(['NO PROPORCIONA', 'DATOS POR SUCURSAL. CONSULTAR', '', '   ', null, undefined])(
    'stays out of the metadata for the non-informative source value %j',
    (operating_area) => {
      const { title, description } = passportMetadata({
        brand_name: 'Marca',
        legal_name: 'Marca, S.A. de C.V.',
        category: 'Comercio Electrónico Especializado',
        operating_area,
      });

      expect(`${title} ${description}`).not.toMatch(/ámbito/i);
    },
  );
});

describe('no invented geographic claim', () => {
  it('never turns an uncertain recorded value into coverage or a domicile', () => {
    const operating_area = '32 estados';
    const { title, description } = passportMetadata({ brand_name: 'Marca', operating_area });

    expect(`${title} ${description}`.split(operating_area).join('')).not.toMatch(/cobertura|domicilio/i);
  });
});
