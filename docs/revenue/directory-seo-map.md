# Directory SEO & Indexation Architecture Map

## 1. Directory Entity Inventory
- **Total Entities**: 1,197 businesses + 5 verified anchor sister brands (`bien`, `barri`, `gogym`, `doctormx`, `hablo`).
- **Entity Identification Fields**:
  - `brand_name`: Public brand commercial identity.
  - `legal_name`: Formal incorporated entity name in Mexico (S.A. de C.V., S.A.P.I., etc.).
  - `rfc`: Clave de Registro Federal de Contribuyentes (validated against SAT structure).
  - `category`: Industry classification (Moda, Calzado, Joyería, Ferretería, Alimentos, Salud, Software, etc.).
  - `domain`: Official verified web shop domain.
  - `phone` & `whatsapp`: Validated customer support contacts.
  - `operating_area`: Declared regional or national delivery coverage in Mexico.
  - `trust_score`: Normalized 0–100 commercial reliability score.
  - `verified_level`: `transparent_coverage`, `connected_orders`, `claimed`, or `public_info`.

## 2. Crawl Architecture & URL Hierarchy
All pages are within 2 clicks from the homepage:
- **Level 0 (Homepage)**: `https://opinio.mx/` (Priority: 1.0, daily)
- **Level 1 (Directory Index & Discovery Hubs)**:
  - `https://opinio.mx/directorio` (Priority: 0.95, daily, SSR crawlable index by category)
  - `https://opinio.mx/verificar` (Priority: 0.90, daily, interactive search with filter states)
- **Level 2 (Store Passport Profiles)**:
  - `https://opinio.mx/b/[slug]` (Priority: 0.80, weekly, 1,197 unique Mexican merchant profiles)
- **Level 2 (Review Capture & Case Resolution)**:
  - `https://opinio.mx/escribir-opinion/[slug]` (User-driven review submission)
  - `https://opinio.mx/caso/nuevo` (Formal merchant dispute mediation)

## 3. Indexable vs. Noindex Directives
- **Indexable**:
  - `/` (Home)
  - `/directorio` (Full SSR catalog grouped by category)
  - `/verificar` (Directory search hub)
  - `/b/[slug]` (All 1,197 business passports)
- **Noindex**:
  - `/api/private/*` (Internal server routes)
  - Admin/internal authentication callbacks

## 4. Internal Linking Strategy
- **Global Header**: Direct link to `/directorio` and `/verificar` on every page.
- **Global Footer**: Categorized consumer links to `/directorio`, `/verificar`, `/caso/nuevo`.
- **Breadcrumb Trails**: Every `/b/[slug]` links back to `Inicio` (`/`) and `Directorio` (`/verificar`).
- **Category Hubs**: Category anchor chips on `/directorio` cross-link related stores in the same vertical.
