# What was evaluated and left out

Every item here was looked at against the actual usage data, not dismissed on
principle. The measurement: 250 sessions, 691 prompts, two months.

## From ECC (285 skills, 68 agents)

**Left out: all of it.** Nine skill invocations in two months — `ecc:seo` (3),
`ecc:save-session` (3), `ecc:resume-session` (1), `ecc:liquid-glass-design` (1),
`ecc:code-review` (1). Zero of its 68 agents were ever spawned; all 54 Agent calls
went to the native `general-purpose` and `Explore`. Its continuous-learning system
left `~/.claude/skills/learned/` empty for two months.

The listing cost roughly 24,000 tokens per session for that return. Most of the
catalogue has no bearing on a TypeScript/Next.js/Supabase/Cloudflare stack —
HarmonyOS, Perl security, DeFi AMM review, carrier relationship management.

**Kept in spirit:** the SEO capability, folded into future `astack:web` work rather
than carried as a dependency. ECC's GateGuard idea — force investigation before
acting — is a good one; the spine's evidence rules cover the same ground without a
hook that fires on every Bash call.

## From Superpowers (14 skills)

**Kept, by reference not by copy:** `brainstorming`, `writing-plans`,
`executing-plans`, `systematic-debugging`. These are genuinely well built and
actively maintained. astack calls them.

**Left out:** `subagent-driven-development`, `dispatching-parallel-agents`,
`using-git-worktrees` — used once or never, and the Easeur repos are small enough
that parallel agent orchestration is overhead rather than leverage.

## From gstack (53 skills, 1,601 files)

**Absorbed as rules, not code** — nine of the ten best ideas were markdown, portable
with no dependency:

- Claimed limitations need evidence
- Confidence calibration with a pre-emit quote gate
- The decision-brief format, with completeness scores
- Accepted-shortcut markers feeding a debt ledger
- The reuse ladder
- Scope drift detection
- Completeness principle and confusion protocol
- Iron Law: no fix without root cause
- The two-tier destructive-command guard, reimplemented in Node

**Left out:**

- `browse`, `scrape`, `pair-agent` (245 files) — `claude-in-chrome` is already used
  more and needs no Bun.
- All five `ios-*` skills — no iOS product exists.
- `gbrain` and its Supabase memory layer — astack's own three-tier memory is smaller
  and fits the repos that exist.
- `/investigate`, `/spec`, `/review` as whole skills — duplicate Superpowers.
- `autoplan` — runs CEO, design, eng and DX reviews sequentially with auto-decisions.
  Process theatre for a solo founder.
- `benchmark-models`, `codex`, `office-hours`, `landing-report`, `plan-tune` — built
  for a team and a multi-model setup that does not exist here.
- The ~5 KB of identical boilerplate every gstack skill carries.

## Code-graph tooling

`codegraph`, `codebase-memory-mcp` and `Graft` were all explored. None installed —
see `decisions.md` D003. Short version: they solve code-structure memory, benchmark
on repos hundreds of times larger than Easeur's, and two of the three add context
cost while astack exists to cut it.

## Agents

The original brief listed eleven candidate agents. **v1 ships none.**

An agent earns its place only when a separate context window is worth the round
trip. The native `general-purpose` and `Explore` already absorb 54 of 54 real agent
calls. Adding a `product-critic`, `evidence-reviewer` and `researcher` is defensible
later; shipping them before a single measurement would repeat exactly the mistake
that left 68 ECC agents unused.

## Things the brief asked for that v1 does not do

- **A task classifier.** `superpowers:brainstorming` already classifies every
  request as Spike, Bounded or Architectural. A second classifier would compete
  with it.
- **Parallel agent orchestration.** No repo here is big enough to need it.
- **Git worktrees by default.** Warranted for risky refactors, not for this size
  of change. Available natively when wanted.
- **A skill evaluation harness.** Real idea, real cost. Revisit once astack has
  enough skills for evaluation to mean something. Six does not.
- **Observability beyond `bin/token-stats.cjs`.** Structured logs of every agent
  action are a platform, not a starting point.

Each of these is a YAGNI call, not a rejection. The trigger to revisit is written in
`decisions.md`.

## Design repos (reviewed 2026-10-02, see D008)

- **impeccable** — absorbed as rules into `skills/design`; the tool itself is optional.
  Not vendored: it is an engine binary plus a 4 MB browser bundle, pre-1.0, shipping daily.
- **taste-skill** — dials, Design Read and the system map absorbed. The skill itself left
  out: one 87 KB file, and it excludes dashboards and product UI, which most Easeur
  surfaces are.
- **ui-ux-pro-max** — resilience rules absorbed. Generator left out: product type to
  fixed palette and fonts yields the templated output the others exist to avoid.
