# Launch: laws by country

Reference for the `launch` skill. Read only the sections whose trigger fired.

**Not legal advice.** Written 2026-11-16 from memory plus law-firm summaries, not from
the primary texts. Every row marked `(verify)` must be checked against the official
source before it decides a launch. Re-check any date here after 2027-05-16.

Easeur is run from India, so the India section applies to every app. Another country's
law applies when the app targets or knowingly serves people there (T9).

## India (always)

| Law | What it asks of a web app | Trigger |
|---|---|---|
| **DPDP Act 2023 + DPDP Rules 2025** | Plain-language itemised notice; consent that is free, specific, informed and as easy to withdraw as to give; rights to access, correct, erase and nominate; a published grievance contact; erase when the purpose is over; reasonable security; contracts with processors; breach notice to the Board and to affected users | T1 |
| DPDP timing | Rules notified 2025-11-13. Core duties (notice, rights, security, breach, children) apply from **2027-05-13**. Workout's "Grievance Officer before 13 May 2027" is this date | T1 |
| DPDP breach | Tell affected users without delay; detailed report to the Board within 72 hours `(verify)` | T1 |
| DPDP logs | Keep processing logs for at least 1 year `(verify)` | T1 |
| DPDP children | Under 18: verifiable parental consent; no tracking, behavioural monitoring or targeted ads. Workout chose 18+ only | T8 |
| DPDP notice language | Offer the notice in English or a Schedule 8 language on request `(verify)` | T1 |
| **IT Act s.43A + SPDI Rules 2011** | Until DPDP fully replaces it: a published privacy policy, consent for sensitive data (health, biometric, financial, passwords), reasonable security practices | T1, T7 |
| **IT (Intermediary Guidelines) Rules 2021** | If users post content others see: publish rules, privacy policy and user agreement; name a Grievance Officer; acknowledge complaints in 24 hours, resolve in 15 days `(verify)` | T6 |
| AI-generated content labelling | 2025-26 amendments to the Intermediary Rules on labelling synthetic content `(verify: scope and date)` | T5, T6 |
| **CERT-In Directions 2022** | Report listed cyber incidents within 6 hours; keep system logs 180 days `(verify)` | T1 |
| **Consumer Protection Act 2019 + E-Commerce Rules 2020** | When selling: legal name, address, contact and grievance officer on the site; total price with break-up; refund, return and cancellation terms; no pre-ticked consent; acknowledge complaints in 48 hours, resolve in 1 month `(verify)` | T2 |
| **CCPA Dark Patterns Guidelines 2023** | Bans 13 named patterns: false urgency, basket sneaking, confirm shaming, forced action, subscription trap, interface interference, bait and switch, drip pricing, disguised ads, nagging, trick question, SaaS billing, rogue malware | always |
| **CCPA Misleading Ads Guidelines 2022** | Claims must be true and substantiated; endorsements genuine; fake reviews are a misleading ad (see IS 19000:2022) | always |
| **RBI recurring payment (e-mandate) rules** | Notice before each debit; extra authentication above the threshold; easy mandate cancel. The gateway does most of it: confirm its settings `(verify)` | T2 |
| RBI card storage | Do not store card numbers. Tokenised, gateway-hosted only | T2 |
| GST | Registration and invoice rules once charging. Ask an accountant | T2 |
| TRAI commercial messaging | Promotional SMS needs registered headers, templates and consent (DLT) `(verify)` | T3 |
| **RPwD Act 2016**, IS 17802 | Accessibility of digital services. Build to WCAG 2.1 AA | always |
| Health and wellness claims | No cure or treatment claims (Drugs and Magic Remedies Act); software that diagnoses or treats can be a medical device `(lawyer)` | T7 |
| Copyright Act 1957 | Licence for every asset; takedown path for user content | always, T6 |

## EU and UK (T9)

