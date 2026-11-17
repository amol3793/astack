# astack

Amol's personal engineering operating system for the Easeur ecosystem.
One Claude Code plugin: 16 skills, 6 hooks, 2 agents, layered product context, three kinds of
memory, and a router so you never have to remember a skill name.

```
  before                              after
  --------------------------          --------------------------
  ECC          285 skills             astack        10 skills
               68 agents              superpowers   14 skills
  superpowers   14 skills             --------------------------
  --------------------------          ~24 skills, 0 agents
  ~350 skills, ~90 agents             ~1,000 tokens/session
  ~24,000 tokens/session              ECC kept on disk, disabled,
                                      fully indexed for later
```

Built from measurement, not from a feature list. Across 250 sessions and 691 prompts:
21 distinct skills actually used, ECC's 68 agents never spawned once, and the two rules
that mattered most living only as prose in a CLAUDE.md.

## Install

```bash
bash scripts/remove-gstack.sh                       # clears the old fork
claude plugin marketplace add D:/work/easeur/astack
claude plugin install astack@astack
node test/validate.cjs                              # 196 passed, 0 failed
```

Requires Node. No Bun, no daemon, no build step. Full guide: `docs/getting-started.md`.

## You do not invoke skills — the router does

The biggest practical problem with a skill library is remembering it exists. A
`UserPromptSubmit` hook reads what you type and names the one skill that fits.

```
  "lets do the pending stuff"          ->  where-was-i
  "are you sure that works?"           ->  verify
  "should we add AI recommendations?"  ->  product
  "why is the login broken"            ->  systematic-debugging
  "ok commit this"                     ->  ship
  "lets do the search console setup"   ->  web
  "hi"                                 ->  silence
```

One recommendation, never a menu. Silent unless confident. 20 cases pinned in the test
suite. Patterns come from your own prompt history.

## Skills

| Skill | Use it for |
|---|---|
| `where-was-i` | Where the build is, what is pending, what you decided |
| `verify` | Evidence before "done", plus a manual-test handoff |
| `ship` | Verify, stop for your test, then commit |
| `product` | Challenge an idea before building it; AI-necessity test |
| `review` | Confidence-scored review that suppresses what it cannot quote |
| `web` | SEO, browser pass, visual review |
| `design` | UI and UX work: register, dials, anti-slop floor, and which library to use for what |
| `launch` | Pre-launch checklist: legal, privacy, consent, accessibility, honesty, past lessons |
| `security` | Security and cost-abuse checklist: secrets, prompt injection, rate limits, storage, spend caps |
| `performance` | Speed guidelines for every app, built in from day one, then measured against a budget |
| `scale` | Design for 1M users on free tiers: limits, design rules, capacity sheet, when paying is allowed |
| `audit` | astack checking itself for rot |
| `new-app` | Starting a new Easeur app: skeleton, CI, watch, and the five places it registers |
| `model-routing` | Cheap driver, Haiku scout, Fable advisor at enforced checkpoints; Opus for the judgment skills |
| `caveman` | Terse output mode |
| `caveman-stats` | Real token accounting |

`brainstorming`, `writing-plans`, `executing-plans`, `systematic-debugging`,
`test-driven-development` and `verification-before-completion` stay in superpowers and
are called by name. They are better than a rewrite would be. Details: `docs/skills.md`.

## Hooks — these run whether or not the model remembers

| Hook | Fires on | Does |
|---|---|---|
| `router` | Every prompt | Names the skill that fits |
| `careful` | Bash | Denies Cloudflare writes and force-push to main; asks before destructive commands |
| `commit-gate` | Bash | Asks before every commit and push — your manual-test rule, enforced |
| `secret-scan` | Write, Edit | Asks before writing anything that looks like a credential |
| `session-start` | Session start | Loads the spine plus this repo's product context |
| `routing-gate` | Write, Edit, Stop, shell failures | Once `model-routing` is invoked: advisor before a 4th file, advisor review before finishing, escalation after 3 failures |

Every one has an off switch: `ASTACK_ROUTER=off`, `ASTACK_CAREFUL=off`,
`ASTACK_COMMIT_GATE=off`, `ASTACK_SECRET_SCAN=off`, `ASTACK_ROUTING=off`. Details:
`docs/hooks.md`.

## Agents

Two, both read-only, both pinned to a model so the routing cannot drift.

| Agent | Model | Use |
|---|---|---|
| `advisor` | Fable | Approves a plan, reviews a diff, unblocks a stuck driver. Short brief in, verdict out. |
| `scout` | Haiku | Sweeps many files or a long log and returns the conclusion with `file:line` pointers |

`review`, `security`, `scale`, `launch` and `product` pin `model: opus` in their
frontmatter. Everything else runs on the session model, which should be Sonnet.

## Context, layered

```
  context/spine.md              always      ~90 lines
  context/products/<repo>.md    in-repo     ~60 lines
  ~/.astack/lessons.md          always      grows slowly, pruned
```

Nothing else loads until a skill asks. `D:\work\easeur\CLAUDE.md` stays the authority
on the app map; astack points at it and never copies it.

Product files carry facts verified against the repos, not repeated from notes — the
exact test commands, the real data paths, and traps like the Wear prototype living at
`wear/UI-areana-ai/` rather than `wear/src/`.

## Memory

```
  BUILD_STATE.md              where the build is         per repo
  .astack/decisions.md        why, and what reopens it   per repo, append-only
  ~/.astack/lessons.md        do not try that again      global
```

See `memory/README.md`. Code-structure memory is deliberately not built — see
`docs/architecture/decisions.md` D003.

## ECC is disabled, not deleted

ECC stays installed at `~/.claude/plugins/marketplaces/ecc` and switched off. Disabled
costs zero session tokens. All 68 agents and 285 skills are indexed with descriptions
in `docs/reference/ecc-catalogue.md`, so nothing is lost and anything worth having can
be pulled in later.

Its `chrome-devtools` MCP server — 283 tool calls in two months — is preserved
separately in astack's `.mcp.json` and keeps working.

```bash
node scripts/gen-ecc-catalogue.cjs   # regenerate after an ECC update
```

## Testing

```bash
node test/validate.cjs
```

196 checks: manifests, skill frontmatter, hook wiring, hook behaviour against real
command strings, and router accuracy on real prompts. The suite has already caught
three bugs — `--force-with-lease` flagged as a force-push, and two router
misclassifications.

## Docs

- `docs/getting-started.md` — install, first run, escape hatches
- `docs/skills.md` — every skill, and what is deliberately not duplicated
- `docs/hooks.md` — what each hook enforces and how to add one
- `docs/architecture/overview.md` — the shape and why
- `docs/architecture/decisions.md` — chosen, rejected, and what reopens it
- `docs/architecture/not-included.md` — everything evaluated and excluded
- `docs/reference/ecc-catalogue.md` — the full ECC index
- `memory/README.md` — the three-tier memory model

## History

This repo was a fork of [garrytan/gstack](https://github.com/garrytan/gstack), preserved
on the `gstack-upstream-v1.84.1` branch and on `upstream/main`. Nine of its best ideas
live on in `context/spine.md`, `skills/review/SKILL.md` and `hooks/careful.cjs`.
`docs/architecture/not-included.md` says what was left behind and why.
