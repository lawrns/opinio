import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronDown, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { getPostBySlug, getPostSlugs } from '@/lib/blog/posts';
import { renderMarkdown } from '@/lib/blog/markdown';
import { buildArticleJsonLd, buildBlogFaqPageJsonLd } from '@/lib/blog/json-ld';
import { formatBlogDate } from '@/lib/blog/format';

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
    <div className="flex min-h-screen flex-col bg-[#1b1a1b] text-op-ink">
      <Navbar />
      <main id="contenido" tabIndex={-1} className="flex-1 overflow-hidden rounded-b-[32px] bg-op-canvas pb-16">
        <section className="relative overflow-hidden border-b border-op-border bg-[#fcfbf3]">
          <svg
            aria-hidden="true"
            viewBox="0 0 600 260"
            className="pointer-events-none absolute right-0 top-0 hidden h-full w-[520px] opacity-80 lg:block"
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
            <Breadcrumbs
              siteUrl={SITE_URL}
              items={[
                { name: 'Inicio', href: '/' },
                { name: 'Blog', href: '/blog' },
                { name: post.title, href: `/blog/${post.slug}` },
              ]}
            />
            <h1 className="mt-3 max-w-4xl text-3xl font-extrabold tracking-[-0.03em] text-[#1b1a1b] sm:text-4xl lg:text-5xl">
              {post.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-op-border bg-white px-3.5 py-1 font-data text-xs font-semibold uppercase tracking-[0.08em] text-op-ink shadow-2xs">
                <ShieldCheck className="size-3.5 text-[#00b67a]" aria-hidden="true" />
                {formatBlogDate(post.date)} · Opinio.mx
              </span>
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-op-green-dark hover:underline"
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                Todas las guías
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-[24px] border border-op-border bg-white p-6 shadow-elevated sm:p-10 lg:p-12">
            {/* Repo-authored markdown; rendered at build time from content/blog. */}
            <div className="op-article" dangerouslySetInnerHTML={{ __html: html }} />

            {post.faqs.length > 0 && (
              <div className="op-article mt-12 rounded-2xl border border-op-border bg-[#fcfbf3] p-6 sm:p-8">
                <h2>Preguntas frecuentes</h2>
                <div className="mt-2 divide-y divide-op-border">
                  {post.faqs.map((item) => (
                    <details key={item.q} className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-bold text-op-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-op-green [&::-webkit-details-marker]:hidden">
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
          </div>
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
