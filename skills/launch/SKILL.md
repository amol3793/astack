---
name: launch
model: opus
description: Use before any Easeur app goes public, opens to real users, or adds sign-in, payments, marketing email, AI output or a new kind of personal data, and when Amol says "pre-launch", "launch checklist", "ready to launch", "privacy policy", "terms", "cookie banner", "DPDP" or "GDPR". Runs the pre-launch checklist and reports each item with evidence.
---

# Launch

A gate, not a reading list. Every item ends in one of four states, with evidence.

```
  PASS      checked now, evidence quoted (URL + status, file:line, query result)
  FAIL      missing or wrong. Blocks launch.
  N/A       the trigger is absent. Say which fact makes it so.
  ACCEPTED  Amol accepted the gap. Cite the D-entry in BUILD_STATE.md.
```

Rules:

- Never mark PASS from memory or from `BUILD_STATE.md`. Open the page, read the file,
  run the query.
- Never mark N/A to make the list shorter. "No payments" is a fact you check in the code.
- A legal item is a pointer, not legal advice. `laws.md` (next to this file) holds the
  per-country detail and its dates. Read the section for each trigger that fires.
- Law changes. A date or threshold in `laws.md` older than 6 months gets re-checked
  against the primary source before it blocks or clears anything.

## Keep the run cheap

Every turn re-reads the whole context, so what gets loaded early is paid for many times.
Measured on the first Eat run (2026-11-16): one mid-run tool load rewrote 75k tokens of cache,
about 28% of the session.

- **Load tools once, first.** If any section needs an MCP tool (Supabase for B2, B6, B14;
  a browser for A11), load them all in one ToolSearch call before the first probe. Never
  load a tool mid-run. If a server will not connect, mark those rows "Not verified" and go on.
- **Do not read `BUILD_STATE.md` whole.** It cannot give a PASS anyway. Grep its headings,
  then read only the `## Open` section and the `Now` table for the deployed version.
- **Batch probes.** One shell call for all the `curl` checks, one for the audits.

## Step 0 — read the triggers

Answer from the code, not from the plan. The answers pick the sections.

```
  T1  accounts / sign-in                 any personal data on a server
  T2  payments or subscriptions
  T3  marketing email, SMS or push
  T4  cookies, analytics, third-party scripts or SDKs
  T5  AI features (output shown, or user data sent to a model)
  T6  user-generated content shown to others
  T7  health, body, biometric, face or financial data
  T8  could a person under 18 use it
  T9  where are the users: India only / EU-UK / US
```

Section A always runs. The rest run when their trigger fires.

## A — always

| # | Check | Evidence |
|---|---|---|
| A1 | Privacy policy live at `/privacy`, linked from every page footer | `curl -I` returns 200 on production |
| A2 | Terms of service live at `/terms`, linked the same way | same |
| A3 | Business contact details published: legal name, address, email | contact or about page |
| A4 | Privacy policy matches what the code does: each data item, purpose, retention, where stored, who receives it | diff against the app's data inventory |
| A5 | Collect only what a feature uses. Every stored field has a named purpose | data inventory, schema |
| A6 | Every image, font, icon, dataset and code dependency has a verified licence, and attribution is shown where required | licence register; no `UNVERIFIED` rows |
| A7 | Open-source obligations met: notices shipped, no copyleft code in a closed bundle | `npx license-checker --summary` |
| A8 | No customer logos, testimonials, reviews or user counts that are not real and permitted | grep demo flags and fixtures in the production build |
| A9 | Every claim on the site is true and provable: uptime, security, certifications (SOC 2, ISO, HIPAA), "trusted by", medical or outcome claims | read the copy; each claim has a source |
| A10 | No dark patterns: fake timers, fake scarcity, confirm-shaming, pre-ticked boxes, hidden costs, forced sign-up, hard-to-find cancel | walk the flows |
| A11 | Accessibility, WCAG 2.1 AA: contrast, alt text, full keyboard path, visible focus, labels, reduced motion, 200% zoom | Lighthouse a11y + a keyboard-only pass |
| A12 | Security floor: 0 critical / 0 high in `npm audit`, no secrets in the bundle, security headers, HTTPS only. The full check (prompt injection, rate limits, spend caps, storage) is the `security` skill: its verdict is CLEAR, or this row is FAIL | audit output, grep of `out/`, the saved security report |
| A13 | Abuse limits on every public write endpoint | rate-limit test |
| A14 | Hidden or unfinished pages return a real 404, and are out of the sitemap | `curl -I` each one |
| A15 | Public stage in `products.ts` matches reality | read `products.ts` |
| A16 | Error and empty states exist; nightly watch or other alerting is on | run the watch once by hand |
| A17 | Speed: the `performance` skill verdict is WITHIN BUDGET on the three most used pages | the saved performance report |

## B — accounts and personal data (T1)

