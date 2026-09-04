# Opinio UI/UX quality review

Date: 2026-09-04. Scope: the consumer portal, business passports, opinion and case journeys, merchant console, and embedded widgets. Target: a trustworthy, accessible, responsive Mexican review portal.

A 100/100 grade is not a market-leadership guarantee. This review distinguishes automated checks, browser observations, and release requirements that need backend or operational work.

## Implemented improvements

- Rebuilt the homepage around finding a business, reading evidence, writing an opinion, and resolving a problem. Added a distinct Opinio identity, quieter visual hierarchy, legible type, consistent surfaces and semantic colors.
- Server-rendered the hero, business cards, categories, methodology, and footer. Removed perpetual transaction animations and arbitrary activity totals. Fixed undefined card/star styles by using implemented styles.
- Removed simulated CLABE identification and unsubstantiated certification, percentile, live-activity, blanket verification, and privacy claims from the active interface.
- Replaced generic review links to Luuna with an explicit business-selection journey. Search supports debouncing, cancellation, keyboard suggestions, loading, empty, and recoverable error states.
- Corrected category links and combined query/category filtering; retain review intent in the directory.
- Unified public navigation and footer links, provided an accessible mobile menu, a skip link, visible keyboard focus, reduced-motion styles, and branded missing-page/error recovery.
- Improved consumer form labels, validation, submission feedback, and truthful evidence labels. A self-reported review is not treated as an independently verified purchase.
- Improved merchant mobile navigation, business context, dialogs, clipboard feedback, form labels, and honest invitation/integration availability states.
- Replaced nonfunctional widget script/package instructions with previews of supported iframe routes.

## Review-portal refinement

