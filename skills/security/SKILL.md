---
name: security
model: opus
description: Use before any Easeur app launches or ships an AI feature, sign-in, uploads, payments or anything that costs money per request, and when Amol says "security review", "security check", "is it secure", "prompt injection", "leaked key", "API abuse", "rate limit" or "someone is burning my credits". Runs the security and cost-abuse checklist and reports each item with evidence.
---

# Security

A gate, not a reading list. Two ways an app gets hurt: someone makes the AI or the
database do what it should not (sections A to D, G), or someone spends Easeur's money
(sections E, F, H, I). Every item ends in one of four states, with evidence.

```
  PASS      checked now, evidence quoted (file:line, grep of the build, query, probe)
  FAIL      missing or wrong. Blocks launch.
  N/A       the trigger is absent. Say which fact in the code makes it so.
  ACCEPTED  Amol accepted the gap. Cite the D-entry in BUILD_STATE.md.
```

Rules:

- Never mark PASS from memory, from `BUILD_STATE.md` or from a comment that says it is
  handled. Read the code path, grep the built output, run the probe.
- Never mark N/A to make the list shorter. "No server" is a fact you check, and Supabase
  counts as a server: its RLS, auth mail and storage rules are yours.
- This is a posture check of the whole app. For bugs in one diff, use `/security-review`
  or the `review` skill instead.
- **Probes that send load or attacks run against a local or preview build**, never
  production, unless Amol confirms that specific probe. A rate-limit test on production
  is an attack on your own bill.
- Cloudflare and Supabase are read-only here. A fix that needs a write is proposed with
  the exact change, not made.
- Load every MCP tool the run needs in one ToolSearch call before the first probe, and
  batch probes into few shell calls. Same reason as the `launch` skill.

## Step 0 — read the triggers

Answer from the code, not from the plan.

```
  S1  an AI feature exists                       (any call to a model)
  S2  who pays for the AI call:  Easeur's key on a server  /  BYOK in the browser
  S3  the AI reads content the user did not type (PDF, web page, email, photo, OCR)
  S4  the AI can act: tools, function calls, writes, sends, payments
  S5  server code exists: a Worker with "main", edge functions, API routes
  S6  accounts or a database
  S7  uploads or file storage
  S8  payments, trials or paid plans
  S9  paid third-party calls other than AI: email, SMS, maps, background removal
  S10 scheduled jobs, queues, triggers or webhooks
```

## Step 1 — who pays decides which half applies

```
  Easeur pays (key on a server)     every section applies
  BYOK in the browser               E and I are N/A for the AI call itself: the user's
                                    own key, the user's own bill. E1 still applies.
                                    B, C and D apply in full: an injected prompt attacks
                                    the user's data whoever pays.
  no AI at all (S1 absent)          B, C, D are N/A
  static export, no S5              "on the server" items are N/A only where nothing
                                    Easeur pays for sits behind them
```

Workout and Eat are static exports with BYOK AI in the browser (checked 2026-11-16).
That is an owner decision, so "move every AI call to the server" is not a FAIL there.
It becomes one the day an Easeur-owned key is added: re-run this skill then.

## A — secrets and surface (always)

| # | Check | Evidence |
|---|---|---|
| A1 | No secret key in frontend code or in the built bundle | grep `out/` or `.next/static` for `sk-`, `service_role`, `secret`, private key headers |
| A2 | Secrets live in server environment variables or CI secrets, never in the repo | grep the tree and `git log -p -S` for key shapes; `.env*` is gitignored |
| A3 | A key that ever leaked was revoked and replaced, not just deleted from the file | the provider's key list shows a new key dated after the leak |
| A4 | Separate test and prod keys; a dev machine holds no prod key | key names and env files |
| A5 | Security headers and HTTPS only: CSP, `X-Content-Type-Options`, `Referrer-Policy`, frame rules | `curl -I` on the deployed URL |
| A6 | 0 critical / 0 high in `npm audit` | audit output |
| A7 | Nothing untrusted is rendered as raw HTML | grep `dangerouslySetInnerHTML`, `innerHTML`, `v-html`; each use has a sanitizer |

## B — what goes into the AI (S1)

| # | Check |
|---|---|
| B1 | User input is wrapped in XML tags (or an equal delimiter) so the model treats it as data, not orders |
| B2 | User messages go in the user role, never pasted into the system prompt |
| B3 | Every input passes a prompt injection filter. A filter cuts noise; it is never the control. A PASS here does not offset a FAIL in D |
| B4 | S3: every PDF, web page, email and image the AI reads is treated as hostile: delimited as data, never trusted as instructions |
| B5 | S3: hidden text and HTML are stripped from files before the AI sees them (white-on-white text, comments, metadata, zero-width characters) |
| B6 | Input length is capped where the request is built: on the server when Easeur pays, in the client under BYOK |
| B7 | Chat history sent per request is capped: a turn count or a token budget |
| B8 | A canary token sits in the system prompt, and any reply that contains it is blocked |
| B9 | The AI was tested with prompt injection attacks, and the attack prompts are saved as a test so the next change re-runs them |

## C — what comes out of the AI (S1)

