---
status: accepted (Chief, delegated by user, 2026-10-17)
---
# Staff invitations, removal and transfers

Implements the transfer and staff rules of [ADR 0003](0003-auth-policy-defaults.md) for B04 (#30). Proposed by Builder 3; accepted by Chief (delegated by the user) on 2026-10-17.

**Staff invitations.** Only an active owner invites, and only for their own business. An invitation is 32 random bytes, stored as SHA-256, valid for 24 hours, used once, and bound to one business and one email address. Acceptance needs a merchant session whose login email is that address, and the inviter must still be the business's active owner at that moment. A new invitation to the same address replaces the pending one; a business holds at most 20 pending invitations. An invitation whose email could not be sent is revoked at once.

**Removal.** An owner removes staff memberships of their business; access ends on the member's next request. Owners are never removed this way, and there is no role change: an owner changes only through an administrator-approved transfer, so control is never orphaned and staff can never elevate themselves.

**Transfer.** Only a platform administrator approves one, with the same documented evidence as a first-owner approval. In one transaction it revokes the business's previous approvals, **every active membership of that business (the previous owner and all staff)**, its pending staff invitations and its machine keys, then records the transfer approval (with the previous owner) and the new owner's membership. Memberships in other businesses are untouched. The new owner invites staff again.

*Decision:* ADR 0003's "old business authority" means all authority granted under the previous owner, staff included, which fails closed: people the previous owner chose don't keep access the new owner never granted. Each revoked membership, invitation and key gets its own audit row, and the approval form warns the administrator before a transfer.

**Races.** Every invitation, acceptance, removal, revocation, approval and transfer locks the business row first, so they apply one at a time per business. Single-use, revocation, expiry and the "inviter is still the owner" check are all evaluated under that lock. A removed or replaced owner has no membership to invite from, and their old invitations no longer validate.