The user asked to preserve the newly finished layout while restoring useful review discovery and reducing the monochrome treatment. The current [Trustpilot homepage](https://www.trustpilot.com/) and its [description of review filtering](https://corporate.trustpilot.com/public-affairs/news/six-things-that-might-surprise-you-about-trustpilot) informed the functional benchmark: discover companies, compare ratings and counts, inspect a rating distribution, and search or filter the experiences behind a score. Opinio keeps its own evidence and case model.

- Added actual published-review averages out of five and published counts on the homepage, directory, and passport. These are separate from the evidence-weighted Opinio score out of 100. Review-response joins select a single latest reply to avoid multiplying reviews and inflating totals.
- Expanded category discovery to eight categories with actual inventory counts. Muebles has its own working filter. Recent community content shows one latest published review per business, without excluding low ratings.
- Added directory minimum-rating, registered-order, and sorting controls. Filters combine on the server, remain in the URL, survive retry, and retain the user's intent to write an opinion. Filtering and sorting use unrounded averages; displayed averages use one decimal. Results disclose the existing 50-result limit.
- Added a clickable five-to-one-star distribution, keyword search that ignores accents, evidence filters, reply-only filtering, ordering and progressive display of opinions. The overall summary remains tied to all published opinions while filters change the list.
- Retained the warm canvas and green trust identity. Added blue actions, peach and lavender category accents, colored star tiles, and lavender reply panels. Secondary-color text pairs were checked for contrast.
- Fixed generic review-sharing links so they open an existing review form, with explicit copy explaining that the link does not identify an invitation or prove a purchase.

## Baseline observations

The previous local production build returned a JavaScript chunk error. Its homepage hero was blank on desktop and the mobile homepage failed to render normally. Automated axe checks found 52 low-contrast nodes on the desktop homepage, 16 in search, 43 on a passport, and further contrast/form-label problems across merchant pages. The former merchant layout reserved 256 pixels for navigation on narrow screens.

Screenshots and raw baseline findings are captured by the QA runner. Baseline failures describe the observed local build, not production availability.

## Verification

Verification uses an isolated local PostgreSQL fixture database, visibly labeled in the preview. It contains six businesses and 18 published reviews. No production reviews, cases, messages, invitations, settings, or emails are created by QA. The browser runner intercepts every non-GET/HEAD request, including mocked success and failure submissions.

Checks completed before the final visual audit:

- Full ESLint: passes with zero errors; 19 unused-symbol/directive warnings remain in the codebase. Scoped lint of the new review/discovery components passes.
- TypeScript: pass.
- Read-only search integration: six checks pass for real averages/counts, combined category lookup, normalized domain lookup, minimum rating, review-count ordering/registered orders, and no matches.
- Initial production fixture audit: 32 page/viewport checks. The only remaining issue was keyboard access to horizontally scrolling merchant tables; both regions now have focus and descriptive labels.

The production candidate compiled successfully, including TypeScript. All 40 page/viewport checks pass with zero detected axe violations, horizontal overflow, browser exceptions, or unexpected local HTTP failures. Eight additional checks at 320px and 768px pass for the homepage, directory, passport, and merchant dashboard.

The only change after that candidate is the client-side origin of copied review-form links in two merchant components. The final production build, including TypeScript, passes. Its source snapshot matches the application source in the checkout. All four final merchant page/viewport checks and all eight interaction journeys pass. The copied-link test intercepts the clipboard and confirms the current host and the correct business review form; it does not alter the real clipboard.

### Lighthouse measurements

Lighthouse 13.4.1, fresh Chrome profiles, a local standalone production build, and the isolated fixture database. These are lab measurements rather than field Core Web Vitals or a universal UX grade.

| Device | Performance | Accessibility | Best practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Desktop | 100 | 100 | 100 | 100 |
| Mobile | 93 | 100 | 100 | 100 |

Desktop LCP is 0.63 seconds with zero total blocking time. Mobile LCP is 2.93 seconds with 104ms total blocking time. Both have zero measured layout shift. Both reports have no run warnings.

The mobile run's principal opportunity is the initial document response, measured at 768ms, plus approximately 49KiB of unused framework JavaScript. Production response time and real-user Core Web Vitals still need measurement; this result does not support calling mobile performance 100/100.

[Measured Lighthouse results](ui-ux-evidence/lighthouse-summary.json).

### Visual evidence

These captures use development fixtures, not evidence of real purchases or live verification.

- [Homepage, desktop](ui-ux-evidence/home-desktop.png)
- [Homepage, mobile](ui-ux-evidence/home-mobile.png)
- [Directory with star ratings and filters](ui-ux-evidence/directory-desktop.png)
- [Opinion distribution, search, filters, and replies](ui-ux-evidence/review-tools-desktop.png)
- [40 desktop/mobile page checks](ui-ux-evidence/page-checks.json)
- [Final interaction and merchant checks](ui-ux-evidence/interaction-checks.json)
- [Additional responsive checks](ui-ux-evidence/responsive-results.json)
- [Final production build](ui-ux-evidence/production-build.log)
- [Full lint output](ui-ux-evidence/lint.log)

Reproduce the browser audit with a running application connected to a disposable fixture database:

```sh
npm install --prefix /tmp/opinio-qa playwright axe-core lighthouse
BASE_URL=http://127.0.0.1:3009 QA_TAG=final node scripts/ui-qa.mjs
```

Set `CHROME_PATH` for your local Chrome executable and `QA_DEPENDENCIES` if the tools are installed elsewhere. The audit covers 20 routes at 1440×1000 and 390×844, plus keyboard navigation, search, review discovery, form retention/retry, and dialog journeys. Unknown routes and widget tokens must return 404. Screenshots and raw results are written under `/tmp/opinio-qa/final`.

## Remaining release requirements

These cannot be certified by visual polish or an accessibility score:

1. **Authorization and private cases.** Merchant selection/actions and case APIs need enforced authentication and ownership checks. Public case payloads currently require a privacy review. Do not treat a case URL or a hidden UI control as access control.
2. **Evidence provenance.** Existing server settings actions can label edited identity records as verified without an independent verification event. The review API also accepts a caller-selected verification level; evidence status must be assigned by trusted server-side verification. Historical seeded or manually maintained records must be audited before presenting them as verified real-world evidence.
3. **Invitation delivery and coverage.** Creating an invitation record is not proof of delivery. The backend must distinguish registered, sent, delivered, and unique eligible orders before claiming audited invitation coverage. Resolve token-based review attribution end to end.
4. **Integrations.** Shopify, Tiendanube, WooCommerce, CSV imports, messaging delivery, and credential issuance require working services before activation claims can be made.
5. **Operations and privacy documents.** Publish reviewed legal/privacy terms, establish moderation and dispute handling, and verify official source access. Remove hardcoded credentials from the existing data layer and rotate exposed values.
6. **Real-user performance and research.** Measure production Core Web Vitals and test real purchase/review journeys with Mexican consumers, including assistive-technology users. Local automated checks cannot establish decades of product-market leadership.

This change is a UI/UX implementation and validation pass. It does not certify production authorization, evidence provenance, legal compliance, or operational readiness.
