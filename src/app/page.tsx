import type { Metadata } from 'next';
import { TrustGraphHero } from '@/components/home/TrustGraphHero';
import { ProofBentoGrid } from '@/components/home/ProofBentoGrid';
import { CategoryBar } from '@/components/home/CategoryBar';
import { ConnectedPipeline } from '@/components/home/ConnectedPipeline';
import { Brand } from '@/components/Brand';
import { Footer } from '@/components/Footer';
import Navbar from '@/components/Navbar';

const baseUrl = 'https://opinio.mx';

export const metadata: Metadata = {
  title: 'Opinio México — Pasaporte de Confianza Comercial',
  description: 'Antes de comprar, conoce a quién le compras. Verifica identidad, cumplimiento y resolución de comercios en México.',
  alternates: {
    canonical: baseUrl,
  },
};

export default function HomePage() {
  return (
    <>
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