| Law | What it asks | Trigger |
|---|---|---|
| **GDPR / UK GDPR** | A lawful basis per purpose; Art. 13 notice; rights answered within 1 month; breach to the regulator within 72 hours; Art. 28 DPA with each processor; transfer safeguards (SCCs) for data leaving the EU/UK | T1 |
| GDPR Art. 27 | No EU/UK establishment but targeting people there: appoint a representative `(verify exemption for occasional processing)` | T1 |
| GDPR Art. 9, 35 | Health and biometric data need explicit consent; a DPIA before large-scale use | T7 |
| GDPR Art. 8 | Child consent age 13 to 16 by country | T8 |
| **ePrivacy / PECR** | Consent before any non-essential cookie or tracker; reject as easy as accept; opt-in for marketing email | T3, T4 |
| **Consumer Rights Directive**, UK equivalents | 14-day withdrawal right for online purchases, with pre-contract information; online withdrawal function from 2026-06-19 `(verify)` | T2 |
| **Unfair Commercial Practices Directive, DSA** | No dark patterns, fake reviews or hidden ads; for user content: contact point, terms, notice-and-action | always, T6 |
| **European Accessibility Act** | In force since 2025-06-28 for consumer e-commerce; micro-enterprise service providers are exempt `(verify)` | T2 |
| **EU AI Act Art. 50** | Tell people they are dealing with an AI; mark AI-generated content. Applies from 2026-08-02; the machine-readable marking duty has a grace period to 2026-12-02 for systems already on the market `(verify)` | T5 |

## United States (T9)

| Law | What it asks | Trigger |
|---|---|---|
| **FTC Act s.5** | No deceptive or unfair practices. False claims (including a false SOC 2 or HIPAA claim) and a privacy policy the code does not follow both count | always |
| **FTC Consumer Reviews and Testimonials Rule** | No fake, bought or suppressed reviews `(verify)` | always |
| **COPPA** | Under 13: verifiable parental consent before collecting data | T8 |
| **CAN-SPAM** | Honest headers, a postal address, a working unsubscribe honoured within 10 business days | T3 |
| **ROSCA + state auto-renewal laws** | Clear renewal terms before billing, express consent, a simple way to cancel. The FTC "click-to-cancel" rule was vacated on 2025-07-08; ROSCA and state laws (California's the strictest) still apply `(verify current status)` | T2 |
| **State privacy laws (CCPA/CPRA and others)** | Mostly apply above revenue or volume thresholds a new app will not meet `(verify per state)` | T1 |
| **Washington My Health My Data Act**, **FTC Health Breach Notification Rule** | Consumer health data outside HIPAA: separate consent, a health-data privacy policy, breach notice. No small-business threshold in Washington `(verify)` | T7 |
| **DMCA s.512** | Hosting user content: register a designated agent with the Copyright Office and publish a takedown policy to keep the safe harbour | T6 |
| **ADA / state accessibility claims** | Inaccessible sites draw lawsuits. WCAG 2.1 AA is the working standard | always |

## Other countries

Not covered. Before targeting Canada (PIPEDA, CASL), Australia (Privacy Act, Spam Act),
Brazil (LGPD), Singapore (PDPA) or any other market, look up that country's privacy,
consumer and anti-spam law and add a section here.

## Sources used on 2026-11-16

- DPDP Rules timing: https://www.mondaq.com/india/data-protection/1713500/regulatory-update-notification-of-the-digital-personal-data-protection-rules-2025
- DPDP Rules overview: https://conventuslaw.com/featured-content/building-indias-digital-privacy-framework-an-overview-of-the-dpdp-rules-2025/
- EU AI Act Art. 50: https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force
- EU AI Omnibus: https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/
- FTC click-to-cancel vacated: https://www.fenwick.com/insights/publications/eighth-circuit-vacates-ftcs-click-to-cancel-rule

Everything without a source line above came from model memory. Treat it as a list of
what to look up, not as the law.
