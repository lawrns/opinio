import { ImageResponse } from 'next/og';
import { SHARED_PREVIEW_IMAGE } from '@/lib/share-preview';

// The shared link-preview card for the public families that do not have a card
// of their own (the passport keeps its per-merchant card). It is served as an
// explicit route instead of a file-based `opengraph-image` convention on
// purpose: Next 16 resolves file-based metadata images with its own fallback
// origin and gives them priority over inherited config images, so an explicit
// route keeps every family on the same, deployment-origin URL. It states the
// platform's own identity only — no merchant data, no scores and no
// verification claims.
export function GET() {
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

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '20px',
              color: '#34d399',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: '16px',
            }}
          >
            Pasaporte de Confianza Comercial
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '64px',
              fontWeight: 900,
              letterSpacing: '-2px',
              lineHeight: 1.1,
            }}
          >
            Antes de comprar, conoce a quién le compras.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #27272a',
            paddingTop: '24px',
            fontSize: '18px',
            color: '#a1a1aa',
          }}
        >
          <div style={{ display: 'flex' }}>Identidad, cumplimiento y opiniones de comercios en México</div>
          <div style={{ display: 'flex', color: '#34d399', fontWeight: 700 }}>opinio.mx</div>
        </div>
      </div>
    ),
    { width: SHARED_PREVIEW_IMAGE.width, height: SHARED_PREVIEW_IMAGE.height }
  );
}
