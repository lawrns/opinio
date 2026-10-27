import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { passportMetadata, type PassportRecordFacts } from './passport-metadata';

const mockBusiness = vi.hoisted(() => ({
  row: {
    id: 10,
    slug: 'innovasport-mty',
    brand_name: 'Innovasport',
    legal_name: 'Innovasport, S.A. de C.V.',
    category: 'Moda, Calzado y Accesorios',
    description: 'Tienda deportiva',
    rfc: null,
    clee: null,
    phone: null,
    whatsapp: null,
    domain: 'innovasport.com',
    logo_url: null,
    banner_url: null,
    operating_area: 'Monterrey, Nuevo León',
    claimed: false,
    verified_level: 'unverified',
    trust_score: '0',
    confidence_level: 'preliminary',
    coverage_percentage: '0',
    observed_orders_count: 0,
    invited_orders_count: 0,
    issues_per_thousand: '0',
    resolution_rate: '0',
    median_response_hours: '0',
    reopen_rate: '0',
    effective_reviews_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  } as Record<string, unknown>,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/b/innovasport-mty',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  notFound: () => {
    throw new Error('not found');
  },
  redirect: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  query: async (sql: string) => {
    if (/FROM businesses/i.test(sql)) return { rows: [mockBusiness.row] };
    return { rows: [] };
  },
}));

import BusinessPassportPage, { generateMetadata } from '@/app/b/[slug]/page';

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
  const baseFacts = {
    brand_name: 'Marca',
    legal_name: 'Marca, S.A. de C.V.',
    category: 'Comercio Electrónico Especializado',
  };

  it.each(['NO PROPORCIONA', 'DATOS POR SUCURSAL. CONSULTAR', '', '   ', undefined])(
    'treats the uninformative source value %j as the same unknown state as no value at all',
    (operating_area) => {
      expect(passportMetadata({ ...baseFacts, operating_area })).toEqual(
        passportMetadata({ ...baseFacts, operating_area: null }),
      );
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

describe('passport metadata and rendered page alignment (OPN-PASSPORT-IDENTITY-ANCHOR)', () => {
  it('does not promise removed identity/public-record sections in metadata', () => {
    for (const [first, second] of OBSERVED_PAIRS) {
      for (const sample of [first, second]) {
        const { title, description } = passportMetadata(sample);
        expect(`${title} ${description}`).not.toMatch(/registros públicos|fuentes públicas/i);
        expect(description).toContain('Consulta las opiniones publicadas por compradores en Opinio México.');
      }
    }
  });

  it('renders the same identity and scope facts on /b/[slug] that generateMetadata publishes, and omits placeholder scopes from both', async () => {
    mockBusiness.row = {
      ...mockBusiness.row,
      brand_name: 'Innovasport',
      legal_name: 'Innovasport, S.A. de C.V.',
      category: 'Moda, Calzado y Accesorios',
      operating_area: 'Monterrey, Nuevo León',
    };
    const meta1 = await generateMetadata({ params: Promise.resolve({ slug: 'innovasport-mty' }) });
    const html1 = renderToStaticMarkup(await BusinessPassportPage({ params: Promise.resolve({ slug: 'innovasport-mty' }) }));

    expect(String(meta1.title)).toContain('Innovasport, S.A. de C.V.');
    expect(String(meta1.title)).toContain('ámbito registrado: Monterrey, Nuevo León');
    expect(String(meta1.description)).toContain('razón social: Innovasport, S.A. de C.V.');
    expect(String(meta1.description)).toContain('Ámbito registrado: Monterrey, Nuevo León.');
    expect(String(meta1.description)).not.toMatch(/registros públicos|fuentes públicas/i);

    expect(html1).toContain('Innovasport');
    expect(html1).toContain('Moda, Calzado y Accesorios');
    expect(html1).toContain('Razón social: Innovasport, S.A. de C.V.');
    expect(html1).toContain('Ámbito registrado: Monterrey, Nuevo León');

    // Placeholder scope and null legal_name are omitted from both metadata and rendered page
    mockBusiness.row = {
      ...mockBusiness.row,
      legal_name: null,
      operating_area: 'NO PROPORCIONA',
    };
    const meta2 = await generateMetadata({ params: Promise.resolve({ slug: 'innovasport-mty' }) });
    const html2 = renderToStaticMarkup(await BusinessPassportPage({ params: Promise.resolve({ slug: 'innovasport-mty' }) }));

    expect(String(meta2.title)).not.toMatch(/NO PROPORCIONA|ámbito registrado/i);
    expect(String(meta2.description)).not.toMatch(/NO PROPORCIONA|razón social|Ámbito registrado/i);
    expect(html2).not.toMatch(/NO PROPORCIONA|Razón social:|Ámbito registrado:/i);
  });
});

