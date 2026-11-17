---
name: audit
description: Use to check astack itself — stale facts in skills or context, dead references, router accuracy, context bloat, and which skills are actually being used. Run monthly, or whenever something in astack feels wrong.
---

# Audit

astack is software. It rots like software. This is the check.

```
  1  does it still run          test suite
  2  are the facts still true   claims vs repo reality
  3  is anything dead           skills nobody invokes
  4  does the router work       recommendation vs what you actually needed
  5  is context still cheap     spine and product files
```

## 1 — does it still run

```bash
node test/validate.cjs
```

Anything less than all-green is the whole finding. Stop and fix it.

## 2 — are the facts still true

This is the one that matters. Every concrete claim in `context/` is a fact that was
true when written. Verify, do not re-read.

```bash
find <repo>/out -type f | wc -l          # matches the file count claimed?
node -e "console.log(Object.keys(require('./package.json').scripts))"
grep -A3 "^on:" .github/workflows/*.yml  # trigger still what we say it is?
```

Check every number, path and command in `context/products/*.md` against the repo.
A path that moved is worse than no path: it sends the next session to the wrong place.

Known trap already caught once: the Wear prototype lives at `wear/UI-areana-ai/`, not
`wear/src/`. A plain scan of `wear/` finds nothing and concludes the repo is empty.

When a fact is wrong, **fix it and say what changed**. Do not delete the claim to make
the audit pass.

## 3 — is anything dead

```bash
# what you actually invoked, newest first
grep -ho '"skill":"[^"]*"' ~/.claude/projects/*/*.jsonl | sort | uniq -c | sort -rn
```

A skill with zero invocations over a month is a candidate for removal, not a defect.
Ask one question before cutting: *did it not fire because it is useless, or because
the router never pointed at it?* Those have opposite fixes.

The counter-example is the whole reason astack exists: 285 ECC skills sat unused for
two months and nobody noticed, because nothing was counting.

## 4 — does the router work

The router is the part most likely to be quietly wrong, because a missed
recommendation looks like nothing happening.

```bash
echo '{"prompt":"<a real prompt you typed recently>"}' | node hooks/router.cjs
```

Take five real prompts from the last week and check what it recommends.

```
  recommended the right skill      good
  recommended nothing              a gap — add a pattern
  recommended the wrong skill      worse than silence — fix the weight
  fired on something trivial       noise — raise the threshold
```

Every fix gets a case added to `test/validate.cjs`. The router's accuracy is only real
if it is pinned by a test.

## 5 — is context still cheap

```bash
wc -l context/spine.md              # budget 120
wc -l context/products/*.md         # budget ~60 each
wc -l ~/.claude/references/dead-ends.md   # the lessons tier; grows slowly
```

The spine is paid for in every session in every repo. A line that is not carrying its
weight is costing you on every turn forever.

Dead ends older than about six months, or about a platform that has since changed, get
pruned. A lessons file nobody reads is the failure mode that left
`~/.claude/skills/learned/` empty. Also check `skills/launch/laws.md`: any date past
its re-check line gets looked up again. Same for `skills/scale/free-tiers.md`: past its
re-check date, every limit is read again from the vendor's page.

## 6 — check what upstream changed

astack depends on superpowers and calls four of its skills by name.

```bash
ls ~/.claude/plugins/cache/claude-plugins-official/superpowers/*/skills/
```

If a skill the router names has been renamed or removed, the router is pointing at
nothing. The test suite catches astack's own skills; it cannot catch a superpowers
rename, so check it here.

## Report

```
  astack audit — <date>

  Tests           <n>/<n>
  Stale facts     <what was wrong, what it is now>
  Dead skills     <name: 0 invocations in 30 days>
  Router          <n>/<n> on real prompts, <gaps found>
  Context         spine <n>/120, products <n> lines, lessons <n> bytes
  Upstream        superpowers <version>, <any renames>

  Fixed:      <what you changed>
  Needs you:  <what needs a decision>
```

Do not close the audit by lowering a standard. If the spine is over budget, cut a line;
do not raise the budget.
