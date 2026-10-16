/**
 * Markdown pipeline for the /blog section.
 *
 * Content is repo-authored markdown, so `marked`'s HTML is trusted and can be
 * injected directly (no user input ever reaches it). Everything the page and
 * its structured data need comes from the same token stream:
 *
 * - `renderMarkdown` produces the article HTML;
 * - `splitFaqSection` separates the "Preguntas frecuentes" section and returns
 *   its pairs as plain text (for the FAQPage JSON-LD) plus the inline-rendered
 *   answer HTML (for the on-page accordion), so the visible text and the
 *   structured data cannot drift.
 */
import { marked, type Token, type Tokens } from 'marked'

export interface BlogFaq {
  /** Question, plain text. */
  q: string
  /** Answer, plain text (what the reader sees, links shown as their label). */
  a: string
  /** Answer as inline HTML (links preserved) for the on-page accordion. */
  aHtml: string
}

export interface BlogContent {
  /** Body markdown with the FAQ section removed. */
  body: string
  faqs: BlogFaq[]
}

/** Render a markdown document to HTML. */
export function renderMarkdown(markdown: string): string {
  return marked.parse(markdown, { async: false })
}

/** Inline markdown -> HTML (links preserved). */
export function inlineHtml(inline: string): string {
  return marked.parseInline(inline, { async: false })
}

/** The token stream for a markdown document (block-level). */
export function parseMarkdownTokens(markdown: string): Token[] {
  return marked.lexer(markdown)
}

/**
 * Inline markdown -> the plain text a reader sees. `marked.parseInline`
 * escapes entities, so they are decoded back to the visible characters.
 */
export function inlinePlainText(inline: string): string {
  return decodeEntities(stripTags(inlineHtml(inline))).trim()
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

function decodeEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/**
 * Split a document into its body and the "Preguntas frecuentes" pairs: each
 * depth-3 heading is a question; the paragraphs that follow it (until the next
 * heading) are its answer. No FAQ section -> the whole document is the body.
 */
export function splitFaqSection(markdown: string): BlogContent {
  const heading = markdown.match(/^##[ \t]+preguntas frecuentes[ \t]*$/im)
  if (!heading || heading.index === undefined) {
    return { body: markdown.trim(), faqs: [] }
  }
  const body = markdown.slice(0, heading.index).trimEnd()
  const section = markdown.slice(heading.index)
  return { body, faqs: extractFaqs(section) }
}

/** The FAQ pairs in a markdown fragment that starts at the section heading. */
export function extractFaqs(markdown: string): BlogFaq[] {
  const tokens = parseMarkdownTokens(markdown)
  const faqs: BlogFaq[] = []
  let inFaqSection = false
  let current: { q: string; answer: string[] } | null = null

  for (const token of tokens) {
    if (token.type === 'heading') {
      const heading = token as Tokens.Heading
      if (heading.depth === 2) {
        if (inFaqSection && current) faqs.push(toFaq(current))
        inFaqSection = /^preguntas frecuentes$/i.test(inlinePlainText(heading.text))
        current = null
        continue
      }
      if (heading.depth === 3 && inFaqSection) {
        if (current) faqs.push(toFaq(current))
        current = { q: inlinePlainText(heading.text), answer: [] }
        continue
      }
      // Any other heading (h4+) inside the section is part of the answer copy.
      if (inFaqSection && current) current.answer.push(heading.text)
      continue
    }
    if (inFaqSection && current && token.type === 'paragraph') {
      current.answer.push((token as Tokens.Paragraph).text)
    }
  }
  if (inFaqSection && current) faqs.push(toFaq(current))

  return faqs
}

function toFaq(faq: { q: string; answer: string[] }): BlogFaq {
  const raw = faq.answer.join(' ').trim()
  return { q: faq.q, a: inlinePlainText(raw), aHtml: inlineHtml(raw) }
}

/**
 * Drop the document's leading `# Title` line when it repeats the frontmatter
 * title — the page renders the title itself, so the body starts at the first
 * section.
 */
export function stripLeadingTitle(markdown: string, title: string): string {
  const match = markdown.match(/^\s*#\s+(.+?)\s*\n/)
  if (!match) return markdown.trim()
  if (inlinePlainText(match[1]) !== inlinePlainText(title)) return markdown.trim()
  return markdown.slice(match[0].length).replace(/^\s+/, '')
}
