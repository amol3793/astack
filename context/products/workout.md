# Workout — product context (L2)

Loaded for the workout repo and its worktrees. This file holds only what the repo's own
`CLAUDE.md` does not already say. State, counts and the open list live in `BUILD_STATE.md`.

```
  Next.js  ->  static export (output: "export")  ->  Cloudflare Worker
                     |                                 easeur-workout
                     |                                 assets-only, no "main"
                     v
              no server, no DB of its own (D63)
              optional Easeur ID accounts -> easeurweb (D145)
              BYOK Easeur AI in the browser (D134), old server AI in src/deferred/
```

## Standing constraints

- **Licence risk is accepted, not unnoticed.** 1,295 of 1,394 demos are Gym Visual media
  with no commercial licence held; Amol keeps them live (2026-09-23). Do not re-raise
  without a new argument. Replacing them with own media is the way out.
- **Stage 4 overclaim is accepted** (landing D048, 2026-09-06). Do not re-raise.
- **No recommendation without a valid source** (owner rule, D123).
- `legacy/` holds the retired build. Do not edit it.

## Verification that actually counts here

Static export means "it builds" proves little. Grep the built HTML in `out/`, check the
deployed Worker version, and count `out/` against the 20,000-file cap. Commands are in
the repo `CLAUDE.md` ("Verify before you claim done"); they are not repeated here.
