# Structured Data (Schema.org) Implementation Plan

## 1. Schema Hierarchy Across opinio.mx

### Route: `/` (Homepage)
- `@type`: `WebSite`
  - `@id`: `https://opinio.mx/#website`
  - `name`: `Opinio México`
  - `url`: `https://opinio.mx`
  - `potentialAction`: `SearchAction`
    - `target`: `https://opinio.mx/verificar?q={search_term_string}`
    - `query-input`: `required name=search_term_string`
- `@type`: `Organization`
  - `@id`: `https://opinio.mx/#organization`
  - `name`: `Opinio México`
  - `logo`: `https://opinio.mx/opinio.svg`
  - `areaServed`: `Mexico`

### Route: `/directorio` (Full Directory Index)
- `@type`: `CollectionPage`
  - `name`: `Directorio de Tiendas y Comercios en México | Opinio México`
  - `url`: `https://opinio.mx/directorio`
- `@type`: `BreadcrumbList`
  - Step 1: Inicio (`https://opinio.mx`)
  - Step 2: Directorio Completo (`https://opinio.mx/directorio`)

### Route: `/b/[slug]` (Merchant Passports)
- `@type`: `['Organization', 'OnlineStore']`
  - `name`: `brand_name`
  - `legalName`: `legal_name`
  - `taxID`: RFC (`rfc`)
  - `url`: Official domain or passport URL
  - `logo`: High-resolution logo asset
  - `telephone`: Official merchant support phone
  - `areaServed`: Mexico
  - `aggregateRating`:
    - `ratingValue`: Average rating (1–5, rounded to 1 decimal)
    - `reviewCount`: Total count of published reviews
    - `bestRating`: 5
    - `worstRating`: 1
  - `review`: Array of the latest 10 reviews
    - `author`: `Person` with reviewer name
    - `datePublished`: ISO-8601 date string
    - `reviewRating`: 1–5 stars
    - `reviewBody`: Verbatim verified feedback
- `@type`: `WebPage`
  - `url`: Canonical passport URL
  - `inLanguage`: `es-MX`
  - `speakable`: `SpeakableSpecification` targeting `#dictamen` and `#folio-strip`
  - `about`: Reference to Organization ID
- `@type`: `BreadcrumbList`
  - Step 1: Inicio (`https://opinio.mx`)
  - Step 2: Directorio de Empresas (`https://opinio.mx/verificar`)
  - Step 3: `brand_name` (`https://opinio.mx/b/[slug]`)
- `@type`: `FAQPage`
  - Entity Q&A resolving core purchase assurance questions for AI models and search engines.
