import { ImageResponse } from 'next/og';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

interface BusinessDbRow {
  brand_name: string;
  legal_name: string | null;
  category: string;
  rfc: string | null;
  trust_score: number | string;
  verified_level: string;
  logo_url: string | null;
  effective_reviews_count: number;
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let business: BusinessDbRow | null = null;
  try {
    const res = await query<BusinessDbRow>(
      `SELECT brand_name, legal_name, category, rfc, trust_score, verified_level, logo_url, effective_reviews_count FROM businesses WHERE slug = $1 LIMIT 1`,
      [slug]
    );
    if (res.rows.length > 0) {
      business = res.rows[0];
    }
  } catch (err) {
    console.error('Error fetching business for OG image:', err);
  }

  const brandName = business?.brand_name || 'Comercio en México';
  const category = business?.category || 'Comercio Verificado';
  const rfc = business?.rfc || 'Registro en Cotejo';
  const score = business ? Math.round(Number(business.trust_score) || 0) : 0;
  const verifiedLevel = business?.verified_level === 'comercio_certificado'
    ? 'Comercio Certificado'
    : business?.verified_level === 'identidad_confirmada'
    ? 'Identidad Confirmada'
    : 'Información Pública';

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
          padding: '60px 70px',
          fontFamily: 'sans-serif',
          color: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Background Subtle Radial Accent */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(9, 9, 11, 0) 70%)',
          }}
        />

        {/* Top Bar: Brand & Standard */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '22px',
                color: '#09090b',
              }}
            >
              O
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px' }}>
              Opinio<span style={{ color: '#10b981' }}>.mx</span>
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
              fontWeight: '700',
              letterSpacing: '0.5px',
            }}
          >
            PASAPORTE DE CONFIANZA COMERCIAL
          </div>
        </div>

        {/* Middle Hero: Business Identity & Score */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '720px' }}>
            <div style={{ fontSize: '15px', color: '#10b981', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>
              {category}
            </div>
            <div
              style={{
                fontSize: '56px',
                fontWeight: '900',
                letterSpacing: '-1.5px',
                lineHeight: 1.1,
                marginBottom: '16px',
                color: '#f4f4f5',
              }}
            >
              {brandName}
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  color: '#a1a1aa',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                }}
              >
                RFC: {rfc}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  color: '#34d399',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                {verifiedLevel}
              </div>
            </div>
          </div>

          {/* Trust Gauge Badge */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '200px',
              height: '200px',
              borderRadius: '24px',
              backgroundColor: '#18181b',
              border: '2px solid rgba(16, 185, 129, 0.4)',
              boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: '64px', fontWeight: '900', color: score > 0 ? '#10b981' : '#71717a', lineHeight: 1 }}>
              {score > 0 ? score : '—'}
            </div>
            <div style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '6px' }}>
              Trust Score
            </div>
            <div style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>
              Escala 0–100 Opinio
            </div>
          </div>
        </div>

        {/* Bottom Bar: Verification Guarantees */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '24px',
            borderTop: '1px solid #27272a',
            fontSize: '14px',
            color: '#71717a',
          }}
        >
          <div style={{ display: 'flex', gap: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981' }}>✓</span> Cédula SAT Verificada
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981' }}>✓</span> Monitoreo PROFECO
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981' }}>✓</span> Opiniones con Ticket
            </div>
          </div>
          <div style={{ color: '#a1a1aa', fontWeight: '600' }}>
            opinio.mx/b/{slug}
          </div>
        </div>
      </div>
    )
  );
}
