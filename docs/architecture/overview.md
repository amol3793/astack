# astack architecture

astack is one Claude Code plugin. It replaces a 350-skill install with roughly twenty
skills, and it enforces two rules that were previously only written down.

```
                    YOU TYPE A PROMPT
                            |
                      router.cjs
              scores it, names ONE skill, or stays silent
                            |
                      SESSION START
                            |
              session-start.cjs reads cwd
                            |
        +-------------------+-------------------+
        |                                       |
   context/spine.md                    context/products/<repo>.md
   always, ~80 lines                   only when that repo is cwd
        |                                       |
        +-------------------+-------------------+
                            |
                  ~/.astack/lessons.md
                  cross-repo, if any
                            |
                      SESSION CONTEXT
                            |
   +--------+--------+--------+--------+--------+--------+
   |        |        |        |        |        |        |
 where-   product  verify   review    web     ship    audit
 was-i    critique evidence quote-   seo +    gate    self-
 state             + hand-  gated    browser          check
                   off
        |         |         |         |
        +---------+---------+---------+
                            |
              superpowers:brainstorming
              superpowers:writing-plans      <- called, not copied
                            |
                       PreToolUse
                            |
        +-------------------+-------------------+
        |                   |                   |
   careful.cjs        commit-gate.cjs     secret-scan.cjs
   destructive        never commit        no credentials
   + Cloudflare       untested work       in tracked files
```

## Why this shape

**The problem was never missing capability.** Measured across 250 sessions and 691
prompts over two months: 55 skill invocations, 21 distinct skills. ECC contributed
285 skills and 68 agents; nine invocations came back and zero agents were ever
spawned. The menu cost roughly 24,000 tokens of context every session.

The real gaps were elsewhere, and the logs say where:

- **State recovery.** `where-was-i` is the single most-invoked skill. 19% of prompts
  are resume-shaped — "lets do the pending stuff", "whats the status".
- **Evidence.** 24% of prompts push back on a claim: "did you check", "are you sure".
- **Enforcement.** Two standing rules — never commit before a manual test, never
  write Cloudflare unsolicited — existed only as prose in a CLAUDE.md, which means
  they held only as long as the model remembered them.

astack is built against those three, not against a feature list.

## Layers, and what each costs

| Layer | Loaded | Cost |
|---|---|---|
| Spine | Every session | ~80 lines |
| Product context | Only in that repo | ~40 lines |
| Lessons | Every session, if non-empty | grows slowly, pruned |
| Skills | On invocation | name + description only until used |
| Hooks | Per tool call | no context cost at all |

Hooks are the cheapest place to put a rule and the only place a rule actually holds.
Anything that must **always** happen goes in a hook. Anything that needs judgment
goes in a skill. Nothing important goes in prose alone.

## What astack deliberately does not own

`superpowers:brainstorming` and `superpowers:writing-plans` stay in superpowers and
are called by name. They are better than a fresh rewrite would be, and copying them
would mean maintaining a fork of someone else's actively developed work for no gain.
This is the reuse ladder from the spine, applied to astack itself.

See `not-included.md` for everything else that was evaluated and left out.
