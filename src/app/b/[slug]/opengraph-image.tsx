import { ImageResponse } from 'next/og';
import { query } from '@/lib/db';
import { passportMetadata } from '@/lib/passport-metadata';

export const runtime = 'nodejs';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

interface BusinessDbRow {
  brand_name: string;
  legal_name: string | null;
  category: string | null;
  operating_area: string | null;
}

// Per-merchant preview card for the public passport. It states the record's own
// published identity — the accepted `passportMetadata` description built from
// the stored brand, razón social, catalogue category and recorded scope — and
// nothing else: no trust score, no verification or process chips, no source
// claims and no placeholder values. A slug without a catalogue row answers 404
// instead of rendering an invented merchant.
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const res = await query<BusinessDbRow>(
    `SELECT brand_name, legal_name, category, operating_area FROM businesses WHERE slug = $1 LIMIT 1`,
    [slug]
  );
  const business = res.rows[0];
  if (!business) return new Response(null, { status: 404 });

  const { description } = passportMetadata(business);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#09090b',
          padding: '64px 72px',
          fontFamily: 'sans-serif',
          color: '#f4f4f5',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '26px',
                color: '#09090b',
                marginRight: '14px',
              }}
            >
              O
            </div>
            <div style={{ display: 'flex', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              <span>Opinio</span>
              <span style={{ color: '#10b981' }}>.mx</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 18px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            PASAPORTE DE CONFIANZA COMERCIAL
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '56px',
              fontWeight: 900,
              letterSpacing: '-1.5px',
              lineHeight: 1.1,
              marginBottom: '18px',
            }}
          >
            {business.brand_name}
          </div>
          <div style={{ display: 'flex', fontSize: '24px', lineHeight: 1.4, color: '#a1a1aa', maxWidth: '1000px' }}>
            {description}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #27272a',
            paddingTop: '22px',
            fontSize: '18px',
            color: '#71717a',
          }}
        >
          <div style={{ display: 'flex' }}>Registro del catálogo público</div>
          <div style={{ display: 'flex', color: '#34d399', fontWeight: 700 }}>opinio.mx/b/{slug}</div>
        </div>
      </div>
    ),
    size
  );
}
