---
name: performance
description: Use when scaffolding a new Easeur app or building a new page, list, search, upload or AI feature in any app, before launch, and when Amol says "performance", "feels slow", "slow to load", "page speed", "bundle size", "loading state" or "speed check". Gives the build-time performance guidelines every Easeur product follows, then measures the app against a budget and reports each item with evidence.
---

# Performance

Slow apps lose users before any feature gets a chance. Two modes, one list.

```
  BUILD   starting an app or a feature     read the sections whose trigger fires,
                                           build to them from the first commit
  CHECK   before launch, or "it is slow"   measure first (section F), then walk the
                                           list and report
```

Every item ends in one of four states, with evidence.

```
  PASS      checked now, evidence quoted (measurement, header, file:line, query plan)
  FAIL      the trigger fires and the guideline is not met
  N/A       the trigger is absent. Say which fact in the code makes it so.
  ACCEPTED  Amol accepted the gap. Cite the D-entry in BUILD_STATE.md.
```

Rules:

- **Measure before you fix.** In CHECK mode run section F first. A FAIL on a page that
  is inside the budget is debt, ranked by its measured cost. A FAIL on a page over the
  budget blocks launch.
- **Never add infrastructure to turn a row green.** A static export needs no Redis, no
  queue, no load balancer and no tracing backend. Those rows are N/A until their
  trigger fires, and "we might need it later" is not a trigger.
- Never mark PASS from memory or from the framework's reputation. "Next does that by
  default" is checked in the built output and the response headers.
- Load and stress probes run on a local or preview build, never production.
- For traces, Lighthouse runs and network waterfalls use the chrome-devtools MCP; the
  `cloudflare:web-perf` skill has the procedure. Load the tools once, before the first probe.

## The budget

Measured on the three pages users hit most, on the mobile preset (slow 4G, 4x CPU
slowdown), from the deployed or locally served production build. Never from `next dev`.

```
  LCP   2.5 s or less      largest content painted
  INP   200 ms or less     slowest interaction answered
  CLS   0.1 or less        layout does not jump
  first-load JS per route  recorded in BUILD_STATE.md; a rise needs a reason
```

## Step 0 — read the triggers

Answer from the code.

```
  P1  server code of its own: a Worker with "main", API routes, edge functions
  P2  a database is queried (Supabase called from the browser counts)
  P3  an AI feature
  P4  a list that can pass about 100 rows
  P5  search or autocomplete
  P6  third-party scripts: analytics, widgets, embeds
  P7  more than one app instance, or a VPS
  P8  a server task that can run longer than about 2 seconds
```

Sections A, B and F always run.

## A — how fast it feels (always)

| # | Guideline | Evidence |
|---|---|---|
| A1 | Skeleton loading screens for every view that waits on data. The skeleton has the size of the real content, so nothing jumps (CLS) | throttle the network, load each view |
| A2 | Update the UI before the server responds (optimistic update), and roll back with a message when the call fails | trigger a write with the network offline |
| A3 | P3: stream AI responses token by token. A spinner for the whole answer is a FAIL | watch a real reply arrive |
| A4 | P5: debounce search and autocomplete inputs, and cancel the stale request | network tab while typing: one request per pause |
| A5 | P4: virtualize long lists. Only the visible rows are in the DOM | DOM node count on the longest list |
| A6 | Prevent unnecessary re-renders: stable keys, memoised heavy children, no new object or function props on every render of a hot list | React Profiler on the slowest interaction |

## B — what ships to the browser (always)

| # | Guideline | Evidence |
|---|---|---|
| B1 | Serve images in WebP or AVIF, sized for the slot they fill | `content-type` of image responses; no image wider than 2x its box |
| B2 | Lazy load images below the screen. The LCP image is the exception: it loads eagerly | `loading` attributes in the built HTML |
| B3 | Self-host fonts and limit font weights to the ones used. `font-display: swap` | no request to a font CDN; count the font files |
| B4 | P6: load third-party scripts after the page, never in the render path | waterfall: none before first paint |
| B5 | Split JavaScript by page. A route does not ship another route's code | build output, first-load JS per route |
| B6 | Remove unused dependencies | `npx depcheck`; bundle analyser for the heaviest ten |
| B7 | Serve static files through a CDN | response headers on a static asset (`cf-cache-status`, `server`) |
| B8 | Enable Brotli (or gzip) compression for text: HTML, JS, CSS, JSON | `curl -H "Accept-Encoding: br" -I`, read `content-encoding` |
| B9 | Enable browser caching for static files: hashed file names with a long `max-age` and `immutable`; HTML revalidates | `cache-control` on a hashed asset and on `/` |
| B10 | Render pages on the server or at build time. Content is in the HTML, not painted by a client fetch | `curl` the page, grep the main heading in the response |

