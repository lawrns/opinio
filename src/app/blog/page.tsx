import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { getAllPosts } from '@/lib/blog/posts';
import { formatBlogDate } from '@/lib/blog/format';
import './blog.css';

// Same guarded site-URL pattern as layout.tsx, directorio, sitemap and /b/
// profiles: a stale fertilitylistings value in the env must never leak into
// the canonical or og:url.
const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const SITE_URL = (envSiteUrl && !envSiteUrl.includes('fertilitylistings') ? envSiteUrl : 'https://opinio.mx').replace(/\/+$/, '');
const CANONICAL = `${SITE_URL}/blog`;

const DESCRIPTION =
  'Guías de Opinio para negocios en México: cómo pedir opiniones a clientes reales, qué mide la cobertura y cómo funciona el perfil público con evidencia.';

export const metadata: Metadata = {
  title: 'Blog de Opinio.mx — guías para negocios en México',
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Blog de Opinio.mx',
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: 'Opinio.mx',
    locale: 'es_MX',
    type: 'website',
  },
};

const CARD_ACCENTS = [
  'border-t-[#00b67a]',
  'border-t-[#1b1a1b]',
  'border-t-[#fd791a]',
  'border-t-[#2563eb]',
];

/**
 * /blog index: the published posts (newest first) from content/blog, rendered
 * with the site's Trustpilot-inspired editorial design.
 */
export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="flex min-h-screen flex-col bg-[#1b1a1b] text-op-ink">
      <Navbar />
      <main id="contenido" tabIndex={-1} className="flex-1 overflow-hidden rounded-b-[32px] bg-op-canvas pb-16">
        <section className="relative overflow-hidden border-b border-op-border bg-[#fcfbf3]">
          {/* Trustpilot-inspired animated geometric background shapes */}
          <svg
            aria-hidden="true"
            viewBox="0 0 600 260"
            className="pointer-events-none absolute right-0 top-0 hidden h-full w-[520px] opacity-85 lg:block"
          >
            <g className="animate-op-float">
              <circle cx="460" cy="40" r="110" fill="#fd791a" />
              <rect x="290" y="110" width="150" height="150" rx="28" fill="#ffe400" transform="rotate(-12 365 185)" />
              <path
                d="M510 110 L590 245 L430 245 Z"
                fill="#04da8d"
                stroke="#04da8d"
                strokeWidth="14"
                strokeLinejoin="round"
              />
            </g>
          </svg>

          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 sm:pt-14 lg:px-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-op-ink/15 bg-white px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-widest text-op-ink shadow-2xs">
              <BookOpen className="size-3.5 text-[#00b67a]" aria-hidden="true" />
              Blog editorial · México
            </div>
            <h1 className="max-w-4xl text-3xl font-extrabold tracking-[-0.03em] text-[#1b1a1b] sm:text-4xl lg:text-5xl">
              Guías de confianza para negocios en México.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-op-secondary">
              Cómo funciona Opinio y prácticas útiles para comercios que venden en México: identidad verificable, cobertura sobre pedidos y atención a reclamos.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {posts.length === 0 ? (
            <p className="text-sm text-op-secondary">Todavía no hay artículos publicados.</p>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2">
              {posts.map((post, index) => (
                <li key={post.slug} className="flex">
                  <Link
                    href={`/blog/${post.slug}`}
                    className={`group flex w-full flex-col justify-between rounded-[22px] border border-op-border border-t-4 ${
                      CARD_ACCENTS[index % CARD_ACCENTS.length]
                    } bg-white p-6 shadow-flat transition-all duration-200 hover:-translate-y-1 hover:border-[#00b67a] hover:shadow-elevated sm:p-7`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-[#fcfbf3] px-3 py-1 font-data text-xs font-semibold uppercase tracking-[0.08em] text-op-muted border border-op-border">
                          {formatBlogDate(post.date)}
                        </span>
                        <span className="flex size-8 items-center justify-center rounded-full bg-op-shaded text-op-ink transition-colors group-hover:bg-[#00b67a] group-hover:text-[#1b1a1b]">
                          <ArrowUpRight className="size-4" aria-hidden="true" />
                        </span>
                      </div>
                      <h2 className="mt-4 text-xl font-extrabold tracking-[-0.02em] text-op-ink group-hover:text-op-green-dark">
                        {post.title}
                      </h2>
                      <p className="mt-2.5 text-sm leading-relaxed text-op-secondary">
                        {post.description}
                      </p>
                    </div>
                    <p className="mt-6 inline-flex items-center gap-1.5 border-t border-op-border pt-4 text-xs font-bold uppercase tracking-wider text-op-green-dark">
                      Leer artículo completo →
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
