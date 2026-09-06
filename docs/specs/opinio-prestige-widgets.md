# Spec: Opinio Prestige Micro-Ribbon Widgets & Homepage Integration

## Objective
Build a Trustpilot-grade micro-ribbon widget ("Cinta de Prestigio") for Opinio.mx and weave it non-invasively into the homepages of our sister Mexican brands:
1. **Barri.mx** (`biendeli`)
2. **Doctor.mx** (`doctormx`)
3. **Hablo.com.mx** (`hablo`)
4. **GoGym.mx** (`GYM`)

The widget serves as a hallmark of credibility and prestige, communicating verified rating and volume in a single line (~32px to 36px) that links to each business's Opinio public passport (`/b/[slug]`).

## Tech Stack
- Framework: Next.js (App Router, Server Components)
- Styling: Tailwind CSS & pure responsive SVG/CSS
- Database: PostgreSQL (`widgets` table)
- Icons: Lucide React (`Star`, `ShieldCheck`, `ExternalLink`)

## Commands
- Build Opinio: `npm run build`
- Dev Opinio: `npm run dev`
- Seed Widgets: `npx tsx scripts/seed-portfolio-businesses.ts`

## Project Structure
```
opinio/
├── src/app/widget/ribbon/[token]/page.tsx      # Hosted iframe/surface for the ribbon widget
├── src/components/MerchantWidgetSurface.tsx    # Surface component handling all widget formats (badge, card, reassurance, ribbon)
├── src/components/WidgetsCustomizer.tsx        # Merchant dashboard customizer with ribbon preview & copyable embed code
├── src/components/widgets/OpinioPrestigeRibbon.tsx # Zero-dependency React component for Next.js sister apps
```

## Visual & Code Style
Single-line horizontal flex pill:
```tsx
<a
  href="https://opinio.mx/b/barri"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
>
  <span className="flex items-center gap-1.5 font-bold">
    <OpinioStarIcon className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
    Opinio
  </span>
  <span className="opacity-30">|</span>
  <span className="font-semibold text-white/90">Excelente 4.9/5</span>
  <span className="opacity-30">|</span>
  <span className="text-white/70">50+ reseñas verificadas</span>
</a>
```

## Testing Strategy
- Automated: Compile and build check on `opinio` and target repositories (`npm run build`).
- Functional: Test `/widget/ribbon/[token]` with themes (`light`, `dark`, `transparent`).
- Non-invasive UI: Verify zero horizontal overflow on mobile viewports (390px, 375px), zero cumulative layout shift (CLS), and proper external link attributes (`target="_blank"`, `rel="noopener noreferrer"`).

## Boundaries
- **Always**: Use real seeded business slugs and tokens (`barri`, `doctormx`, `hablo`, `gogym`).
- **Always**: Keep widgets responsive with flexible text wrapping or subtle micro-scales on mobile.
- **Never**: Introduce layout shifts (CLS > 0) or blocking third-party scripts on sister homepages.
- **Never**: Break existing widgets (`badge`, `card`, `reassurance`).

## Success Criteria
- `/widget/ribbon/[token]` renders a ~32px-36px micro-ribbon in Opinio with light/dark/transparent support.
- `/merchant/widgets` includes "Cinta Micro / Ribbon de Prestigio" with live preview and iframe embed code.
- `barri.mx` displays the Opinio prestige ribbon in the Hero trust area.
- `doctor.mx` displays the Opinio prestige ribbon in `HeroSection` trust strip.
- `hablo.com.mx` displays the Opinio prestige ribbon in the Hero trust metrics.
- `gogym.mx` displays the Opinio prestige ribbon in `landing-v5.tsx` sub-CTA hero area.
