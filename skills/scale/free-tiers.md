# Free-tier limits

Read from the vendors' own pages on **2026-11-17**. Re-check after **2027-05-17**, or
sooner when a number here is about to block or clear a decision. Limits change without
notice; a number in this file is a pointer to the source, never the source.

## Cloudflare Workers (Free plan)

Sources: `developers.cloudflare.com/workers/platform/pricing/` and `/limits/`.

| Thing | Free limit |
|---|---|
| Requests to static assets | free and unlimited |
| Requests that run Worker code | 100,000 per day, resets 00:00 UTC |
| CPU time per request | 10 ms |
| Memory per isolate | 128 MB |
| Subrequests per request | 50 |
| Static asset files per Worker version | 20,000 |
| Static asset file size | 25 MiB each |
| Workers per account | 100 |
| Cron Triggers per account | 5 |
| KV | 100,000 reads/day, 1,000 writes/day, 1 GB stored |
| D1 | 5 million rows read/day, 100,000 rows written/day, 5 GB total |
| R2 | 10 GB stored, 1 million Class A and 10 million Class B requests/month, egress free |
| Durable Objects | 100,000 requests/day, SQLite-backed only |
| Queues | 10,000 operations/day, 24-hour retention |
| Hyperdrive | 100,000 database queries/day |
| Workers Logs | 200,000 events/day, 3-day retention |
| First paid step | Workers Paid, 5 USD per month per account |

## Supabase (Free plan)

Source: `supabase.com/pricing`.

| Thing | Free limit |
|---|---|
| Auth monthly active users | 50,000 |
| Database size | 500 MB per project |
| Egress | 5 GB per month, plus 5 GB cached |
| File storage | 1 GB, 50 MB per upload |
| Edge Function invocations | 500,000 per month |
| Realtime | 200 concurrent connections, 2 million messages per month |
| Active free projects | 2 |
| Inactivity | a free project is paused after 1 week without activity |
| Backups | none |
| First paid step | Pro, from 25 USD per month: 100,000 MAU, 8 GB disk, 250 GB egress, daily backups, no pausing |

## GitHub (Free plan)

Source: `docs.github.com/en/billing/concepts/product-billing/github-actions`.

| Thing | Free limit |
|---|---|
| Actions on public repositories | free on standard runners |
| Actions on private repositories | 12 USD of included usage per month: about 2,000 Linux minutes at 0.006 USD per minute |
| Windows and macOS runners | 0.010 and 0.062 USD per minute, so the same allowance buys about 1,200 or 190 minutes |
| Artifact and Packages storage | 500 MB, shared |

## Not read yet

Mark a row that depends on one of these "Not verified" until it is looked up, then add
it above with its source and date.

- Whether the 100,000 requests per day is counted per account or per Worker.
- Whether "2 active free projects" is counted per organisation or per user. Easeur has
  three projects (`easeurhealth`, `easeurweb`, `easeurwear`): confirm how they fit.
- Supabase Auth email sending limits, and any email or SMS vendor.
- Cloudflare Web Analytics, Turnstile, Images and Email Routing.
- OpenRouter free-model rate limits (BYOK, so the user's limit, not Easeur's).
