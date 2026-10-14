import type { Metadata } from 'next';
import { TrustGraphHero } from '@/components/home/TrustGraphHero';
import { ProofBentoGrid } from '@/components/home/ProofBentoGrid';
import { CategoryBar } from '@/components/home/CategoryBar';
import { ConnectedPipeline } from '@/components/home/ConnectedPipeline';
import { Brand } from '@/components/Brand';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { sharePreview } from '@/lib/share-preview';

// JSON-LD graph identity (issue #8): the platform's own facts, published on the
// production origin. Metadata URLs are relative and resolve against the root
// `metadataBase`, so a local runtime with a loopback site origin emits
// fetchable URLs without changing the structured-data identity.
const baseUrl = 'https://opinio.mx';

const HOME_TITLE = 'Opinio México — Pasaporte de Confianza Comercial';
const HOME_DESCRIPTION = 'Antes de comprar, conoce a quién le compras. Verifica identidad, cumplimiento y resolución de comercios en México.';

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  ...sharePreview({ title: HOME_TITLE, description: HOME_DESCRIPTION, url: '/' }),
};

// Opinio's own identity only: name, URL and logo agree with the visible brand
// (navbar/footer "opinio.mx", document title, /opinio.svg). No address, phone,
// hours or merchant data — the platform has no published physical location.
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
      description: 'Antes de comprar, conoce a quién le compras. Verifica identidad, cumplimiento y resolución de comercios en México.',
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main>
        <TrustGraphHero />
        <CategoryBar />
        <ProofBentoGrid />
        <ConnectedPipeline />
      </main>
      <Footer />
    </>
  );
}
