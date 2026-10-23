import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ShieldCheck, Store } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BrandLogo } from '@/components/BrandLogo';
import {
  getDirectoryBusinesses,
  getDirectoryIndex,
  type DirectoryBusiness,
} from '@/lib/directory-catalogue';
import {
  DIRECTORY_PAGE_SIZE,
  categorySectionId,
  directoryPageHref,
  directoryPageWindow,
  normalizeCategory,
  selectDirectoryPage,
} from '@/lib/directory-pagination';
import { sharePreview } from '@/lib/share-preview';

interface PageProps {
  searchParams: Promise<{ page?: string | string[] }>;
}

/**
 * The directory renders one bounded catalogue page per request: pagination is a
 * public query parameter, so the route is request-rendered by design and the
 * expensive catalogue reads are cached in `@/lib/directory-catalogue` instead
 * of relying on route-level revalidation.
 */
export const dynamic = 'force-dynamic';

function baseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  return envUrl && !envUrl.includes('fertilitylistings') ? envUrl : 'https://opinio.mx';
}

// Approved directory identity (issue #4): states the page's purpose without a
// hardcoded catalogue count or a verification claim, and stays page-scoped for
// real catalogue pages. Head metadata and the in-body CollectionPage node share
// the same strings.
const DIRECTORY_IDENTITY = 'Directorio de tiendas en línea y comercios de México';
const DIRECTORY_TITLE = `${DIRECTORY_IDENTITY} | Opinio México`;
const DIRECTORY_DESCRIPTION = 'Consulta el directorio de tiendas en línea y comercios de México y accede a sus pasaportes con información registrada, fuentes y opiniones disponibles.';
const directoryPageIdentity = (page: number) => `${DIRECTORY_IDENTITY} — página ${page} | Opinio México`;

function directoryCanonicalUrl(rawPage: string | string[] | undefined): string {
  const selection = selectDirectoryPage(rawPage);
  return selection && selection.page > 1
    ? `${baseUrl()}/directorio?page=${selection.page}`
    : `${baseUrl()}/directorio`;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { page } = await searchParams;
  const canonical = directoryCanonicalUrl(page);
  const selection = selectDirectoryPage(page);
  const title = selection && selection.page > 1 ? directoryPageIdentity(selection.page) : DIRECTORY_TITLE;

  return {
    title,
    description: DIRECTORY_DESCRIPTION,
    alternates: {
      canonical,
    },
    ...sharePreview({ title, description: DIRECTORY_DESCRIPTION, url: canonical }),
  };
}

