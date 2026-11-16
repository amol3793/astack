---
name: new-app
description: Use when starting a new Easeur app or repo — "start a new app", "scaffold Finance", "set up the repo for X". Copies the working skeleton from the newest live app and registers the app everywhere it must appear, so nothing ships without CI, a watch and astack context.
---

# New app

Eat went live on 2026-11-10 with no nightly watch and no astack context, because each
piece was copied by hand and two were forgotten. This is the list, in order.

```
  0 gate  ->  1 shape  ->  2 copy skeleton  ->  3 register  ->  4 GitHub  ->  5 prove it
   idea        static?       from eat +          5 places        owner's       gate green,
   passed      server?       workout             or it rots      steps         context loads
```

Copy from the live apps, never from memory and never from a template stored here. A
template is a second copy, and the second copy is the one that goes stale.

## 0 — gate

- The idea has been through the `product` skill. If not, run it first.
- The app has an entry in `easeur-ecosystem-landing-page/src/data/products.ts`. That
  file is the only public catalogue. Starting a repo does not change its stage.
- Pick the directory name: `D:\work\easeur\<app>\`, lower case, one word.

## 1 — shape

Default to the shape two live apps already prove. Leave it only with a reason.

```
  static export, assets-only Worker     workout, eat      <- default
      no server, local first, optional Easeur ID sync

  OpenNext on a Worker + Hyperdrive     landing page      <- only if it needs a server
```

Data: one Supabase project per blast radius. Personal data (health, photos, money) gets
its own project. Public writes stay in `easeurweb`. New projects ship with RLS on and no
policies; that advisory is the intended state.

## 2 — copy the skeleton

From `eat/` (newest, and itself copied from workout):

```
  AGENTS.md  CLAUDE.md  BUILD_STATE.md  DESIGN.md      rewrite the content, keep the split
  .github/workflows/ci.yml  deploy.yml                 deploy stays workflow_dispatch only
  wrangler.jsonc                                       new Worker name, no `main`
  scripts/verify-static.mjs                            greps the built HTML
  eslint, vitest, playwright, tsconfig, .gitignore
  docs/DEPLOY.md                                       the owner's steps, in order
```

From `workout/` (eat does not have these yet):

```
  .github/workflows/watch.yml + scripts/cf-check.mjs + scripts/providers/
  scripts/test-guard.mjs       + the `test:guard` script
  scripts/lint-baseline.mjs    + `.lint-baseline.json`, starting at 0
```

After copying, grep the new repo for the source app's name, Worker name and domain.
Every hit is either rewritten or a bug.

`BUILD_STATE.md` starts with what is true today: nothing deployed, no users.

## 3 — register the app (five places)

An app missing from any of these works, and is invisible to the next session.

1. `astack/hooks/session-start.cjs`: add `["/easeur/<app>", "<app>"]` to `PRODUCTS`.
2. `astack/context/products/<app>.md`: under 60 lines, only what the repo docs do not say.
3. `astack/skills/ship/SKILL.md` Step 0: one line on what deploying means for this app.
4. `D:\work\easeur\CLAUDE.md`: one row in the apps table. Two lines, then point at
   `BUILD_STATE.md`.
5. `~/.claude/settings.json` `autoMode.environment`: add the repo to the source-control
   line and the domain to the cloud line.

Then `node test/validate.cjs` in astack. It fails if a context file is not registered.

## 4 — GitHub and Cloudflare (the owner's steps)

Say each one and wait. Do not run them unasked.

- Create `founder-easeur/<app>` (private) and push as `amol3793`.
- Repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Without them the
  deploy workflow is inert, which is the safe starting state.
- Turn on Dependabot alerts: `gh api -X PUT repos/founder-easeur/<app>/vulnerability-alerts`.
- The first deploy, the Worker route and the DNS record are Cloudflare writes. Each one
  is described exactly and confirmed before it happens.

## 5 — prove it

```
  npm test, typecheck, lint, build      green locally
  CI run on the first push              green
  new session inside the repo           the product context appears at session start
  Nightly watch, run by hand once       reports, and opens no issue
```

Report with the four-state table from `verify`. "Scaffolded" is not "works".

Before the first public deploy, run the `launch` skill. Add `/privacy` and `/terms`
routes while scaffolding (copy Workout's; Eat has none yet), so that check does not
start from a 404.
