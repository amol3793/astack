# Hooks

A hook is the only place a rule actually holds. Everything here runs whether or not
the model remembers it, and costs zero context.

```
  SessionStart       session-start.cjs   spine + this repo's product context
  UserPromptSubmit   router.cjs          names the skill you probably want
  PreToolUse Bash    careful.cjs         destructive commands, Cloudflare writes
  PreToolUse Bash    commit-gate.cjs     nothing commits before your manual test
  PreToolUse Write   secret-scan.cjs     no credentials into tracked files
       + Edit
```

## `session-start.cjs`

Reads the working directory and loads, in order:

1. `context/spine.md` — always, ~90 lines
2. `context/products/<repo>.md` — only when you are in that repo
3. `~/.astack/lessons.md` — if it exists and is non-empty

That is the whole context-layer mechanism. Nothing else loads until a skill asks for it.

## `router.cjs` — the one that means you can forget

Fires on every prompt you type. Scores it against patterns drawn from two months of
your real prompts, and if one skill clears the threshold, injects a single line naming
it.

Three design rules, each learned from watching 350 skills go unused:

- **One recommendation, never a menu.** A menu is what astack exists to escape.
- **Silence unless the score clears 3.** A router that fires on everything gets
  ignored exactly the way a 285-skill listing does.
- **Never fires when you already named a skill**, or on a prompt under 12 characters.

21 routing cases and 7 silence cases are pinned in `test/validate.cjs`, including
prompts taken verbatim from your own transcripts — typos and elliptical phrasing
included, because that is how you actually type. When the router gets something wrong,
fix the weight and add the case. Accuracy that is not tested is not accuracy.

Measured against 12 real prompts from your history: 12/12 — it fired when a skill
helped, and stayed silent when none did.

```bash
echo '{"prompt":"lets do the pending stuff"}' | node hooks/router.cjs
```

## `careful.cjs`

Two tiers.

**HIGH — denied outright:**

```
  recursive removal of /, ~, or $HOME
  wrangler deploy / publish / delete / secret put / kv / r2 / d1 execute
  force-push aimed at main or master
```

The Cloudflare rule is the important one. Your standing instruction is that Cloudflare
is read-only unless you have confirmed that specific change. As prose in a CLAUDE.md
that held only as long as the model remembered it. As a hook, it holds.

**MEDIUM — asks first:** SQL `DROP`, `TRUNCATE`,
`DELETE` with no `WHERE`, force-push, `git reset --hard`, `git checkout .`,
`git clean -fd`, `kubectl delete`, Docker prune, `supabase db reset`. Plus any DDL
naming `easeurhealth` or `easeurwear`, which hold personal data.

**Removal is judged one segment at a time.** A compound command is split on `;`, `&&`,
`||` and `|` first, and only the segments that actually run `rm` are examined. Without
that, an absolute path in a `sed` argument condemns a one-file cleanup at the end of the
same line.

```
  rm -rf <dir>              ask, unless it is a build artefact
  rm -f <one named file>    allow  -- the common temp-file cleanup
  rm -f *.log               ask    -- a glob reaches further than it names
  rm -f ~/.ssh/id_rsa       ask    -- outside the working tree
  rm -rf / or ~             deny   -- HIGH tier
```

Never flagged: `node_modules`, `.next`, `dist`, `build`, `out`, `coverage` and friends —
the next build regenerates them. Also never flagged: `--force-with-lease`, and plain
`rm -f` on files it names outright. Both are safe, and asking about a safe thing every
time trains the reflex to click through the warning, which is how a real one gets missed.

**Honest limit.** Compound commands containing `;`, `&&`, `||` or `|` fall through to
the MEDIUM tier on purpose. Which repository a chained command targets is not something
a regular expression knows. This is an advisory guard, not a security boundary.

## `commit-gate.cjs`

Asks before every commit and push, quoting your own rule back: nothing is committed
until your manual test passed, or you explicitly asked to commit.

It asks — it never decides. `--dry-run` passes through untouched, and no other git
command is affected.

## `secret-scan.cjs`

Scans `Write` and `Edit` content for private key blocks, AWS access key ids, GitHub
tokens, `sk-` API keys, JWTs, Postgres URLs with an inline password, and Supabase or
Cloudflare secrets.

It asks rather than denies — a false positive should cost one keystroke, not block
real work. `.env.example`, `.sample` and `.template` files are skipped, since example
credentials are the entire point of those files.

## `routing-gate.cjs`

Enforces the `model-routing` skill's checkpoints. Inert until a session is armed, which
happens when the skill is invoked (`PreToolUse` on `Skill`) or its first step runs
`node hooks/routing-gate.cjs arm <session_id>`. One script, five events:

| Event | What it does once armed |
|---|---|
| `PreToolUse` `Write\|Edit` | Denies a 4th distinct file until an `advisor` agent has finished |
| `SubagentStop` | An agent whose type ends in `advisor` opens the gate and resets the counters |
| `Stop` | Blocks once when 3 or more files changed since the advisor last looked |
| `PostToolUseFailure` `Bash\|PowerShell` | On the 3rd failure in a row, tells the model to stop retrying and escalate |
| `PostToolUse` `Bash\|PowerShell` | A success resets the failure count |

Only the main session is gated: a call that carries `agent_id` comes from a subagent and
passes. Scratch files under the OS temp directory and anything under `.claude/` do not
count. The three numbers live in `skills/model-routing/routing.json`. State is one JSON
file per session in `<tmp>/astack-routing/`.

It cannot see or change the session model, and the `Stop` block fires once per stop: a
model that ignores the feedback gets through on the second attempt. The plan gate is the
hard one.

## Escape hatches

```bash
ASTACK_ROUTING=off
ASTACK_CAREFUL=off
ASTACK_COMMIT_GATE=off
ASTACK_SECRET_SCAN=off
ASTACK_ROUTER=off
```

Prefix a single command rather than exporting for the session. Reaching for one of
these often means the hook's pattern is wrong — fix the pattern instead of living with
the workaround.

## Adding a hook

1. Write `hooks/<name>.cjs` using `readInput()` and `decide()` from `lib.cjs`.
2. Register it in `hooks/hooks.json`. `UserPromptSubmit`, `Notification`, `Stop` and
   `SubagentStop` take **no** matcher; the others do.
3. Add behaviour cases to `test/validate.cjs`. A hook without tests is a hook that
   will one day silently stop firing and nobody will notice.
4. `node test/validate.cjs`.

A `PreToolUse` decision must be nested under `hookSpecificOutput`. A top-level
`permissionDecision` is ignored by Claude Code — this is the single most common way a
hook ends up doing nothing at all.

## Valid hook events

`SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PostToolUse`,
`PostToolUseFailure`, `Notification`, `SubagentStart`, `Stop`, `SubagentStop`,
`PreCompact`, `InstructionsLoaded`, `TeammateIdle`, `TaskCompleted`.
