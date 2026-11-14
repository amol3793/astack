---
name: verify
description: Use before claiming any work is finished, and whenever Amol asks "did you check", "are you sure", "is it working", or "prove it". Establishes evidence, separates what was verified from what was not, and produces the manual-test handoff he needs before committing.
---

# Verify

"Done" is not a status. Evidence is.

This skill runs before you tell Amol something works, and whenever he pushes back on a
claim. Its output is a table he can act on, plus a handoff telling him exactly what to
test himself.

## Step 1 — separate the four states

Every claim lands in exactly one row. Nothing is omitted because it is inconvenient.

```
  Implemented    the change exists          cite file:line
  Verified       a command proved it        cite the command AND its output
  Not verified   not checked                say why not
  Limitations    known to be incomplete     say what breaks
```

A thing you wrote but did not run is **Implemented, not Verified**. Say so. The most
expensive failure mode in this workspace is a status note that outlived its truth —
`workout/BUILD_STATE.md` carried "no successful signup verified yet" for seven days
while two rows sat in the table, because every pass re-read the note instead of
querying the table.

## Step 2 — pick evidence that actually proves the claim

Match the evidence to the claim. Running the type checker does not prove a button works.

```
  claim                        evidence that counts
  ---------------------------  ----------------------------------------
  "it compiles"                tsc / next build exit 0
  "tests pass"                 the runner's pass/fail counts, quoted
  "the API returns X"          the actual response body
  "the row was written"        a SELECT against the table
  "it deployed"                the live version id, not the push
  "the page renders"           a screenshot or the served HTML
  "the flow works"             a browser pass through the real flow
```

For a static-export repo like `workout`, "it builds" proves very little. Check the
deployed Worker version and the file count of `out/`.

## Step 3 — never claim a state you did not read

If a fact lives in a table, a log, or a deploy, go get it. Re-reading your own earlier
summary of that fact is not checking it. If a cheap probe settles the question, run the
probe before asking Amol anything or declaring a blocker.

A claimed limitation is a material claim. "The API can't do that", "that needs a
credential", "that's not possible on Windows" require the verbatim error, the
documented line, or a live probe. Pattern-matching to a familiar story is not evidence.

## Step 4 — the manual-test handoff

Amol tests by hand before anything is committed. That is his rule, and the
`commit-gate` hook enforces it. Your job is to make his test cheap and unambiguous.

Produce exactly this, filled in:

```
MANUAL TEST
  Start        <the command to run, verbatim>
  Go to        <url or screen, exact path>
  Do           <the action, in one line>
  Expect       <what he should see if it worked>
  Red flag     <what he'd see if it silently failed>
```

Vague handoffs waste his time. "Check the page looks right" is not a handoff. "Open
http://localhost:3000/exercises, set the Equipment filter to Barbell, expect the count
under the heading to drop from 1394 to 348" is.

## Step 5 — report

Give him the four-state table, then the handoff, then stop. Do not commit. Do not say
"done". Do not round "Implemented" up to "Verified" because the code looks correct.

If something is broken, say it plainly with the shortest decisive line of output. Never
bury a failure in a summary.

## Relationship to superpowers

`superpowers:verification-before-completion` owns the general gate: no completion claim
without a command run in this message. That rule stands and is not restated here.

This skill adds the two things it does not cover — the four-state table, and the
manual-test handoff Amol needs before anything is committed. Use both; they do not
conflict.
