import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { TrustGraphHero } from '@/components/home/TrustGraphHero';
import { CategoryBar } from '@/components/home/CategoryBar';
import { ProofBentoGrid } from '@/components/home/ProofBentoGrid';
import { ConnectedPipeline } from '@/components/home/ConnectedPipeline';
import { PassportReviewsList } from '@/components/passport/PassportReviewsList';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ReviewFormWizard } from '@/app/escribir-opinion/[slug]/ReviewFormWizard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

function renderCleanSSR(element: React.ReactElement): string {
  const errors: string[] = [];
  const origError = console.error;
  const origWarn = console.warn;
  console.error = (...args: unknown[]) => {
    errors.push(args.map((a) => String(a)).join(' '));
  };
  console.warn = (...args: unknown[]) => {
    errors.push(args.map((a) => String(a)).join(' '));
  };

  try {
    const htmlA = renderToString(element);
    const htmlB = renderToString(element);
    expect(errors).toEqual([]);
    expect(htmlA).toBe(htmlB);
    return htmlA;
  } finally {
    console.error = origError;
    console.warn = origWarn;
  }
}

describe('SSR & Hydration Determinism', () => {
  it('renders TrustGraphHero, CategoryBar, ProofBentoGrid, ConnectedPipeline, Navbar, and Footer deterministically with visible hero copy', () => {
    const html = renderCleanSSR(
      <div>
        <Navbar />
        <TrustGraphHero />
        <CategoryBar counts={[{ category: 'Hogar', businesses_count: 1200 }, { category: 'Electrónica', businesses_count: 85 }]} />
        <ProofBentoGrid />
        <ConnectedPipeline />
        <Footer />
      </div>
    );

    expect(html).toContain('Antes de comprar, conoce a quién');
    expect(html).toContain('1,200');
    expect(html).not.toContain('animate-tp-fade-up');
  });

  it('renders PassportReviewsList dates and counts deterministically independent of ICU locale data', () => {
    const html = renderCleanSSR(
      <PassportReviewsList
        brandName="Luuna"
        reviews={[
          {
            id: 101,
            rating: 5,
            title: 'Muy buena atención',
            body: 'Me resolvieron la duda del envío el mismo día.',
            author_name: 'Carlos M.',
            verification_level: 'confirmed_store_order',
            score_weight: 1,
            product_name: 'Almohada ajustable',
            created_at: '2026-03-15T18:30:00.000Z',
            responder_name: 'Equipo Luuna',
            response_text: '¡Gracias Carlos!',
            response_created_at: '2026-03-16T12:00:00.000Z',
          },
          {
            id: 102,
            rating: 3,
            title: null,
            body: 'Tardó dos días más de lo esperado.',
            author_name: 'Ana P.',
            verification_level: 'unverified_experience',
            score_weight: 0.35,
            product_name: null,
            created_at: '2026-01-01T02:00:00.000Z',
            responder_name: null,
            response_text: null,
            response_created_at: null,
          },
        ]}
      />
    );

    // 2026-03-15T18:30:00Z in UTC-6 is 15 mar 2026
    expect(html).toContain('15 mar 2026');
    // 2026-01-01T02:00:00Z in UTC-6 is 31 dic 2025
    expect(html).toContain('31 dic 2025');
  });

  it('renders ReviewFormWizard deterministically with SSR-safe Phosphor icons', () => {
    const html = renderCleanSSR(
      <ReviewFormWizard
        businessId={1}
        slug="luuna"
        brandName="Luuna"
        legalName="Zebrands SAPI de CV"
        category="Hogar"
      />
    );
    expect(html).toContain('Opinar sobre Luuna');
  });

  it('has suppressHydrationWarning on html and body in root layout and no locale-dependent toLocaleDateString/toLocaleString in public components', () => {
    const rootDir = process.cwd();
    const layoutSource = fs.readFileSync(path.join(rootDir, 'src/app/layout.tsx'), 'utf8');
    expect(layoutSource).toMatch(/<html[^>]*suppressHydrationWarning/);
    expect(layoutSource).toMatch(/<body[^>]*suppressHydrationWarning/);

    const filesToCheck = [
      'src/components/home/TrustGraphHero.tsx',
      'src/components/home/CategoryBar.tsx',
      'src/components/home/ProofBentoGrid.tsx',
      'src/components/home/ConnectedPipeline.tsx',
      'src/components/passport/PassportReviewsList.tsx',
      'src/app/b/[slug]/page.tsx',
      'src/app/verificar/page.tsx',
      'src/app/directorio/page.tsx',
    ];

    for (const relPath of filesToCheck) {
      const src = fs.readFileSync(path.join(rootDir, relPath), 'utf8');
      expect(src, `${relPath} should not use locale-dependent formatting`).not.toMatch(
        /toLocaleDateString|toLocaleString/
      );
    }
  });
});
