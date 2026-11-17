---
name: model-routing
argument-hint: "[the task, in plain words]"
description: Token Optimization and Smart Model Routing. Use at the start of a complex or multi-file task, a long session, or when Amol says "model routing", "save tokens", "token optimization", "cheaper model", "lower models", "reduce cost" or "use Opus or Fable only as an advisor". Runs the work on a cheap driver, sends searches to a Haiku scout, keeps the strongest model for short advisor checkpoints, and arms hooks that enforce those checkpoints.
---

# Token Optimization and Smart Model Routing

Spend the expensive model on judgment and the cheap model on everything else. Quality
does not drop: the strong model still approves the plan and reviews the result. It just
stops reading every file and typing every edit.

```
  driver (session model, Sonnet)      does the work: reads, edits, runs tests
     |
     |-- scout    (Haiku, read-only)  sweeps many files, returns the conclusion only
     |-- skills   (Opus, pinned)      review, security, scale, launch, product
     |-- advisor  (Fable, read-only)  approves the plan, reviews the diff, unblocks
```

## Step 1: arm the gates

Run this once. It is safe to run again.

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/routing-gate.cjs" arm ${CLAUDE_SESSION_ID}
```

Then check the session model. If this session runs on Opus or Fable, say so in one line:
"This session is on <model>. `/model sonnet` makes the driver cheap; the advisor stays on
Fable." Carry on either way. The model is the owner's choice.

## Step 2: get the task brief

Routing is only as good as the brief. Five fields decide the score:

```
Goal:      one sentence, what must work at the end
Scope:     repos and folders in play; what must not be touched
Done when: the test, command or screen that proves it
Risky:     schema, auth, payments, production data, or "none"
Unknown:   what is not yet known, or "none"
```

Task text passed with the command:

> $ARGUMENTS

- **No task yet** (the line above is empty and the conversation holds no task): print the
  five-field template above in a code block, say "Fill this in, or just describe the task
  and I will fill it", and stop. Do nothing else this turn.
- **A task in plain words** (above, or in the next message): do not make Amol fill a form.
  Fill the five fields yourself from his words and the repo, mark each guessed value
  `(assumed)`, and show the brief in one block with its score. Ask one question only when
  `Risky` or `Done when` cannot be inferred and a wrong guess would change the route.
  Otherwise start.
- **A brief already in this shape**: score it and start.

Keep the brief. It is the `Goal` line of every advisor call for this task.

## Where the tokens go

Route by what saves the most, not by what sounds frugal. In order:

| Rank | Cost | Lever |
|---|---|---|
| 1 | The main context is re-read on every turn | Keep it small: scout for sweeps, ranges instead of whole files, no re-reads |
| 2 | Input read by an expensive model | The advisor gets a brief of under 400 words, never the conversation |
| 3 | Output tokens | Terse replies (caveman), edits instead of rewrites, no restating of files |
| 4 | Reasoning effort | Low for mechanical work, high only where a wrong answer is costly |
| 5 | Repeated work | One search with the right pattern beats five guesses; batch independent calls |

A subagent starts cold and pays to rebuild context. Delegating a small job costs more
than doing it. Delegate only past the thresholds below.

## Routing table

| Work | Who | Model | Effort |
|---|---|---|---|
| Find where something lives across more than 5 files or 3 searches | `scout` agent | Haiku | low |
| Read a file, log or doc over 500 lines for one fact | `scout` agent | Haiku | low |
| Rename, format, move, boilerplate, docs, comments, simple CRUD | driver | Sonnet | low |
| Feature work inside 1 to 3 files with a clear spec | driver | Sonnet | medium |
| Bulk mechanical edits across many files after the plan is approved | worker agent, `model: haiku` or `sonnet` | as named | low |
| Code review, security, scale, launch, product decision | the astack skill of that name | Opus (pinned in its frontmatter) | high |
| Plan for a task touching more than 3 files, a data model or an API contract | `advisor` agent | Fable | high |
| Final review of a change touching 3 or more files | `advisor` agent | Fable | high |
| Stuck: 3 failures in a row, or two fixes that did not hold | `advisor` agent | Fable | high |

When you spawn a worker with the Agent tool, set `model` and `effort` from this table.
This skill is the instruction that authorises it. Never spawn a worker on Opus or Fable.

## Score the task before starting

Add one point for each that is true:

- touches more than 3 files
- changes a data model, schema, migration, auth, payment or public API
- the request is ambiguous, or two designs are defensible
- a mistake is hard to undo (data loss, production, money, personal data)
- the root cause is unknown (a bug with no reproduction yet)

| Score | Route |
|---|---|
| 0 | Driver alone, low effort. No advisor. Do not arm more process than the task needs. |
| 1 to 2 | Driver, medium effort. Advisor reviews the diff at the end if 3 or more files changed. |
| 3 or more | Advisor approves the plan first, driver executes, advisor reviews the diff. |

Re-score when the task grows. A score that rises mid-task means stop and brief the
advisor before the next edit.

## Context rules

1. Search first, then read the range the search pointed at. Read a whole file only when
   you will edit most of it.
2. Never re-read a file that has not changed since you read or edited it. The harness
   tracks file state; an Edit that failed tells you so.
3. Do not paste file contents, diffs or logs back to the user. Point at `file:line`.
4. Send test and build output through a filter that keeps failures and the summary line.
5. Past about 60 percent of the context window on a long task, write the state to the
   repo's `BUILD_STATE.md` when the task warrants it, then suggest `/compact`.
6. Load a skill or a reference file when the step needs it, not in advance.

## Tool rules

1. Batch independent calls in one message.
2. One precise Grep beats a Glob followed by five Reads.
3. Do not run the full test suite after every edit. Run the test for the file you
   changed; run the full suite once before the final review.
4. Do not poll. Use a background run and wait for the notification.
5. Do not ask the scout a question one Grep answers.

## The quality floor

Saving tokens never justifies any of these. If a rule above conflicts with one, the
floor wins:

- Tests for the changed behaviour are written and run. A skipped test is reported.
- Security-sensitive code (auth, payments, uploads, personal data, AI input) gets the
  `security` skill, on Opus, however small the diff.
- A root cause is named before a fix lands.
- The completion report from the spine is given in full: Implemented, Verified, Not
  verified, Limitations.
- Guard tests that changed are listed, as the owner's rule requires.
- Never drop a requirement to shorten the work. Report `MISSING` instead.

## Escalation ladder

Go up one rung at a time. Say which rung and why.

| Signal | Move |
|---|---|
| The scout's answer is thin or unsure | Driver reads the cited range itself |
| A first attempt failed for a reason you understand | Driver retries once, medium effort |
| Two attempts failed, or you are guessing | Raise effort to high and restate the assumption that may be wrong |
| Three shell failures in a row (the hook will tell you) | Brief the advisor with the exact error text |
| The advisor returns `ASK-USER`, or advisor and driver disagree | Stop and ask Amol with a decision brief |

Going down is allowed too: once the advisor has approved a plan, execution is mechanical
and runs at low or medium effort.

## The advisor brief

Under 400 words. The advisor reads files itself when it needs more.

```
Goal:      one sentence, in the user's terms
Stage:     PLAN | REVIEW | STUCK
Plan:      numbered steps (PLAN), or the path to a saved diff (REVIEW)
Files:     paths, with line ranges where it matters
Verified:  what was run and its result
Open:      the specific questions you need answered
```

For REVIEW, save the diff to the scratchpad (`git diff HEAD > <scratchpad>/review.diff`)
and pass the path. Do not paste the diff into the brief. Apply every `Must fix`, then
continue. One advisor call per checkpoint: do not re-ask to get a different answer.

## Say what you routed

One line when a routing decision matters, nothing when it does not:

```
route: scout (Haiku) for the import sweep, 40+ files, conclusion only
route: advisor (Fable) for the plan, score 3: schema change, 6 files, auth
route: stayed on driver, score 0
```

At the end of an armed task, add to the completion report:

```
Routing    advisor calls: N   scout calls: N   escalations: N
Savings    <what was kept out of the main context, or "none worth naming">
```

For real numbers, run `/astack:caveman-stats` before and after. Name one optimisation
the next session could use, if you saw one. Do not invent a saving you did not measure.

## What is enforced and what is advice

| Rule | Enforced by |
|---|---|
| Advisor and scout run on Fable and Haiku | `agents/advisor.md`, `agents/scout.md` frontmatter |
| Judgment skills run on Opus | `model: opus` in their `SKILL.md` |
| Advisor before a 4th file is edited | `routing-gate` hook, hard deny |
| Advisor review when 3 or more files changed | `routing-gate` hook, blocks the stop once |
| Stop retrying after 3 shell failures | `routing-gate` hook, feedback to the model |
| Everything else in this file | Advice. The model can get it wrong. |

The hook cannot see or change the session model. Starting on Sonnet is the owner's step.

## Thresholds

`routing.json`, next to this file. Whole numbers above zero; anything else falls back to
the default.

| Key | Default | Meaning |
|---|---|---|
| `planGateFiles` | 3 | Distinct files the driver may edit before the advisor must see the plan |
| `reviewGateFiles` | 3 | Files changed since the last advisor call that trigger the final review |
| `escalateAfterFailures` | 3 | Shell failures in a row before the escalation message |

Raise the numbers if the advisor is called too often; lower them for risky repos.
Inspect or reset a session:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/routing-gate.cjs" status ${CLAUDE_SESSION_ID}
node "${CLAUDE_PLUGIN_ROOT}/hooks/routing-gate.cjs" disarm ${CLAUDE_SESSION_ID}
```

`ASTACK_ROUTING=off` turns every gate off.
