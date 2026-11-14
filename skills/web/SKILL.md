---
name: web
description: Use for anything about the running site — SEO, sitemap, meta tags, structured data, Lighthouse, Search Console, a browser pass through a flow, or a visual review. Replaces the removed ecc:seo.
---

# Web

Three modes, one skill. Say which one you are in.

```
  SEO       what search engines see
  BROWSER   what a user's browser does
  VISUAL    what it looks like doing it
```

## Which browser tool

`claude-in-chrome` first. It drives your real Chrome with your logged-in sessions,
and it is what this workspace actually uses. `chrome-devtools` MCP is the fallback
for traces, Lighthouse and network inspection.

Never trigger a JavaScript dialog — `alert`, `confirm`, `prompt`. They block the
extension and the session stops responding.

## SEO mode

Check in this order. Stop at the first thing that is actually broken; there is no
point tuning meta descriptions on a page that is not indexable.

```
  1  robots.txt         is anything blocked that should not be
  2  sitemap.xml        present, current lastmod, submitted
  3  canonical          one per page, self-referencing, absolute
  4  indexability       no stray noindex, no redirect chain
  5  title + meta       unique per page, under the truncation limit
  6  structured data    valid JSON-LD, matches the visible content
  7  headings           one h1, real hierarchy
  8  Core Web Vitals    LCP, CLS, INP
```

For the landing page, `src/data/products.ts` drives the sitemap, structured data and
`/llms.txt`. An SEO change that belongs in the catalogue goes there, not into a
template. Only `visibleProducts` appears anywhere — a hidden app contributes to no
figure, and that is intended.

For `workout`, sitemap `lastmod` comes from git history. Hub pages cite their evidence.
Both were deliberate; do not "simplify" them away.

**Structured data must match what the page shows.** Marking up a rating that is not
visible is a manual action risk, not a clever trick.

## Browser mode

Drive the real flow, not a description of it.

```
  1  start the dev server, note the URL
  2  walk the flow a user would walk
  3  read the console at each step
  4  read the network panel for failed requests
  5  screenshot the end state
```

Report what you saw, not what should have happened. A flow that works in three of four
steps is a broken flow.

## Visual mode

Look for the things that read as unfinished:

- inconsistent spacing on the same kind of element
- a heading hierarchy that does not match visual weight
- interactive elements with no hover, focus or disabled state
- focus rings removed without a replacement
- layout at 400px wide, not just at desktop
- contrast on muted text
- both light and dark theme, if the page supports both

For `workout`, the deployed build is a static export. What you see locally is not
proof of what production serves — check the deployed Worker version too.

## Report

Findings worst first, each with the file that owns it. If a fix is one line, say the
line. If it needs a decision, say what the options cost.
