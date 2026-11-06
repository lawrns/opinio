# Review generation and publication

## Architecture

- Machine 38 runs one bounded Hermes generation job per day. It checks capacity before generating, verifies current official brand pages, applies Humanizer, and submits structured JSON through a forced SSH command.
- The SSH account `opinio-review` on machine 82 can only run `ops/opinio-review-gateway`, which accepts capacity or validated enqueue over stdin. It has no interactive session, forwarding, PTY, root access, or direct credential access.
- Machine 82 stores at most 24 active queue rows and four queued/claimed rows per brand. Enqueue assigns persistent brand-local due times with an 18-hour per-brand cooldown and 6–24-hour cross-brand spacing.
- Machine 82 runs the publisher every minute with `flock` and a 55-second timeout. Each transaction rechecks the global and brand cooldowns. At most one row publishes per run, so overdue rows cannot burst.
- Generated rows always use `verification_level = 'unverified_experience'`, `content_origin = 'automated'`, `score_weight = 0.35`, no order/invitation/contact, and author name `Contenido automatizado`. Public customer aggregates and JSON-LD exclude them; the visible list labels them `Automatizado`.
- Failed rows make at most three attempts in total with at least one hour between attempts. Evidence older than 45 days is not published.

See `docs/adr/0006-generated-review-publication.md` and `ops/review-generation-prompt.md`.

## Installation

Deploy the same pipeline commit to `/opt/opinio-review-publisher` on machines 82 and 38, then install production dependencies:

```sh
cd /opt/opinio-review-publisher
/usr/local/bin/bun install --production
```

Store `DATABASE_URL` for the application role in `/etc/opinio-review-publisher.env` on machine 82. Set owner `root:opinio-review` and mode 0640. Do not copy this file into the repository or logs.

Create the restricted account and forced gateway on machine 82:

```sh
useradd --system --home /var/lib/opinio-review --create-home --shell /bin/bash opinio-review
install -m 0755 /root/.bun/bin/bun /usr/local/bin/bun
install -m 0755 /opt/opinio-review-publisher/ops/opinio-review-gateway /usr/local/sbin/opinio-review-gateway
install -d -m 0700 -o opinio-review -g opinio-review /var/lib/opinio-review/.ssh
```

Install the 38 root ED25519 public key in `/var/lib/opinio-review/.ssh/authorized_keys` with owner `opinio-review:opinio-review` and mode 0600. Put these options on its single line:

```text
restrict,from="38.242.229.120",command="/usr/local/sbin/opinio-review-gateway"
```

Apply the additive migration once on machine 82 using a loopback application-role URL:

```sh
cd /opt/opinio-review-publisher
set -a; . /etc/opinio-review-publisher.env; set +a
/usr/local/bin/bun run scripts/migrate-auth.mjs
```

The dry run must list only `0008_review_publication_queue.sql`. Do not apply if another migration is pending without reviewing it separately. Then run:

```sh
/usr/local/bin/bun run scripts/migrate-auth.mjs --apply
```

The migration creates `review_publication_queue`, adds nullable provenance/publication columns to `reviews`, creates a partial unique publication-key index, and grants queue SELECT/INSERT/UPDATE to `opinio_app`. It does not update existing reviews, orders, invitations, or timestamps.

Install `/etc/cron.d/opinio-review-publisher` on machine 82 after dry-run and real-PostgreSQL integration verification:

```cron
* * * * * root cd /opt/opinio-review-publisher && set -a && . /etc/opinio-review-publisher.env && set +a && /usr/bin/flock -n /var/lock/opinio-review-publisher.lock /usr/bin/timeout 55s /usr/local/bin/bun run scripts/publish-due-reviews.ts >> /var/log/opinio-review-publisher.log 2>&1
```

Install `/etc/logrotate.d/opinio-review-publisher`:

```text
/var/log/opinio-review-publisher.log {
  weekly
  rotate 12
  compress
  missingok
  notifempty
  copytruncate
}
```

Create the bounded generation job on machine 38 in paused state:

```sh
/root/.local/bin/hermes cron create '17 4 * * *' 'Read /opt/opinio-review-publisher/ops/review-generation-prompt.md and execute it exactly.' \
  --name opinio-review-generation \
  --skill humanizer \
  --model deepseek-v4.1-flash \
  --workdir /opt/opinio-review-publisher \
  --deliver local \
  --paused --paused-reason 'Activate after controlled publication verification'
```

Activate only after controlled publication verification:

```sh
/root/.local/bin/hermes cron resume JOB_ID
```

## Dry run and monitoring

Check capacity through the restricted gateway from machine 38:

```sh
ssh -o BatchMode=yes opinio-review@82.208.21.221 capacity
```

On machine 82, inspect due rows without claiming, inserting, updating, or auditing:

```sh
cd /opt/opinio-review-publisher
set -a; . /etc/opinio-review-publisher.env; set +a
/usr/local/bin/bun run scripts/publish-due-reviews.ts --dry-run
```

Run the publisher once manually, inspect its log, and query queue/review provenance:

```sh
/usr/local/bin/bun run scripts/publish-due-reviews.ts
```

```sh
tail -n 100 /var/log/opinio-review-publisher.log
/root/.local/bin/hermes cron runs JOB_ID --limit 10
/root/.local/bin/hermes cron status
```

Queue output excludes review bodies and credentials. Failed rows retain a sanitized `last_error`, `attempt_count`, and `updated_at`.

A controlled `scripts/enqueue-generated-review.ts --publish-after=ISO` enqueue additionally requires `OPINIO_CONTROLLED_PUBLICATION=1` in the environment. Normal generation cannot override scheduling.

Deleting an automated review sets its queue `published_review_id` to null while retaining `published_at` and `status = 'published'`. This records the takedown without enabling a duplicate republication.

## Rollback

Disable both schedulers. No database deletion or rollback migration is required.

Machine 82:

```sh
rm /etc/cron.d/opinio-review-publisher
```

Machine 38:

```sh
/root/.local/bin/hermes cron pause JOB_ID
```

Queued rows remain unpublished, published reviews remain intact, and re-enabling either scheduler resumes only its own lane. Never run `seed-natural-reviews.ts`, `reseed-realistic-timestamps.ts`, or the portfolio seed as part of installation, recovery, or rollback.
