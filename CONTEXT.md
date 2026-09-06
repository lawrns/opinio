# Opinio Domain Context

Opinio is Mexico's verified merchant trust and dispute resolution platform, pairing consumer ratings with institutional verification (SAT, PROFECO, INEGI) and observed transaction order coverage.

## Language

### Widgets & Badges

**Micro-Ribbon**:
A single-line, ultra-compact horizontal trust badge (~32px height) displaying the merchant's verified Opinio star rating, sentiment status, and review count separated by clean dividers.
_Avoid_: Banner, ticker, pop-up, sticker.

**Passport Backlink**:
A canonical direct link from an external merchant website to their official Opinio profile (`/b/[slug]`), serving as cryptographic and visual proof of authentic consumer feedback.
_Avoid_: Referral link, tracking url, profile redirect.

**Merchant Widget Token**:
An opaque identifier (e.g. `wgt_barri_ribbon_2026`) used by merchants to securely fetch and render their public Opinio trust widgets in external surfaces without exposing internal database IDs.
_Avoid_: API secret, session key, auth token.

### Trust & Metrics

**Trust Score**:
An objective 0–100 algorithmic score combining order coverage, resolution rate of buyer complaints, and verified fiscal identity.
_Avoid_: Karma, vanity rating, review score.

**Aggregate Rating**:
The consumer satisfaction average (1.0 to 5.0 stars) calculated exclusively from verified buyer and user reviews.
_Avoid_: Star count, customer grade.

**Verified Review**:
A consumer evaluation linked to an observed store order, verified payment receipt, or validated corporate identity.
_Avoid_: Unchecked comment, testimonial, endorsement.

## Example Dialogue

> **Dev**: Can we put a banner on Barri's homepage that links to their page?  
> **Domain Expert**: You mean a **Micro-Ribbon** that points to their **Passport Backlink**. It renders `★ Opinio | Excelente 4.9/5 | 50+ reseñas verificadas` in a single line without shifting the layout.  
> **Dev**: Understood. We will load it using the merchant's **Merchant Widget Token**.
