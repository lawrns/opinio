---
status: accepted (Chief, delegated by user, 2026-10-17)
---
# Legacy case recovery is reviewed by hand

B07 (#33). Cases opened before B06 have no private access email, only the single "phone or email" contact the buyer typed. No version of the app ever changed that field after creation. But the production database credential was exposed, and there is no backup from before the exposure, so the database alone cannot prove a stored contact is unaltered. Atlas's guidance (DOT-003, part e) is buyer-requested recovery to the original, independently supported contact; ambiguous records need manual verification; never auto-resolve.

**Decision.** Every legacy recovery is reviewed by a human platform administrator. No recovery email is ever sent automatically.

- A buyer asks with their case number and email. If the email matches the case's stored original contact, a pending request is recorded. Otherwise nothing is recorded. The answer is the same either way, nothing is sent, and requests are rate-limited. A newly supplied address is never stored or used.
- Cases whose stored contact is a phone number, or something that is neither a phone nor an email, are recorded as needing manual verification. They are never sent anything, and there is no WhatsApp fallback.
- An administrator approves only after verifying out of band, recording how (`order_record`, `merchant_record`, `buyer_callback`, `other_documented`) and a reference such as `VER-1042`. In one transaction, the approval retires that case's unused links, revokes its active buyer sessions, sets its access email to the stored original contact, and issues one single-use link, which is then sent to that address only. Other cases are untouched.
- Approval and rejection are audited with the administrator as actor. Nothing changes a case's status or confirmation.

Everything is behind `OPINIO_BUYER_PROOF`, which stays off in production until the user approves the email sender.
