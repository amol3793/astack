---
name: review
description: Use when reviewing code, a diff, or a PR — "review this", "any bugs in", "audit this", "look over my changes". Scores every finding for confidence and suppresses anything it cannot quote the code for.
---

# Review

Most bad reviews are not too shallow. They are too confident about things that are
not there.

```
  finding
     |
  can you quote the exact line that motivates it?
     |
    no ---> confidence forced to 4  ---> appendix only, not shown
     |
   yes ---> score 1-10 ---> 7+ shown ---> 5-6 shown with a caveat
```

## Step 1 — scope check first

Before judging quality, check that the diff is the work that was asked for.

```bash
git log origin/<base>..HEAD --oneline
git diff $(git merge-base origin/<base> HEAD) --stat
```

```
  Scope: CLEAN | DRIFT | MISSING
  Intent:    <what was asked>
  Delivered: <what the diff does>
```

`DRIFT` is the "while I was in there" class. `MISSING` is a stated requirement absent
from the diff. Report both; neither blocks.

## Step 2 — the quote gate

This is the part that matters. Before any finding is reported:

**Quote the specific line that motivates it.** file:line plus the verbatim text.

- "Field X does not exist on model Y" — quote the lines of Y where it would live.
- "This could be null" — quote the initialisation.
- "Race between A and B" — quote both A and B.

**If you cannot quote it, the finding is unverified.** Force confidence to 4, put it
in an appendix, and do not show it in the main report. Do not route around this by
assigning a speculative 7.

Framework-generated symbols are the usual trap. Drizzle schema inference, Next.js
route exports, React Server Component boundaries and generated Supabase types all
produce symbols that exist without appearing where you would grep for them. When the
symbol could be generated, lower confidence rather than reporting it missing.

## Step 3 — confidence scale

```
  9-10  read the code, demonstrated the bug          show
  7-8   strong pattern match, very likely right      show
  5-6   plausible, could be a false positive         show, marked "verify this"
  3-4   suspicious but unproven                      appendix only
  1-2   speculation                                  only if it would be P0
```

Format every finding the same way:

```
[P1] (confidence 9/10) src/lib/filters.ts:42
  const q = `SELECT * FROM exercises WHERE name = '${input}'`
  String interpolation into SQL. Use a parameterised query.
```

## Step 4 — what to look for, in this order

1. **Correctness** — does it do what it claims, including the error path.
2. **Security** — input reaching SQL or the DOM, secrets, auth boundaries, anything
   touching `easeurhealth` or `easeurwear` personal data.
3. **Reuse** — was something reimplemented that already exists a few files over.
   This is the most common issue in practice.
4. **Simplicity** — an abstraction with one caller is not an abstraction.
5. **Tests** — does the diff's risk match its test coverage.

## Step 5 — report

Lead with the count, then findings worst first, then the appendix.

```
  Review: 2 blocking, 3 advisory, 4 suppressed (unquotable)
```

Then stop. Do not fix while reviewing unless asked — a review that edits is a review
nobody can check.

For a second opinion, `superpowers:requesting-code-review` dispatches a fresh reviewer
with no memory of writing the code. Use it when the change is large or you wrote it.
