import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('React', React);
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn() }), notFound: () => { throw new Error('not found'); } }));

import HomePage from '@/app/page';
import ResenasPage from '@/app/resenas-y-reputacion/page';
import BlogPostPage from '@/app/blog/[slug]/page';
import { getAllPosts } from '@/lib/blog/posts';
import { RESENAS_H1 } from '@/lib/resenas-reputacion';
import { Breadcrumbs } from '@/components/Breadcrumbs';

function text(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

function anchors(html: string): { href: string; text: string }[] {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(([, attrs, body]) => ({
    href: attrs.match(/href="([^"]*)"/)?.[1] || '', text: text(body),
  }));
}

describe('SEO-SITEWIDE-002 contextual links', () => {
  it.each([
    { source: '/', sentence: 'Lee opiniones con contexto.', href: '/resenas-y-reputacion' },
    { source: '/', sentence: 'Más que una calificación.', href: '/blog' },
    { source: '/resenas-y-reputacion', sentence: 'Las dudas más comunes sobre reseñas y reputación en México, respondidas con cómo funciona Opinio.', href: '/blog' },
    { source: '/blog/como-pedir-resenas-por-whatsapp-mexico', sentence: 'La cobertura mide invitaciones, no felicidad.', href: 'https://opinio.mx/resenas-y-reputacion' },
  ])('links the unchanged sentence on $source: $sentence', async ({ source, sentence, href }) => {
    const page = source === '/' ? HomePage() : source === '/resenas-y-reputacion' ? ResenasPage()
      : await BlogPostPage({ params: Promise.resolve({ slug: source.split('/').at(-1)! }) });
    const html = renderToStaticMarkup(page);
    expect(anchors(html).filter((a) => a.text === sentence)).toEqual([{ href, text: sentence }]);
    expect(text(html)).toContain(sentence);
  });
});

describe('page-matched breadcrumbs', () => {
  it('escapes a title that could terminate a JSON-LD script while preserving the name', () => {
    const name = '</script><script>alert(1)</script>';
    const html = renderToStaticMarkup(<Breadcrumbs siteUrl="https://opinio.mx" items={[{ name: 'Inicio', href: '/' }, { name, href: '/blog/example' }]} />);
    expect(html).not.toContain('</script><script>alert');
    const json = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)![1];
    expect(JSON.parse(json).itemListElement[1].name).toBe(name);
    expect(json).toContain('\\u003c/script>');
  });

  it.each([
    { path: '/resenas-y-reputacion', names: ['Inicio', RESENAS_H1], paths: ['/', '/resenas-y-reputacion'] },
    ...getAllPosts().map((post) => ({ path: `/blog/${post.slug}`, names: ['Inicio', 'Blog', post.title], paths: ['/', '/blog', `/blog/${post.slug}`] })),
  ])('renders one canonical trail matching visible labels on $path', async ({ path, names, paths }) => {
    const page = path === '/resenas-y-reputacion' ? ResenasPage()
      : await BlogPostPage({ params: Promise.resolve({ slug: path.split('/').at(-1)! }) });
    const html = renderToStaticMarkup(page);
    const schemas = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
      .map(([, json]) => JSON.parse(json)).flatMap((node) => node['@graph'] || [node]);
    const breadcrumbs = schemas.filter((node) => node['@type'] === 'BreadcrumbList');
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0].itemListElement).toEqual(names.map((name, index) => ({
      '@type': 'ListItem', position: index + 1, name, item: 'https://opinio.mx' + paths[index],
    })));
    const nav = html.match(/<nav\b[^>]*aria-label="Ruta de navegación"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    expect(nav).toBeDefined();
    const current = nav!.match(/<span\b[^>]*aria-current="page"[^>]*>([\s\S]*?)<\/span>/)?.[1];
    expect([...anchors(nav!).map((a) => a.text), text(current || '')]).toEqual(names);
    expect(anchors(nav!).map((a) => a.href)).toEqual(paths.slice(0, -1));
  });
});
