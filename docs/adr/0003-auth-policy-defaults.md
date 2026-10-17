---
status: accepted
---
# Bounded proof and least business authority

Approved by Chief, 2026-10-17, as specced: 15-minute buyer and merchant links, 7-day absolute nonrolling sessions, 24-hour staff invitations, owner/staff business roles, and immediate per-request membership revocation. Staff perform operational reads/replies/remedies/invitation creation; owners additionally manage settings, widgets, memberships and keys. Only the independently authorized administrator approves first owners/transfers. On transfer, old business authority and its outstanding staff invitations/keys are invalidated, preserving unrelated business memberships. These defaults prevent stale authority without adding buyer accounts or a paid identity vendor; they are approved implementation requirements; production enablement remains gated.

New cases collect a separate required access email while keeping phone contact optional. A fragment-based buyer link and explicit exchange POST keep bearer tokens out of initial request URLs and mail previews from consuming proof. Chief approved these form and access-policy defaults in decision dd8ded68-3a7e-40cc-af74-31585c2b31f9.

The approved case policy permits merchant acknowledge/remedy/assert/unresolved transitions only among nonconfirmed working states, buyer confirmation only after a remedy offer or merchant resolution assertion, and explicit buyer reopen from either resolved state. Replays are idempotent and stale conflicting mutations fail closed; historical ambiguous state/flag combinations remain held for review. Full permitted transitions are in the spec.