| # | Check |
|---|---|
| B1 | Unticked checkbox to accept the privacy policy and terms at sign-up. No bundled consent |
| B2 | Acceptance recorded: user, version of the text, wording, time |
| B3 | Consent version bumps when the notice's meaning changes, and users are re-asked |
| B4 | Separate, optional, unticked consent for marketing. Withdrawing is as easy as giving |
| B5 | Data access and export works from the app (portability) |
| B6 | Account deletion works end to end. Tested on a real account; rows gone; backups caveat stated |
| B7 | Correction of personal data is possible |
| B8 | Retention limits set and enforced by a job, not by a sentence. Published as a policy |
| B9 | Data inventory exists and is the source of truth for the privacy notice |
| B10 | Processor list (sub-processors) published; a DPA signed or accepted with each one |
| B11 | Grievance / privacy contact named, with a response time |
| B12 | Breach SOP written: who is told, in what time |
| B13 | Email confirmation on; auth redirect URLs are production URLs |
| B14 | RLS on every table; a second account cannot read the first one's rows (tested) |
| B15 | User data is not used to train models, by Easeur or by a vendor. Vendor settings checked |

## C — payments and subscriptions (T2)

| # | Check |
|---|---|
| C1 | Full price shown before payment, taxes and fees included. No drip pricing |
| C2 | Refund and cancellation policy published and linked at checkout |
| C3 | Auto-renewal disclosed before purchase: amount, period, next charge date |
| C4 | Cancel in as few steps as sign-up, online, no call or chat needed |
| C5 | Renewal reminder before each charge; receipt or invoice after |
| C6 | Card data never touches Easeur servers (gateway-hosted fields only) |
| C7 | Tax registration and invoice format checked with an accountant |

## D — marketing messages (T3)

| # | Check |
|---|---|
| D1 | Sent only to people who gave the separate marketing consent (B4) |
| D2 | Working one-click unsubscribe in every email; honoured at once |
| D3 | Sender identity and a postal address in the footer |
| D4 | Transactional mail carries no promotion |

## E — cookies, analytics, SDKs (T4)

| # | Check |
|---|---|
| E1 | Every third-party script, SDK and pixel listed, with what it sends |
| E2 | Nothing non-essential loads before consent. Verified in the network tab on a fresh profile |
| E3 | Cookie banner: reject is as easy as accept; choice remembered; can be changed later |
| E4 | No banner needed if only strictly necessary storage is used. Then say so in the policy |

## F — AI (T5)

| # | Check |
|---|---|
| F1 | AI output labelled as AI-generated where it is shown |
| F2 | The user is told they are talking to an AI, not a person |
| F3 | Privacy policy names the model vendor, the region, and what is sent |
| F4 | No training on user data (B15). BYOK keys stay in the browser |
| F5 | Health, nutrition and fitness output carries "not medical advice", and makes no diagnosis or cure claim |
| F6 | The AI path is tested with a real key, not a mock |

## G — user content (T6), sensitive data (T7), minors (T8)

| # | Check |
|---|---|
| G1 | T6: content rules, a report button, a takedown path, a named contact |
| G2 | T7: explicit, separate consent for each sensitive category; stored in its own project; lawyer review before external users |
| G3 | T8: age gate. Under-18 (India) or under-13/16 (US/EU) needs verifiable parental consent, or the app is adults-only and enforces it |
| G4 | T8: no tracking, profiling or targeted ads aimed at children |

## H — past Easeur lessons (always)

Each of these cost real time once. Source in brackets.

| # | Check |
|---|---|
| H1 | `/privacy` is live **before** submitting Google OAuth verification. A 404 gets the app rejected [workout, 2026-10-29] |
| H2 | Demo data flags are off in production: `DEMO_REVIEWS` and anything like it [landing] |
| H3 | Asset licence register has no `UNVERIFIED` row, or the risk is ACCEPTED by D-entry [workout Gym Visual; eat IFCT rows] |
| H4 | Under static export, a `notFound()` gate serves 200 with 404 content. Check status codes, not pages [workout] |
| H5 | No `npm audit fix --force` near launch. It pulls a major [workout] |
| H6 | Account deletion is tested, not assumed. A delete defect is a launch blocker [health] |
| H7 | A retention policy is a published artifact plus a sweep job, not a consent screen [wear R22] |
| H8 | Privacy notice and data inventory change together; then bump the consent version [workout] |
| H9 | DPA requested from each processor and recorded with a date [workout data inventory] |
| H10 | "Build passed" is not "the Worker runs". Run the built Worker and curl `/` [dead ends] |
| H11 | Public write endpoints cannot be stuffed: votes, waitlist, MCP [landing tracker] |

When a launch finds a new one, add it here in the same change, with its source.

## Report

```
  launch check: <app>, <date>      triggers: T1 T4 T5 T9=India+EU

  FAIL      A1  /privacy returns 404 on production
            B6  delete leaves rows in <table>
  ACCEPTED  A6  Gym Visual licence (D218)
  N/A       C   no payments: no checkout code in src/
  PASS      31 of 38, evidence below

  Verdict   NOT READY, 2 blockers     |   READY
  Next      <the one fix to start with>
```

FAIL rows first. Never write READY with a FAIL open. An ACCEPTED row needs Amol's
decision recorded, not yours.

**Save it in the same turn.** Write the full report to
`<app>/docs/reviews/<YYYY-MM-DD>-launch-check.md` before answering: each FAIL with its
evidence, the fix and a "done when" line, then the PASS and "Not verified" tables. The
next session works from that file. On screen show only the block above plus the path.
Do not commit it.

The verdict is engineering evidence. For T2, T7 or T8, a one-time review by a lawyer
in the target country comes before external users.
