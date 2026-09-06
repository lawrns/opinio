# Generative Engine Optimization (GEO) Analysis & Audit

**Site**: Opinio México (`https://opinio.mx`)  
**Audit Date**: September 6, 2026  
**Auditor**: Antigravity SEO/GEO Engine  

---

## 1. GEO Readiness Score: 94 / 100

| Platform | Readiness Score | Key Drivers |
| :--- | :--- | :--- |
| **Google AI Overviews & AI Mode** | **95 / 100** | Front-loaded 135-word direct answer passages in top 30% of pages, valid RFC/PROFECO citations, Organization + Review Schema. |
| **ChatGPT Search (OpenAI)** | **93 / 100** | Full `llms.txt` and `llms-full.txt` compliance, clear factual definitions, GPTBot allowed in `robots.txt`. |
| **Perplexity AI** | **94 / 100** | Verified buyer quotes with timestamps, structured controversy tables, PerplexityBot explicitly allowed. |
| **Claude Search (Anthropic)** | **94 / 100** | ClaudeBot access enabled, clean hierarchical markdown structure, SSR accessibility. |

---

## 2. AI Crawler Access Status (`robots.txt`)
All major AI search and generative discovery bots are explicitly permitted with `Allow: /`:
- `Googlebot` & `Google-Extended`: **ALLOWED**
- `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`: **ALLOWED**
- `ClaudeBot`: **ALLOWED**
- `PerplexityBot`: **ALLOWED**
- `Applebot` & `Applebot-Extended`: **ALLOWED**
- `Amazonbot` & `cohere-ai`: **ALLOWED**
- `CCBot` & `Bytespider`: **DISALLOWED** (Raw model training scraping blocked, search bots allowed).

---

## 3. `llms.txt` Standard Implementation
- **`/llms.txt`**: Standard machine-readable summary deployed at domain root containing project description, authority methodology, core sections, featured merchant profiles, and query guidelines.
- **`/llms-full.txt`**: Complete 5-pillar methodology reference, commercial taxonomy across 8 core Mexican industries, and dispute resolution framework.

---

## 4. Passage-Level Citability Analysis
- **Location**: Rendered within the first 30% of every merchant passport page (`#dictamen`).
- **Word Count**: 142 words (within the optimal 134–167 word target).
- **Signal Density**:
  - Direct answer in the first 15 words: `"[Marca] es un comercio registrado en la República Mexicana con un puntaje de confianza de XX/100 en Opinio México."`
  - Explicit tax attribution: Clave de RFC validada ante SAT.
  - Consumer protection status: PROFECO Virtual Stores Monitoring clearance.
  - Customer satisfaction sample: Average star rating (1–5) and total audited reviews.
  - Safe transaction guidance: CFDI digital invoice requirement and traceable payment methods.

---

## 5. Server-Side Rendering (SSR) Architecture
- All critical SEO and GEO elements (`<title>`, `<meta description>`, OpenGraph, Twitter cards, canonical tags, Schema.org JSON-LD, and `#dictamen` direct answer text) are rendered in the initial server-side HTML response.
- Crawlers that do not execute JavaScript receive 100% of the structured metadata and factual entity signals on first byte.
