# Health — product context (L2)

Load when cwd is `D:\work\easeur\health`. Public stage 1 (Scoped).

- Internally phase 3 of 8. The extraction engine is written but **not configured**;
  every upload fails closed. That is the current state, not a bug to fix casually.
- The site publishes stage 1 while the build is internally at phase 3. Those two
  scales are unrelated. Do not "reconcile" them.
- Backend is `easeurhealth`. It holds personal health data and nothing else.

## Raised scrutiny — this is a health product

Never let an uncertain calculation become a confident claim. Label every number:

```
  measured       came from a device or a document the user supplied
  calculated     derived by a formula, formula named
  estimated      derived with assumptions, assumptions named
  predicted      a model output, with its uncertainty
  recommendation a suggestion, never phrased as medical advice
```

Medical advice is out of scope for this product. If a feature drifts toward it, say so
before building it.

Minimise collection. Minimise external sharing. `consents`, `audit_log` and
`deletion_jobs` exist so "your data stays yours, exportable, deletable, never an ad
surface" is enforceable rather than marketing.
