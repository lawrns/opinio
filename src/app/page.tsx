import type { Metadata } from 'next';
import { TrustGraphHero } from '@/components/home/TrustGraphHero';
import { ProofBentoGrid } from '@/components/home/ProofBentoGrid';
import { CategoryBar } from '@/components/home/CategoryBar';
import { ConnectedPipeline } from '@/components/home/ConnectedPipeline';
import { Brand } from '@/components/Brand';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';

const baseUrl = 'https://opinio.mx';

export const metadata: Metadata = {
  title: 'Opinio México — Pasaporte de Confianza Comercial',
  description: 'Antes de comprar, conoce a quién le compras. Verifica identidad, cumplimiento y resolución de comercios en México.',
  alternates: {
    canonical: baseUrl,
  },
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
