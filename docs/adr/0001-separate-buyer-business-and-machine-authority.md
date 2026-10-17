# Separate buyer, business and machine authority

Accepted decision from Chief and Dot, 2026-10-17. Buyers prove per-case access by email link without accounts; merchants authenticate through Auth.js with Postgres sessions and separately approved business memberships; integrations use revocable business-scoped keys. A shared password or public identifier cannot isolate businesses, and merchant authority can never substitute for the buyer's explicit confirmation. Auth.js adoption is conditional on the first compatibility spike; a paid hosted fallback requires user approval.
