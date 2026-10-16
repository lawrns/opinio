/**
 * Blog post loader: markdown files in content/blog, parsed at build time.
 * Dropping a new file with this frontmatter produces a new page with no code
 * changes:
 *
 *   ---
 *   title: "…"                 # required — page h1, index, Article JSON-LD
 *   meta_description: "…"      # required — meta description and index copy
 *   date: "YYYY-MM-DD"         # required (falls back to `checked`)
 *   slug: "…"                  # optional — defaults to the file name
 *   ---
 *
 * Invalid frontmatter throws at build time with the file name, so a broken
 * post fails the build instead of shipping half a page.
 */
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { splitFaqSection, stripLeadingTitle, type BlogFaq } from './markdown'

export interface BlogPostSummary {
  slug: string
  title: string
  description: string
  /** ISO date (YYYY-MM-DD). */
  date: string
}

export interface BlogPost extends BlogPostSummary {
  /** Body markdown: frontmatter, the repeated leading h1 and the FAQ section removed. */
  markdown: string
  /** Pairs from the "Preguntas frecuentes" section (plain text + inline HTML). */
  faqs: BlogFaq[]
}

export const BLOG_CONTENT_DIR = path.join(process.cwd(), 'content', 'blog')

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function fail(file: string, message: string): never {
  throw new Error(`content/blog/${file}: ${message}`)
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** Parse one markdown file into a post. Throws with the file name when invalid. */
export function parsePostFile(fileName: string, raw: string): BlogPost {
  const { data, content } = matter(raw)

  const title = asString(data.title)
  if (!title) fail(fileName, 'frontmatter is missing a title')

  const description = asString(data.meta_description) ?? asString(data.description)
  if (!description) fail(fileName, 'frontmatter is missing meta_description')

  const slug = asString(data.slug) ?? fileName.replace(/\.md$/, '')
  if (!SLUG_RE.test(slug)) fail(fileName, `slug "${slug}" must be lowercase words separated by dashes`)

  const date = asString(data.date) ?? asString(data.checked)
  if (!date) fail(fileName, 'frontmatter is missing a date (YYYY-MM-DD)')
  if (!DATE_RE.test(date)) fail(fileName, `date "${date}" must be YYYY-MM-DD`)

  const { body, faqs } = splitFaqSection(stripLeadingTitle(content, title))

  return { slug, title, description, date, markdown: body, faqs }
}

/** Every published post, newest first (ties broken by title). */
export function getAllPosts(dir: string = BLOG_CONTENT_DIR): BlogPostSummary[] {
  const posts = readPosts(dir)
  posts.sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title, 'es') : b.date.localeCompare(a.date)))
  return posts.map(({ slug, title, description, date }) => ({ slug, title, description, date }))
}

/** One post with its markdown body and FAQ pairs, or null. */
export function getPostBySlug(slug: string, dir: string = BLOG_CONTENT_DIR): BlogPost | null {
  return readPosts(dir).find((post) => post.slug === slug) ?? null
}

export function getPostSlugs(dir: string = BLOG_CONTENT_DIR): string[] {
  return readPosts(dir).map((post) => post.slug)
}

function readPosts(dir: string): BlogPost[] {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md') && name.toLowerCase() !== 'readme.md')
    .sort()
    .map((name) => parsePostFile(name, fs.readFileSync(path.join(dir, name), 'utf8')))
}
