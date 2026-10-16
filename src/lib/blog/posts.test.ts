/**
 * Blog post loader: frontmatter contract, slug/date resolution and the
 * ordering the index shows.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, afterAll } from 'vitest';
import { getAllPosts, getPostBySlug, parsePostFile } from './posts';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog');

describe('the published article', () => {
  it('resolves title, slug, description and date from the draft frontmatter', () => {
    const post = getPostBySlug('como-pedir-resenas-por-whatsapp-mexico');
    expect(post).not.toBeNull();
    expect(post!.title).toBe('¿Cómo pido reseñas por WhatsApp a mis clientes en México?');
    expect(post!.description).toMatch(/^Pide reseñas por WhatsApp a tus clientes en México/);
    expect(post!.date).toBe('2026-10-15');
  });

  it('strips frontmatter, the repeated h1 and the FAQ section from the body', () => {
    const post = getPostBySlug('como-pedir-resenas-por-whatsapp-mexico')!;
    expect(post.markdown.startsWith('En [Opinio]')).toBe(true);
    expect(post.markdown).not.toContain('meta_description');
    expect(post.markdown).not.toMatch(/^# /);
    expect(post.markdown).not.toContain('Preguntas frecuentes');
  });

  it('carries the six FAQ pairs', () => {
    const post = getPostBySlug('como-pedir-resenas-por-whatsapp-mexico')!;
    expect(post.faqs).toHaveLength(6);
  });

  it('lists the post in the index', () => {
    const posts = getAllPosts();
    expect(posts.map((p) => p.slug)).toContain('como-pedir-resenas-por-whatsapp-mexico');
    expect(posts[0].date).toBe('2026-10-15');
  });

  it('returns null for an unknown slug', () => {
    expect(getPostBySlug('no-existe')).toBeNull();
  });
});

describe('frontmatter contract', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'opinio-blog-'));
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const write = (name: string, frontmatter: string, body = 'Contenido.') =>
    fs.writeFileSync(path.join(tmp, name), `---\n${frontmatter}\n---\n\n${body}\n`);

  it('defaults the slug to the file name and the date to `checked`', () => {
    write('mi-articulo.md', 'title: "Título"\nmeta_description: "Descripción"\nchecked: "2026-01-02"');
    const post = getPostBySlug('mi-articulo', tmp);
    expect(post).not.toBeNull();
    expect(post!.slug).toBe('mi-articulo');
    expect(post!.date).toBe('2026-01-02');
  });

  it('accepts an explicit slug and date', () => {
    write('otro.md', 'title: "Título"\nmeta_description: "Descripción"\ndate: "2026-03-04"\nslug: "slug-explicito"');
    expect(getPostBySlug('slug-explicito', tmp)!.date).toBe('2026-03-04');
  });

  it('sorts newest first', () => {
    write('viejo.md', 'title: "Viejo"\nmeta_description: "D"\ndate: "2025-01-01"');
    write('nuevo.md', 'title: "Nuevo"\nmeta_description: "D"\ndate: "2026-06-01"');
    const slugs = getAllPosts(tmp).map((p) => p.slug);
    expect(slugs.indexOf('nuevo')).toBeLessThan(slugs.indexOf('viejo'));
  });

  it('ignores README.md', () => {
    write('README.md', 'title: "Doc"\nmeta_description: "D"\ndate: "2026-01-01"');
    expect(getAllPosts(tmp).map((p) => p.slug)).not.toContain('README');
  });

  it('fails with the file name when the title is missing', () => {
    expect(() =>
      parsePostFile('roto.md', '---\nmeta_description: "D"\ndate: "2026-01-01"\n---\n\nTexto.'),
    ).toThrow(/content\/blog\/roto\.md: frontmatter is missing a title/);
  });

  it('fails when the date is missing or malformed', () => {
    expect(() =>
      parsePostFile('sin-fecha.md', '---\ntitle: "T"\nmeta_description: "D"\n---\n\nTexto.'),
    ).toThrow(/missing a date/);
    expect(() =>
      parsePostFile('mala-fecha.md', '---\ntitle: "T"\nmeta_description: "D"\ndate: "ayer"\n---\n\nTexto.'),
    ).toThrow(/must be YYYY-MM-DD/);
  });

  it('fails when the slug is not a valid path segment', () => {
    expect(() =>
      parsePostFile('slug-raro.md', '---\ntitle: "T"\nmeta_description: "D"\ndate: "2026-01-01"\nslug: "Con Mayúsculas"\n---\n\nTexto.'),
    ).toThrow(/must be lowercase words separated by dashes/);
  });

  it('reads the real content folder', () => {
    expect(fs.existsSync(CONTENT_DIR)).toBe(true);
  });
});