export default async function DirectorioPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selection = selectDirectoryPage(params.page);
  if (!selection) notFound();

  const index = await getDirectoryIndex();
  if (selection.page > index.totalPages) notFound();

  const page = selection.page;
  const businesses = await getDirectoryBusinesses(page);
  const pageUrl = directoryCanonicalUrl(params.page);

  // Group the bounded page slice by category, keeping the catalogue's category
  // popularity order and per-category brand ordering.
  const itemsByCategory = new Map<string, DirectoryBusiness[]>();
  for (const business of businesses) {
    const category = normalizeCategory(business.category);
    const items = itemsByCategory.get(category);
    if (items) {
      items.push(business);
    } else {
      itemsByCategory.set(category, [business]);
    }
  }

  const sections = index.categories
    .map((category) => ({ category, items: itemsByCategory.get(category.name) ?? [] }))
    .filter((section) => section.items.length > 0);

  const firstResult = businesses.length > 0 ? (page - 1) * DIRECTORY_PAGE_SIZE + 1 : 0;
  const lastResult = firstResult + businesses.length - 1;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#collection`,
        url: pageUrl,
        name: page > 1 ? directoryPageIdentity(page) : DIRECTORY_TITLE,
        description: DIRECTORY_DESCRIPTION,
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${baseUrl()}#website`,
          name: 'Opinio México',
          url: baseUrl(),
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Inicio',
            item: baseUrl(),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Directorio Completo',
            item: pageUrl,
          },
        ],
      },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#1b1a1b] text-op-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main id="contenido" tabIndex={-1} className="flex-1 overflow-hidden rounded-b-[32px] bg-op-canvas">
        <header className="relative overflow-hidden border-b border-op-border bg-[#fcfbf3] py-10 sm:py-14">
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-op-ink/15 bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-op-ink shadow-2xs">
                <ShieldCheck size={15} className="text-[#008b5d]" aria-hidden="true" />
                Catálogo Nacional de Confianza Comercial
              </div>
              <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-op-ink sm:text-5xl">
                Directorio de Comercios y Tiendas en Línea en México
              </h1>
              <p className="mt-4 text-base leading-relaxed text-op-secondary">
                Índice de <strong>{index.totalBusinesses.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</strong> comercios con pasaportes públicos. Revisa los datos registrados, las fuentes oficiales y las opiniones de compradores en cada perfil.
              </p>
              <p className="mt-3 font-mono text-xs font-medium text-op-muted">
                {businesses.length > 0
                  ? `Mostrando los comercios ${firstResult.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} a ${lastResult.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} de ${index.totalBusinesses.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} · Página ${page} de ${index.totalPages}`
                  : `Página ${page} de ${index.totalPages}`}
              </p>
            </div>

            {/* Full category index: every catalogue category stays reachable from every page */}
            <nav aria-label="Categorías del directorio" className="mt-8 flex flex-wrap gap-2">
              {index.categories.map((category) => {
                const sectionId = categorySectionId(category.name);
                return (
                  <a
                    key={category.name}
                    href={
                      category.firstPage === page
                        ? `#${sectionId}`
                        : `${directoryPageHref(category.firstPage)}#${sectionId}`
                    }
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-op-border bg-white px-3.5 text-xs font-semibold text-op-secondary shadow-2xs transition-all hover:border-[#00b67a] hover:bg-op-green-soft hover:text-op-green-dark"
                  >
                    <span>{category.name}</span>
                    <span className="rounded-full bg-op-shaded px-2 py-0.5 font-mono text-[11px] font-bold text-op-ink">
                      {category.count}
                    </span>
                  </a>
                );
              })}
            </nav>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:px-8">
          {sections.map(({ category, items }) => {
            const sectionId = categorySectionId(category.name);
            const isPartial = items.length < category.count;
            return (
              <section key={category.name} id={sectionId} className="scroll-mt-24">
                <div className="mb-6 flex items-center justify-between border-b border-op-border pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-op-green-soft text-op-green-dark">
                      <Store className="size-5" aria-hidden="true" />
                    </span>
                    <h2 className="text-2xl font-bold tracking-tight text-op-ink">
                      {category.name}
                    </h2>
                  </div>
                  <span className="rounded-full border border-op-border bg-white px-3 py-1 font-mono text-xs font-semibold text-op-secondary">
                    {isPartial
                      ? `${items.length} de ${category.count} comercios`
                      : `${category.count} ${category.count === 1 ? 'comercio' : 'comercios'}`}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {items.map((b) => {
                    return (
                      <Link
                        key={b.id}
                        href={`/b/${encodeURIComponent(b.slug)}`}
                        data-cta="directory_open_passport"
                        className="group flex flex-col justify-between rounded-2xl border border-op-border bg-white p-4.5 shadow-flat transition-all duration-200 hover:-translate-y-0.5 hover:border-[#00b67a] hover:shadow-elevated"
                      >
                        <div className="flex items-start gap-3">
                          <BrandLogo
                            name={b.brand_name}
                            src={b.logo_url}
                            category={b.category}
                            sizeClass="size-10"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-bold text-op-ink transition-colors group-hover:text-op-green-dark">
                              {b.brand_name}
                            </h3>
                            <p className="truncate text-xs text-op-muted">
                              {b.operating_area || 'México'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-end border-t border-op-border-hairline pt-3 text-xs">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-op-green-dark transition-transform group-hover:translate-x-0.5">
                            Ver opiniones <ArrowRight size={12} />
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

        {index.totalPages > 1 && (
          <nav
            aria-label="Paginación del directorio"
            className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-op-border pt-6">
              {page > 1 ? (
                <Link
                  href={directoryPageHref(page - 1)}
                  rel="prev"
                  className="inline-flex min-h-10 items-center rounded-lg border border-op-border bg-op-sheet px-4 text-sm font-medium text-op-secondary hover:border-op-blue hover:text-op-blue-dark transition-colors"
                >
                  Anterior
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex min-h-10 items-center rounded-lg border border-op-border-hairline px-4 text-sm font-medium text-op-muted"
                >
                  Anterior
                </span>
              )}

              <ol className="flex flex-wrap items-center gap-1.5">
                {directoryPageWindow(page, index.totalPages).map((value, position) =>
                  value === null ? (
                    <li key={`gap-${position}`} aria-hidden="true" className="px-1 text-sm text-op-muted">
                      …
                    </li>
                  ) : value === page ? (
                    <li key={value}>
                      <span
                        aria-current="page"
                        className="inline-flex size-10 items-center justify-center rounded-lg border border-op-blue bg-op-blue-soft text-sm font-bold text-op-blue-dark"
                      >
                        {value}
                      </span>
                    </li>
                  ) : (
                    <li key={value}>
                      <Link
                        href={directoryPageHref(value)}
                        aria-label={`Página ${value} del directorio`}
                        className="inline-flex size-10 items-center justify-center rounded-lg border border-op-border bg-op-sheet text-sm font-medium text-op-secondary hover:border-op-blue hover:text-op-blue-dark transition-colors"
                      >
                        {value}
                      </Link>
                    </li>
                  )
                )}
              </ol>

              {page < index.totalPages ? (
                <Link
                  href={directoryPageHref(page + 1)}
                  rel="next"
                  className="inline-flex min-h-10 items-center rounded-lg border border-op-border bg-op-sheet px-4 text-sm font-medium text-op-secondary hover:border-op-blue hover:text-op-blue-dark transition-colors"
                >
                  Siguiente
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex min-h-10 items-center rounded-lg border border-op-border-hairline px-4 text-sm font-medium text-op-muted"
                >
                  Siguiente
                </span>
              )}
            </div>
          </nav>
        )}
      </main>

      <Footer />
    </div>
  );
}
