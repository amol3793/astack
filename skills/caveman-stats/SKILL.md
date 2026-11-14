---
name: caveman-stats
description: Show real token usage for the current session — fresh input, cache hit rate, thinking vs visible output. Trigger: /caveman-stats, "token usage", "what did this session cost".
---

# Token stats

Run the script and show its output. Do not estimate; the numbers come from the
transcript's own `usage` records.

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/token-stats.cjs"
```

Fall back to the repo-relative path if that variable is not set:

```bash
node .claude/plugins/astack/bin/token-stats.cjs
```

## What the numbers mean

```
  fresh input      tokens billed at full rate this session
  cache written    first time context was cached, billed ~1.25x
  cache read       re-read from cache, billed ~0.1x  <- this is the cheap one
  thinking         reasoning tokens, billed as output, never shown to you
  visible          what actually reached your screen
```

A **high cache hit rate is good**: it means the session is re-reading cached context
instead of paying full price for it. A hit rate that falls over a long session usually
means context got invalidated — a large file rewritten, or a compaction.

## Honest limits, say them out loud

- The cache-weighted total is an **estimate** using public rate ratios, not an invoice.
- The script reads the most recently modified transcript for this directory. If two
  sessions are open on the same repo it may read the other one. It prints the
  transcript filename — check it matches before quoting the numbers.
- It measures tokens, not money. It does not know your plan or your rate.

Do not claim a saving this script cannot show. If asked "did caveman mode save
tokens", the honest answer is that output tokens per turn are visible here, and
everything else is inference.
