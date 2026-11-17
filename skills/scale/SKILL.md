---
name: scale
description: Use before designing or building anything that adds a table, an endpoint, server code, a scheduled job, uploads, a realtime feature or a new vendor to an Easeur app, and when Amol says "scalability", "scale", "1M users", "million users", "free tier", "paid plan", "upgrade the plan", "capacity" or "how many users can this handle". Checks the design scales from 0 to 1M users without a rewrite and stays on free tiers until there is revenue.
---

# Scale

Two rules, held together.

```
  1  Design for 1M users.     Going from 0 to 1M changes a plan or a config,
                              never the architecture.
  2  Pay for none of them yet. Cloudflare, Supabase and GitHub stay on free tiers
                              until the app has paying users. Revenue pays for infra.
```

Neither rule excuses the other. "It is free" does not justify a design that needs a
rewrite at 50,000 users. "It scales" does not justify a paid service with no users.

## What free tiers really carry

Say this plainly, because the two rules meet here. Numbers are in `free-tiers.md`
(next to this file), with sources and a re-check date. Read it before quoting a limit.

```
  unlimited      visitors and local-first users of a static export
                 (requests to static assets are free and unlimited)
  about 50,000   signed-in monthly users per Supabase project (Auth MAU)
  100,000/day    requests that run Worker code (SSR, API routes)
  500 MB         database per project  = 10 KB per user at 50,000 users
                                       = 500 bytes per user at 1M users
```

So: an app reaches 1M users on free tiers only for what runs on the device and from
static files. Signed-in sync tops out near 50,000 monthly users, and that is the planned
moment to pay: by then the app has revenue or the plan is wrong. The design job is to
make that step a billing change (Pro is from 25 USD a month), not a migration.

## The default shape

Start here. Each step away from it needs a reason written down.

```
  static export  ->  Cloudflare Worker, assets only     no request limit
  the user's data  ->  on the device first              no server cost per user
  optional sign-in  ->  browser talks to Supabase       no Worker requests spent
                        under RLS, small sync documents
  AI  ->  BYOK in the browser                           no per-call cost to Easeur
```

## Design rules

| # | Rule | Why |
|---|---|---|
| R1 | Static first. A page is built ahead of time unless it cannot be | static asset requests are free and unlimited; Worker code has 100,000 a day |
| R2 | Local first. The device is the primary store; the server holds what must sync | per-user server cost stays near zero |
| R3 | Compute on the device or at build time, not per request | 10 ms CPU per request on the free plan |
| R4 | Every server-stored thing has a per-user byte budget, written next to the schema | 500 MB per project |
| R5 | Nothing unbounded: every query is paginated and indexed, every per-user collection has a cap | one heavy user must not spend the shared budget |
| R6 | Large files stay off Supabase Storage. Ship them as static assets, keep them on the device, or use R2 | 1 GB storage and 5 GB egress on Supabase; R2 egress is free |
| R7 | No realtime channel by default. Sync on open and on change | 200 concurrent connections |
| R8 | Stateless server code: no in-memory session, nothing that assumes one instance | Workers run many isolates |
| R9 | One module per vendor (as `identity.ts` and `selectStore()` do in Workout). Call sites never import a vendor SDK directly | a tier or vendor change touches one file |
| R10 | The paid step is a plan change. If moving to the paid tier needs code, the design is wrong now | rule 1 |
| R11 | Keep heavy CI off private-repo Windows and macOS runners | about 2,000 Linux minutes a month, fewer on other runners |
| R12 | Watch the ceilings. Usage against each limit is read on a schedule, and 70% of any limit is reported | a daily cap fails at 00:00 UTC, not gracefully |

## What free costs in quality, and the free fix

Staying free must not lower quality. These are the real gaps; each has a fix that costs
nothing. A gap with no fix listed is a reason to raise the paid question.

| Gap on the free tier | Free mitigation |
|---|---|
| Supabase has no backups | a scheduled export to a private store, restored once as a test |
| A Supabase project pauses after 1 week without activity | a scheduled read (the nightly watch) keeps it active |
| Worker code stops at 100,000 requests a day | keep pages static and send data calls from the browser to Supabase |
| 10 ms CPU per request | no heavy work in a Worker; do it in the browser or at build time |
| Logs kept 3 days | the nightly watch records what matters to the repo |

## The capacity sheet

Fill this for the feature before building it. Estimates are labelled as estimates.

```
  feature: <name>                         per user          1k      50k      1M users
  Worker-code requests per day            <n>               ...     ...      ...     limit 100,000/day
  rows and bytes stored                   <n> rows, <b> B   ...     ...      ...     limit 500 MB
  egress per month                        <b>               ...     ...      ...     limit 5 GB
  files stored                            <b>               ...     ...      ...     limit 1 GB
  signed-in monthly users                 1                 ...     ...      ...     limit 50,000

  first wall     <which limit>, at about <N> users
  on free until  <N> users
  to pass it     <plan change and its monthly cost>, or <design change that moves the wall>
```

A design whose first wall is below 10,000 users goes back for a design change before
any code. A wall that a design change can move is moved by design, not by paying.

## When a paid tier is allowed

Only when all four are true. Record it as a D-entry in `BUILD_STATE.md`.

```
  1  a free limit is measured as hit or about to be, with the number   (not predicted)
  2  the free mitigations and the design rules above were tried first
  3  the app has paying users, and their revenue covers the monthly cost
  4  Amol confirms that specific plan change
```

Two exceptions skip condition 3, and both still need Amol's confirmation: a security
problem that only a paid feature fixes, and a risk of losing user data. Any plan change
on Cloudflare or Supabase is a write: describe it exactly and wait.

Never propose a paid plan, a paid add-on or a new paid vendor as the first answer to a
limit. The first answer is a design change.

## Report

```
  scale check: <feature or app>, <date>

  Shape        static + local first + browser to Supabase     |   departs at: <where, why>
  First wall   Supabase Auth 50,000 MAU, at about 50,000 signed-in users
  Free until   about 50,000 signed-in users; visitors unlimited
  1M path      Supabase Pro (plan change, from 25 USD/month); no code change
  Rules        R4 FAIL  no byte budget on eat.user_docs
               R6 PASS  photos stay in IndexedDB
  Verdict      SCALES ON FREE   |   REDESIGN: <the wall and the rule that moves it>
```

Never write SCALES ON FREE with a wall below 10,000 users or a rule FAIL that moves the
first wall. A limit quoted in a verdict was read from `free-tiers.md` in this session,
or from the vendor's page when the file is past its re-check date.