| # | Check |
|---|---|
| C1 | Structured replies are forced to JSON and any reply that fails the schema is rejected. Validate in code: OpenRouter free models do not honour `json_schema` [dead ends] |
| C2 | Every AI reply is sanitized before rendering (A7 applies to model output too) |
| C3 | Markdown images and links are stripped from AI replies, or limited to an allowlist of hosts. An image URL with data in its query string is a data leak |
| C4 | `max_tokens` is set on every request, so output tokens are capped |
| C5 | Every AI call has a timeout and a visible failure state |
| C6 | Model and token limits are locked server-side when Easeur pays; the client cannot pick a costlier model |
| C7 | Every prompt and response is logged with personal data masked, and the log has a retention limit. Under BYOK with no server, say so and mark N/A |

## D — what the AI can do (S4)

| # | Check |
|---|---|
| D1 | The exact tools the AI can call are on an allowlist. No generic "run SQL" or "fetch any URL" tool |
| D2 | Every tool argument is validated before the tool runs: type, range, ownership |
| D3 | The user ID comes from the session, never from the AI or the request body |
| D4 | The AI has no write access to the database. Writes go through the same validated path a button would use |
| D5 | A confirm button stands before the AI sends, deletes or pays for anything |

## E — who can spend Easeur's money (S2 Easeur pays, S8, S9)

| # | Check |
|---|---|
| E1 | Every call that uses an Easeur-owned key runs on the server, never in the browser. Under BYOK: the user's key stays in the browser, is never sent to an Easeur server and never logged |
| E2 | Paid access is verified on the server, per request. A client flag is not a check |
| E3 | Rate limit per user and per IP, enforced on the server |
| E4 | Daily quota per user |
| E5 | Simultaneous requests per user are limited |
| E6 | Duplicate billable requests are prevented: an idempotency key, or a disabled button plus a server check |
| E7 | Quota is reserved before the paid call and released on failure, not counted after |
| E8 | Retries are capped, and permanent errors (4xx) are not retried |
| E9 | Paid third-party API calls (S9) have their own per-user and global limits |
| E10 | Tested: parallel requests cannot bypass the limits. Fire N at once on a local build; the count that pass equals the limit |

## F — sign-up and public forms (S6, S8)

| # | Check |
|---|---|
| F1 | Bot checks on public forms: Turnstile or equal, verified on the server |
| F2 | Fake signups and trial abuse are limited: email confirmation, one trial per verified identity |
| F3 | Verification emails and texts are limited per address, per IP and per hour |
| F4 | S8: checkout is protected from card testing: gateway rules on, attempts limited per session and IP |

## G — database, files and storage (S6, S7)

| # | Check |
|---|---|
| G1 | Row-level security is on for every table, and a second account cannot read or write the first one's rows (tested, not assumed) |
| G2 | No public rights on storage: buckets are private, no anonymous list or write |
| G3 | Files are served through signed expiring URLs |
| G4 | Upload size and processing time are limited on the server |
| G5 | Zip bombs and giant images are blocked: cap unpacked size and pixel dimensions before decoding |
| G6 | Expired temp files are deleted by a job |
| G7 | Batch sizes and query results are limited: every list endpoint has a maximum page size |

## H — jobs and scaling (S5, S10)

| # | Check |
|---|---|
| H1 | Recursive function triggers are prevented: a function cannot fire the event that starts it |
| H2 | Every job has a timeout |
| H3 | Scheduled jobs cannot overlap: a lock, or a schedule longer than the worst run |
| H4 | Auto-scaling and serverless concurrency are capped |
| H5 | Log retention limits are set |

## I — spend controls (anything Easeur pays for)

| # | Check |
|---|---|
| I1 | Spending is tracked by user and by service |
| I2 | Spending spikes are detected |
| I3 | An alert fires before the budget is hit, to a place Amol reads |
| I4 | Paid requests stop when the budget runs out: a hard cap at the provider, not only an alert |
| I5 | A spending kill switch exists: one flag or one revoked key stops all paid calls, and it was tried once |

When a review finds a new failure, add it to the section it belongs in, in the same
change, with its source in brackets.

## Report

```
  security check: <app>, <date>     triggers: S1 S2=BYOK S3 S6     build: <sha>

  FAIL      C3  AI reply renders markdown images: src/components/Chat.tsx:88
            G1  second account reads first account's rows in <table>
  ACCEPTED  E1  BYOK in the browser (D134)
  N/A       D   the AI calls no tools: no tool definitions in src/lib/inference/
            I   nothing Easeur pays per request
  PASS      29 of 41, evidence below
  Not verified   E10  needs a running local build

  Verdict   NOT SECURE TO LAUNCH, 2 blockers     |   CLEAR
  Next      <the one fix to start with>
```

FAIL rows first. Never write CLEAR with a FAIL open. "Not verified" is not PASS: say
what would settle it. An ACCEPTED row needs Amol's decision recorded, not yours.

**Save it in the same turn.** Write the full report to
`<app>/docs/reviews/<YYYY-MM-DD>-security-check.md` before answering: each FAIL with its
evidence, the fix and a "done when" line, then the PASS, N/A and "Not verified" tables.
On screen show only the block above plus the path. Do not commit it.

The verdict is engineering evidence, not a penetration test. Before real payments or
health data go live, an outside review is the next step.
