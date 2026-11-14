# astack memory model

Four kinds of memory. Three of them are astack's job. The fourth is deliberately
not built yet.

```
  1  CODE STRUCTURE    what calls what, blast radius
     regenerable, ephemeral            NOT BUILT - see docs/architecture/not-included.md

  2  PROJECT STATE     where this build actually is
     <repo>/BUILD_STATE.md             read by /where-was-i, written by /ship

  3  DECISIONS         why a thing is the way it is
     <repo>/.astack/decisions.md       append-only, never rewritten

  4  LESSONS           what not to try again, across repos
     ~/.astack/lessons.md              loaded by session-start, promoted on evidence
```

The ordering is deliberate. Kinds 2, 3 and 4 are where the pain actually was:
`where-was-i` is the most-invoked skill in this workspace, 19% of prompts are
resume-shaped, and `~/.claude/skills/learned/` sat empty for two months under a
continuous-learning system that was supposed to fill it.

## 2 — Project state

`BUILD_STATE.md` already exists in each repo and is the single source of truth for
where a build is. astack does not replace it.

Two rules keep it honest:

- Update it **in the same commit** as the work it describes. A state file that lags
  the code is worse than none.
- Never repeat a claim it makes about deployment or verification without checking it
  against reality. `workout/BUILD_STATE.md` carried "no successful signup verified
  yet" for seven days while two rows sat in the table, because every status pass
  re-read the note instead of querying the table.

## 3 — Decisions

One file per repo, `.astack/decisions.md`, append-only. A decision is written when a
choice closes off an alternative that a future session would otherwise reopen.

```markdown
## D001 — Wear ships as a web app, not Flutter
Date: 2026-08-19
Scope: wear
Status: active            # active | superseded by D0NN | reversed

Decision
  The Next.js web app is v1. Flutter is deferred, not cancelled.

Rejected
  Flutter first — would delay any usable build by months for a product
  with no validated demand yet.

Reopen when
  A native-only capability becomes the blocker, or web install friction
  shows up in real usage data.
```

Four fields carry the weight: what was chosen, what was **rejected**, why, and what
would **reopen** it. A decision without a reopen trigger is a decision that gets
relitigated every few weeks.

**Accepted shortcuts get marked in the code**, not just in the file. When Amol picks
an option that knowingly cuts a corner, stamp it where the corner was cut:

```
// astack-shortcut(D007): happy path only, no retry on 429.
// Upgrade when the API starts rate-limiting us in production.
```

`grep -rn "astack-shortcut"` is then the debt ledger, and it cannot drift from the
code because it lives in it.

## 4 — Lessons

One global file, `~/.astack/lessons.md`, loaded into every session by the
`session-start` hook. This is the "do not try that again" list from the global
`CLAUDE.md` self-learning rule.

A lesson is promoted only when it clears a real bar:

```
  observed twice, or cost more than ~15 minutes once
  it is durable — a platform quirk, a repo trap, a command that does not work here
  it is not already in CLAUDE.md, BUILD_STATE.md, or the code
  it can be written in two lines
```

Format:

```markdown
- **Bun on Windows breaks Playwright's pipe transport** (bun#4253). Node is required
  alongside Bun; the browse server falls back to Node automatically. Learned
  2026-09-13 while evaluating gstack.
```

Anything failing the bar is session context, not a lesson. Do not write it down.
A lessons file that accumulates everything is one nobody reads, which is how the
previous system ended up with an empty directory and no signal.

## What keeps this from rotting

`BUILD_STATE.md` is checked against git and CI on every `/where-was-i` run.
Decisions are append-only, so they cannot be quietly edited into agreement with
the present. Lessons carry a date and get pruned when the platform moves.
