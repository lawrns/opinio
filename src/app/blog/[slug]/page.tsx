import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { getPostBySlug, getPostSlugs } from '@/lib/blog/posts';
import { renderMarkdown } from '@/lib/blog/markdown';
import { buildArticleJsonLd, buildBlogFaqPageJsonLd } from '@/lib/blog/json-ld';
import { formatBlogDate } from '@/lib/blog/format';
import '../blog.css';

// Same guarded site-URL pattern as layout.tsx, directorio, sitemap and /b/
// profiles: a stale fertilitylistings value in the env must never leak into
// the canonical or og:url.
const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const SITE_URL = (envSiteUrl && !envSiteUrl.includes('fertilitylistings') ? envSiteUrl : 'https://opinio.mx').replace(/\/+$/, '');

type PageProps = {
  params: Promise<{ slug: string }>;
};

/** Only posts that exist at build time; unknown slugs 404 without rendering. */
export const dynamicParams = false;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return { title: 'Página no encontrada | Opinio.mx' };
  }
  const canonical = `${SITE_URL}/blog/${post.slug}`;
  return {
    title: `${post.title} | Opinio.mx`,
    description: post.description,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description: post.description,
      url: canonical,
      siteName: 'Opinio.mx',
      locale: 'es_MX',
      type: 'article',
      publishedTime: post.date,
    },
  };
}

/**
 * Blog article: markdown from content/blog rendered with the site design, the
 * FAQ section as the site's accordion, and Article + FAQPage JSON-LD built
 * from the same data the page renders.
 */
export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    notFound();
  }

  const url = `${SITE_URL}/blog/${post.slug}`;
  const articleJsonLd = buildArticleJsonLd({
    headline: post.title,
    description: post.description,
    url,
    datePublished: post.date,
    siteUrl: SITE_URL,
  });
  const faqJsonLd = post.faqs.length > 0 ? buildBlogFaqPageJsonLd(post.faqs) : null;
  const html = renderMarkdown(post.markdown);
  const afterFaqHtml = renderMarkdown(post.afterFaqMarkdown);

  return (
    <div className="flex min-h-screen flex-col bg-op-canvas text-op-ink">
      <Navbar />
      <main id="contenido" tabIndex={-1} className="flex-1">
        <section className="border-b border-op-border bg-op-shaded">
          <div className="mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 lg:px-8">
            <Breadcrumbs siteUrl={SITE_URL} items={[
              { name: 'Inicio', href: '/' },
              { name: 'Blog', href: '/blog' },
              { name: post.title, href: `/blog/${post.slug}` },
            ]} />
            <h1 className="max-w-4xl text-3xl font-black tracking-[-0.03em] sm:text-4xl lg:text-5xl">
              {post.title}
            </h1>
            <p className="font-data mt-5 text-xs font-medium uppercase tracking-[0.08em] text-op-muted">
              {formatBlogDate(post.date)} · Opinio.mx
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Repo-authored markdown; rendered at build time from content/blog. */}
          <div className="op-article" dangerouslySetInnerHTML={{ __html: html }} />

          {post.faqs.length > 0 && (
            <div className="op-article mt-12">
              <h2>Preguntas frecuentes</h2>
              <div className="mt-2">
                {post.faqs.map((item) => (
                  <details key={item.q} className="group border-b border-op-border">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-op-green [&::-webkit-details-marker]:hidden">
                      <span>{item.q}</span>
                      <ChevronDown
                        aria-hidden="true"
                        className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                      />
                    </summary>
                    <p
                      className="pb-5 pr-8 text-sm leading-relaxed text-op-secondary"
                      dangerouslySetInnerHTML={{ __html: item.aHtml }}
                    />
                  </details>
                ))}
              </div>
            </div>
          )}
          {afterFaqHtml && (
            <div className="op-article mt-12" dangerouslySetInnerHTML={{ __html: afterFaqHtml }} />
          )}
        </section>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c'),
          }}
        />
      )}
    </div>
  );
}
