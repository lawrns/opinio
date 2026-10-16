import type { Metadata } from 'next';
import Link from 'next/link';
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

/**
 * /blog index: the published posts (newest first) from content/blog, rendered
 * with the site's paper/passport design.
 */
export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="flex min-h-screen flex-col bg-op-canvas text-op-ink">
      <Navbar />
      <main id="contenido" tabIndex={-1} className="flex-1">
        <section className="border-b border-op-border bg-op-shaded">
          <div className="mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 lg:px-8">
            <p className="op-eyebrow mb-3">Blog</p>
            <h1 className="max-w-4xl text-3xl font-black tracking-[-0.03em] sm:text-4xl lg:text-5xl">
              Guías de confianza para negocios en México.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-op-secondary">
              Cómo funciona Opinio y buenas prácticas para comercios que venden en México — con lo
              que el sitio ya afirma: identidad, evidencia y casos con seguimiento.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {posts.length === 0 ? (
            <p className="text-sm text-op-secondary">Todavía no hay artículos publicados.</p>
          ) : (
            <ul className="grid gap-4">
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group block rounded-2xl border border-op-border bg-op-sheet p-6 transition-shadow hover:shadow-[var(--op-shadow-elevated)]"
                  >
                    <p className="font-data text-xs font-medium uppercase tracking-[0.08em] text-op-muted">
                      {formatBlogDate(post.date)}
                    </p>
                    <h2 className="mt-2 text-xl font-bold tracking-[-0.02em] group-hover:underline">
                      {post.title}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-op-secondary">
                      {post.description}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-op-green-dark">Leer artículo →</p>
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
