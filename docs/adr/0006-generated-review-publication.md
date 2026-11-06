# ADR-0006: Generated reviews use an explicit unverified publication queue

## Status
Accepted

## Date
2026-11-05

## Context
Automated publication must not rewrite historical reviews or create transaction evidence. Generation uses a paid agent on machine 38; publication must be inexpensive, idempotent, and runnable on machine 82 without an agent runtime.

## Decision
Persist generated content in `review_publication_queue` with official-site evidence, Humanizer completion, automated provenance, and `unverified_experience`. A queue row has a persistent `publish_after`, deterministic deduplication/publication keys, bounded state, and at most one published review. The publisher uses `FOR UPDATE SKIP LOCKED`, short transactions, and the unique review publication key. Generated reviews have no order, invitation, contact, or customer identity and use score weight 0.35.

Generation and publication are separate lanes. The 82 cron only publishes due rows. Sporadic timing is assigned at enqueue and stored; no scheduler sleeps or random cron intervals are used. Rollback disables the two scheduler entries and leaves queued content unpublished.

## Consequences
Generated content is visibly labeled `Automatizado` and excluded from customer aggregates, buyer JSON-LD, and consumer conversion milestones. Existing rows keep null provenance. Failed rows retain sanitized errors and make at most three attempts in total with a one-hour backoff. Publication is serialized and limited to one row per run with global and per-brand cooldown checks, preventing overdue bursts. Generation reaches 82 through a non-root forced SSH command that only supports capacity and validated enqueue. The additive migration grants only queue SELECT/INSERT/UPDATE to the application role; no historical data is deleted or reseeded.