## C — requests (any app that calls an API)

| # | Guideline |
|---|---|
| C1 | Prevent duplicate API calls: one fetch per resource per view, shared through a cache or a request key. Check dev double-effects do not hide a real duplicate |
| C2 | Run independent requests in parallel (`Promise.all`), not one after another |
| C3 | Set timeouts for external API calls, with a visible failure state |
| C4 | Implement pagination for API results. No endpoint or query returns an unbounded list |
| C5 | Cache frequently accessed data. Pick the smallest thing that works: an in-memory or client cache, then the platform's own (Cache API, KV), then Redis only when P1 and P7 both fire |

## D — database (P2)

| # | Guideline | Evidence |
|---|---|---|
| D1 | Fix N+1 queries: a list view runs a fixed number of queries, not one per row | count queries for 1 row and for 50 |
| D2 | Add database indexes for common queries: every `where`, `order by` and foreign key on a hot path | `explain analyze` shows no sequential scan on a large table |
| D3 | Select only the columns you need. No `select *` on a hot path | grep the queries |
| D4 | Use database connection pooling: Hyperdrive or the Supabase pooler from server code. Browser calls through PostgREST are pooled already | the connection string in use |
| D5 | Place servers close to the database: the same region, or a placement hint | region of the DB against region of the server code |

## E — backend (P1, P7, P8)

| # | Guideline |
|---|---|
| E1 | P8: move slow tasks to a background job queue. The request returns at once and the UI shows progress |
| E2 | P1: trace slow backend requests with OpenTelemetry, or the platform's own tracing, so a slow request can be followed to the slow call |
| E3 | P7: load balance traffic across multiple app instances. N/A on Workers: the platform does it |

## F — measure (always, and first in CHECK mode)

| # | Guideline | Evidence |
|---|---|---|
| F1 | Track real user speed with a performance monitoring tool: field LCP, INP and CLS from real visits. On Cloudflare's Free plan use Web Analytics RUM at account scope [dead ends] | the dashboard shows data from the last 7 days |
| F2 | Test on slow phones and networks: the budget above, on the mobile preset, plus one pass on a real low-end phone before launch | Lighthouse numbers per page, saved in the report |

## G — past Easeur lessons (always)

| # | Check |
|---|---|
| G1 | Canvas or scroll jank from images: `fetch -> blob -> createImageBitmap(blob)`. `img.decode()` does not help [dead ends] |
| G2 | `next build` can ship stale CSS from `.next`. Grep the new value in the built CSS before measuring or taking screenshots [dead ends] |
| G3 | A static export has a 20,000-file cap on the Worker. Count `out/` before adding per-item pages or image variants [workout] |
| G4 | Numbers from `next dev` are not numbers. Measure the production build |

When a slow page teaches a new one, add it here in the same change, with its source.

## Report

```
  performance check: <app>, <date>     triggers: P2 P3 P4     build: <sha>

  Budget    /            LCP 1.9 s   INP 140 ms   CLS 0.02    inside
            /train       LCP 3.4 s   INP 310 ms   CLS 0.00    OVER
  FAIL      A5  /train renders 1,394 rows, 41,000 DOM nodes    blocks (page over budget)
            B3  4 font weights shipped, 2 used                  debt
  N/A       E   no server code: assets-only Worker
  PASS      19 of 24, evidence below

  Verdict   OVER BUDGET, 1 blocker     |   WITHIN BUDGET
  Next      <the one fix to start with, and the number it should move>
```

Budget table first, then FAIL rows. Never write WITHIN BUDGET with a page over it.
Every fix names the number it is expected to move, and that number is measured again
after the fix.

**Save it in the same turn.** Write the full report to
`<app>/docs/reviews/<YYYY-MM-DD>-performance-check.md` before answering. On screen show
only the block above plus the path. Do not commit it.
