import type { Metadata } from 'next';
import { TrustGraphHero } from '@/components/home/TrustGraphHero';
import { ProofBentoGrid } from '@/components/home/ProofBentoGrid';
import { CategoryBar } from '@/components/home/CategoryBar';
import { ConnectedPipeline } from '@/components/home/ConnectedPipeline';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { sharePreview } from '@/lib/share-preview';

// JSON-LD graph identity (issue #8): the platform's own facts, published on the
// production origin. Metadata URLs are relative and resolve against the root
// `metadataBase`, so a local runtime with a loopback site origin emits
// fetchable URLs without changing the structured-data identity.
const baseUrl = 'https://opinio.mx';

const HOME_TITLE = 'Opinio México — Pasaporte de Confianza Comercial';
const HOME_DESCRIPTION =
  'Antes de comprar, conoce a quién le compras. Verifica identidad, cumplimiento y resolución de comercios en México.';

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  ...sharePreview({ title: HOME_TITLE, description: HOME_DESCRIPTION, url: '/' }),
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${baseUrl}#organization`,
      name: 'Opinio México',
      alternateName: 'Opinio.mx',
      url: baseUrl,
      logo: `${baseUrl}/opinio.svg`,
      description:
        'Antes de comprar, conoce a quién le compras. Verifica identidad, cumplimiento y resolución de comercios en México.',
    },
    {
      '@type': 'WebSite',
      '@id': `${baseUrl}#website`,
      name: 'Opinio México',
      url: baseUrl,
      inLanguage: 'es-MX',
      publisher: {
        '@id': `${baseUrl}#organization`,
      },
    },
  ],
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#1b1a1b]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      {/* Reverse-engineered Trustpilot curvedWrapper (rounded-b-[32px] over dark footer) */}
      <main id="contenido" className="overflow-hidden rounded-b-[32px] bg-op-canvas pb-4">
        <TrustGraphHero />
        <CategoryBar />
        <ProofBentoGrid />
        <ConnectedPipeline />
      </main>
      <Footer />
    </div>
  );
}
