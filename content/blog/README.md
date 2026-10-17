# Blog content

Each `.md` file in this folder becomes a page at `/blog/<slug>` at build time —
no code changes needed to publish. Add this frontmatter:

```yaml
---
title: "…"                  # required — page h1, index listing, Article JSON-LD
meta_description: "…"       # required — meta description and index copy
date: "YYYY-MM-DD"          # required (falls back to `checked` when absent)
slug: "…"                   # optional — defaults to the file name
status: "published"         # editorial marker — not a runtime publication filter
---
```

The body is standard markdown (headings, paragraphs, lists, links, bold, GFM
tables). Rules the build relies on:

- The first `# …` line is dropped when it repeats the frontmatter title (the
  page renders the title itself).
- A section titled `## Preguntas frecuentes` becomes the page's FAQ accordion
  and its FAQPage structured data: each `###` heading is a question and the
  paragraphs that follow it are the answer. The JSON-LD text is generated from
  the same source that renders the visible text, so the two always match.
- Put the closing CTA paragraph before `## Preguntas frecuentes`. Keep the
  FAQ last so each answer ends with its own text, without closing navigation.
- Internal links in the copy are written as full URLs (`https://opinio.mx/…`).

Invalid frontmatter (missing title/description/date) fails the build with the
file name. The post list is ordered newest-first by `date`.
