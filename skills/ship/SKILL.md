---
name: ship
description: Use when asked to ship, deploy, commit, push, merge, or create a PR in an Easeur repo. Runs verification, stops for Amol's manual test, then commits. Never commits before he confirms.
---

# Ship

The gate, not the gas pedal.

```
  verify  ->  STOP: Amol tests by hand  ->  scope check  ->  commit  ->  push
     |                    |                                              |
  evidence            his call,                                     never to a
   table              not yours                                   deploy by itself
```

## Step 0 — know what deploying means here

Deploy is **not** the same as push in this workspace. Check which repo you are in.

```
  landing page   push to main ships NOTHING. Deploys are workflow_dispatch only,
                 hand-dispatched. Nightly watch is the only production alerting.
  workout        assets-only Cloudflare Worker. Deploying is a Cloudflare write,
                 which needs Amol's explicit confirmation of that specific change.
  eat            same shape as workout (assets-only Worker `easeur-eat`). Dispatch
                 only, each deploy confirmed by Amol.
  wear           nothing is deployed. Host is still undecided on purpose.
```

Never run `wrangler deploy` or any Cloudflare write on your own initiative. The
`careful` hook blocks it, and the hook is the backstop, not the rule. The rule is: read
Cloudflare freely, change nothing without Amol confirming that exact change.

## Step 1 — verify first

Run the `verify` skill. Produce its four-state table. If anything sits in **Not
verified** that the change depends on, fix that before going further, or say plainly
that you are shipping with it unverified and why.

## Step 2 — scope check

Compare stated intent against what the diff actually does.

```bash
git log origin/<base>..HEAD --oneline
git diff $(git merge-base origin/<base> HEAD) --stat
```

Report one line:

```
  Scope: CLEAN | DRIFT | MISSING
  Intent:    <what was asked>
  Delivered: <what the diff does>
```

`DRIFT` means files changed that nobody asked for — the "while I was in there" class.
`MISSING` means a stated requirement is not in the diff. Both are informational; they
do not block. They do get said out loud.

D79 shipped the SEO batch bundled with D78's export change because both sat on `main`
and the branch is what deploys. That is what this step exists to surface.

## Step 3 — STOP

Hand Amol the manual test from the `verify` skill and stop. Do not commit.

His standing rule: never `git commit` or `git push` until he has confirmed his own
manual test passed, or has explicitly asked to commit. The `commit-gate` hook will ask
before either command runs. Do not try to route around it.

Wait. When he says it passed, or says commit, continue.

## Step 4 — commit

- Bisectable chunks. One logical change per commit, not one giant blob.
- Update `BUILD_STATE.md` **in the same commit** as the work it describes. A state file
  that lags the code is worse than none.
- If a decision was made along the way, add it to `BUILD_STATE.md` as a D-entry: id,
  date, the alternatives rejected, and what would reopen it.
- If something was tried twice and failed, or cost more than about 15 minutes, add one
  line to the dead-ends list in `~/.claude/CLAUDE.md` and the full entry to
  `~/.claude/references/dead-ends.md`. That list is the only lessons file.
- First public deploy of an app, or a change that adds sign-in, payments, marketing
  email, AI output or a new kind of personal data: run the `launch` skill first. A FAIL
  there blocks the deploy.
- If Amol accepted a shortcut, mark it in the code where the corner was cut:
  `astack-shortcut(<decision-id>): <what is missing>, upgrade when <trigger>`.

Commit message ends with the attribution lines the session specifies.

## Step 5 — push, and say what did not happen

After pushing, state plainly what is now live and what is not. On the landing page,
"pushed" and "deployed" are different sentences. Say which one is true.
