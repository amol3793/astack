# Skills

Ten in astack. Six more are called by name from superpowers and are not duplicated.

```
  WHERE AM I            where-was-i      state, from the records not from memory
  SHOULD WE BUILD IT    product          challenge, MVP split, AI necessity
  IS IT RIGHT           review           confidence-scored, quote-gated
  DOES IT WORK          verify           evidence table + manual-test handoff
  HOW DOES IT LOOK      web              SEO, browser pass, visual review
  HOW SHOULD IT LOOK    design           read, dials, anti-slop floor, critique
  CAN IT GO OUT         ship             verify, stop for your test, then commit
  IS ASTACK OK          audit            stale facts, dead skills, router accuracy
  READ IT FASTER        caveman          terse mode
  WHAT DID IT COST      caveman-stats    real token accounting
```

## astack's own

### `where-was-i`
Answers "where was I / what's done / what's pending" from `BUILD_STATE.md`, trackers,
git and CI — never from source files or memory. Writes `docs/STATUS.md` with an
addressable id per open item, and never commits it. Your most-invoked skill; moved in
unchanged because it was already right.

### `verify`
Splits every claim into **Implemented / Verified / Not verified / Limitations**, then
produces a manual-test handoff naming the exact command, URL, action and expected
result. Complements `superpowers:verification-before-completion`, which owns the
general no-claim-without-evidence gate.

### `ship`
Runs verify, checks scope drift, **stops** for your manual test, then commits in
bisectable chunks with `BUILD_STATE.md` updated in the same commit. Knows that pushing
and deploying are different things on the landing page.

### `product`
Refuses to agree by default. Problem before solution, then the AI-necessity test:
could deterministic logic do this, what happens when the model is wrong, can it
degrade gracefully, what is the latency and cost budget. Ends in a
must/nice/future/experimental split written to `.astack/decisions.md`.

### `review`
Every finding carries a confidence score 1-10. The gate that matters: **if you cannot
quote the line that motivates a finding, it is forced to confidence 4 and suppressed
from the report.** That kills the "this field doesn't exist" false-positive class that
framework-generated symbols cause — Drizzle inference, Next.js route exports,
generated Supabase types.

### `web`
Three modes: SEO, browser pass, visual review. Replaces the removed `ecc:seo`. Prefers
`claude-in-chrome` over `chrome-devtools` MCP, and never triggers a JavaScript dialog,
which would freeze the extension for the rest of the session.

### `design`
Four moves: read the surface (register, audience, quiet constraints), build from three
dials (variance, motion, density), critique worst-first against an eight-level list, and
extract tokens into `DESIGN.md`. Absorbs ideas from impeccable, taste-skill and
ui-ux-pro-max as rules (`D008`); impeccable is optional and installed deliberately, since
it downloads an engine binary and can install hooks. Hands the browser pass to `web`.

### `audit`
astack checking itself. Stale facts in context files, skills nobody invokes, router
accuracy against real prompts, context budget, upstream renames. Run monthly.

### `caveman` / `caveman-stats`
Terse output mode, and real token accounting read from the session transcript.
`caveman-stats` was broken before astack: it called two hook files that did not exist
anywhere on disk, so `/caveman-stats` silently did nothing. It now runs
`bin/token-stats.cjs`.

## Called, not copied

These stay in superpowers. They are good, actively maintained, and rewriting them
would trade quality for a tidier namespace.

| Skill | Used for |
|---|---|
| `superpowers:brainstorming` | Intent and design before implementation. Also astack's task classifier — its Spike / Bounded / Architectural split is the adaptive-depth mechanism, so astack does not ship a second one. |
| `superpowers:writing-plans` | Turning an approved design into a written plan |
| `superpowers:executing-plans` | Working through that plan with checkpoints |
| `superpowers:systematic-debugging` | Root cause before fix |
| `superpowers:test-driven-development` | Failing test first |
| `superpowers:verification-before-completion` | The general evidence gate |

If superpowers is ever removed, the router will name skills that do not exist.
`/audit` step 6 checks for exactly that.

## Built-in, always available

These ship with Claude Code and survive every plugin change, so astack does not
duplicate any of them: `/code-review`, `artifact-design`, `artifact-diagramming`,
`dataviz`, `claude-in-chrome`, `run`, `claude-api`, `security-review`, `simplify`,
`init`, `update-config`, `loop`, `schedule`.

## Adding a skill

1. `skills/<name>/SKILL.md` with frontmatter `name` matching the directory, and a
   `description` written as *when to use this*, not *what this is*. The description is
   what makes Claude Code auto-invoke it.
2. Add a routing rule in `hooks/router.cjs` if you want it recommended proactively.
3. Add its routing case to `test/validate.cjs`.
4. `node test/validate.cjs`.

Before writing one, check `docs/reference/ecc-catalogue.md` — 285 skills are indexed
there and one of them may already do it.
