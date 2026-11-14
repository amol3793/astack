# Eat — product context (L2)

Loaded for the eat repo and its worktrees. This file holds only what the repo's own docs
do not already say. State and the open list live in `BUILD_STATE.md`; rules live in
`AGENTS.md` (the canonical file, `CLAUDE.md` imports it).

```
  Next.js  ->  static export  ->  Cloudflare Worker `easeur-eat`  (eat.easeur.com)
                    |              assets-only, same shape as `easeur-workout`
                    v
             local first: diary in localStorage, photos in IndexedDB
             optional Easeur ID sign-in -> sync to `eat.user_docs` in `easeurweb`
             BYOK Easeur AI in the browser, OpenRouter free models first
```

Live since 2026-11-10. Rewritten 2026-11-14: until then this file said "There is no
repo", which was true on 2026-09-10 and false for two weeks before anyone noticed.

## Standing constraints

- **Eat's data sits in `easeurweb` by an owner-accepted exception** (choice A). The
  spine's rule that personal data stays out of `easeurweb` has this one carve-out. Do
  not "fix" it, and do not use it as a precedent for another app.
- **Invite-only is enforced in the database** (`eat.am_i_invited()` plus RLS). The build
  flag only shows the screen. A change to either is a Supabase write: the owner's call.
- **Deploys are dispatch only** and each one is confirmed by the owner:
  `gh workflow run "Deploy to Cloudflare" -R founder-easeur/eat`.
- `src/deferred/` is the parked server build. `eat-localdb/` exists only for it.

## Verification that actually counts here

`npm run verify:static` checks the built export. A deploy run can be marked failed while
the site is fine (the live check once ran before DNS resolved), so read the run log
before calling a deploy broken.
