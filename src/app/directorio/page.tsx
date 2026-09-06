import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Building2, Store } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BrandLogo } from '@/components/BrandLogo';
import { query } from '@/lib/db';

interface BusinessRow {
  id: number;
  slug: string;
  brand_name: string;
  legal_name: string | null;
  category: string;
  trust_score: number | string | null;
  operating_area: string | null;
  logo_url: string | null;
  claimed: boolean;
}

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour ISR

export async function generateMetadata(): Promise<Metadata> {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const baseUrl = envUrl && !envUrl.includes('fertilitylistings') ? envUrl : 'https://opinio.mx';

  return {
    title: 'Directorio de 1,190+ Tiendas en Línea y Comercios en México | Opinio México',
    description: 'Índice de tiendas virtuales, e-commerce y marcas comerciales en México auditadas por Opinio. Consulta RFC, estatus PROFECO, opiniones y pasaporte de confianza.',
    alternates: {
      canonical: `${baseUrl}/directorio`,
    },
    openGraph: {
      title: 'Directorio de Tiendas en Línea en México — Opinio.mx',
      description: 'Índice auditado de 1,190+ comercios y tiendas virtuales con pasaporte de confianza.',
      url: `${baseUrl}/directorio`,
      siteName: 'Opinio.mx',
      locale: 'es_MX',
      type: 'website',
    },
  };
}

export default async function DirectorioPage() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const baseUrl = envUrl && !envUrl.includes('fertilitylistings') ? envUrl : 'https://opinio.mx';

  const res = await query<BusinessRow>(
    `SELECT id, slug, brand_name, legal_name, category, trust_score, operating_area, logo_url, claimed
     FROM businesses
     WHERE slug IS NOT NULL
     ORDER BY category ASC, brand_name ASC`
  );

  const businesses = res.rows;

  // Group by category
  const categoriesMap = new Map<string, BusinessRow[]>();
  for (const b of businesses) {
    const cat = b.category || 'General';
    if (!categoriesMap.has(cat)) {
      categoriesMap.set(cat, []);
    }
    categoriesMap.get(cat)!.push(b);
  }

  const sortedCategories = Array.from(categoriesMap.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${baseUrl}/directorio#collection`,
        url: `${baseUrl}/directorio`,
        name: 'Directorio de Tiendas y Comercios en México | Opinio México',
        description: 'Directorio de más de 1,190 comercios auditados en México con pasaporte de confianza.',
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${baseUrl}#website`,
          name: 'Opinio México',
          url: baseUrl,
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${baseUrl}/directorio#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Inicio',
            item: baseUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Directorio Completo',
            item: `${baseUrl}/directorio`,
          },
        ],
      },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-op-canvas text-op-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main id="contenido" tabIndex={-1} className="flex-1">
        <header className="border-b border-op-border bg-op-sheet py-10 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-op-green-dark">
                <ShieldCheck size={16} aria-hidden="true" />
                Catálogo Nacional de Confianza Comercial
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                Directorio de Comercios y Tiendas en Línea en México
              </h1>
              <p className="mt-4 text-base leading-relaxed text-op-secondary">
                Índice completo de <strong>{businesses.length.toLocaleString('es-MX')}</strong> negocios auditados con pasaporte de confianza, monitoreo PROFECO, validación fiscal SAT y reseñas verificadas.
              </p>
            </div>

            {/* Quick jump to categories */}
            <div className="mt-8 flex flex-wrap gap-2">
              {sortedCategories.map(([category, items]) => (
                <a
                  key={category}
                  href={`#cat-${encodeURIComponent(category.toLowerCase().replace(/\s+/g, '-'))}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-op-border bg-op-canvas px-3.5 text-xs font-medium text-op-secondary hover:border-op-blue hover:text-op-blue-dark transition-colors"
                >
                  <span>{category}</span>
                  <span className="rounded-full bg-op-shaded px-2 py-0.5 text-[11px] font-mono font-bold text-op-ink">
                    {items.length}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-16">
          {sortedCategories.map(([category, items]) => {
            const sectionId = `cat-${encodeURIComponent(category.toLowerCase().replace(/\s+/g, '-'))}`;
            return (
              <section key={category} id={sectionId} className="scroll-mt-24">
                <div className="flex items-center justify-between border-b border-op-border pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <Store className="size-6 text-op-blue" aria-hidden="true" />
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {category}
                    </h2>
                  </div>
                  <span className="text-sm font-mono text-op-secondary">
                    {items.length} {items.length === 1 ? 'comercio' : 'comercios'}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {items.map((b) => {
                    const hasScore = b.trust_score !== null && Number(b.trust_score) > 0;
                    return (
                      <Link
                        key={b.id}
                        href={`/b/${encodeURIComponent(b.slug)}`}
                        className="group flex flex-col justify-between rounded-xl border border-op-border bg-op-sheet p-4 shadow-flat hover:border-op-blue-border hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <BrandLogo
                            name={b.brand_name}
                            src={b.logo_url}
                            category={b.category}
                            sizeClass="size-10"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-op-ink group-hover:text-op-blue transition-colors truncate">
                              {b.brand_name}
                            </h3>
                            <p className="text-xs text-op-muted truncate">
                              {b.operating_area || 'México'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-op-border-hairline pt-3 text-xs">
                          <span className="font-mono text-op-secondary">
                            {hasScore ? (
                              <span className="font-bold text-op-ink">
                                {Number(b.trust_score).toFixed(1)}
                                <span className="text-[10px] font-normal text-op-muted"> / 100</span>
                              </span>
                            ) : (
                              'En auditoría'
                            )}
                          </span>

                          <span className="inline-flex items-center gap-1 font-semibold text-op-blue text-[11px] group-hover:translate-x-0.5 transition-transform">
                            Ver pasaporte <ArrowRight size={12} />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
