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

## Baseline observations

The previous local production build returned a JavaScript chunk error. Its homepage hero was blank on desktop and the mobile homepage failed to render normally. Automated axe checks found 52 low-contrast nodes on the desktop homepage, 16 in search, 43 on a passport, and further contrast/form-label problems across merchant pages. The former merchant layout reserved 256 pixels for navigation on narrow screens.

Screenshots and raw baseline findings are captured by the QA runner. Baseline failures describe the observed local build, not production availability.

## Verification

Final results and reproduction instructions will be added after the browser and build checks complete. UI writes are intercepted during automated testing; no reviews, cases, messages, invitations, or settings are written to the live database for QA.

## Remaining release requirements

These cannot be certified by visual polish or an accessibility score:

1. **Authorization and private cases.** Merchant selection/actions and case APIs need enforced authentication and ownership checks. Public case payloads currently require a privacy review. Do not treat a case URL or a hidden UI control as access control.
2. **Evidence provenance.** Existing server settings actions can label edited identity records as verified without an independent verification event. Historical seeded or manually maintained records must be audited before presenting them as verified real-world evidence.
3. **Invitation delivery and coverage.** Creating an invitation record is not proof of delivery. The backend must distinguish registered, sent, delivered, and unique eligible orders before claiming audited invitation coverage. Resolve token-based review attribution end to end.
4. **Integrations.** Shopify, Tiendanube, WooCommerce, CSV imports, messaging delivery, and credential issuance require working services before activation claims can be made.
5. **Operations and privacy documents.** Publish reviewed legal/privacy terms, establish moderation and dispute handling, and verify official source access. Remove hardcoded credentials from the existing data layer and rotate exposed values.
6. **Real-user performance and research.** Measure production Core Web Vitals and test real purchase/review journeys with Mexican consumers, including assistive-technology users. Local automated checks cannot establish decades of product-market leadership.

This change is a UI/UX implementation and validation pass. It does not certify production authorization, evidence provenance, legal compliance, or operational readiness.
