# Wear — product context (L2)

Load when cwd is `D:\work\easeur\wear`. Public stage 3 (Build). Nothing deployed.

- The **web app is v1**. Flutter is deferred, not cancelled.
- Next.js, Supabase Auth, verified against a live DB in `easeurwear` (ap-south-1).
- Name is **Easeur Wear**, short form *Wear*. *EaseUrDressUp* is retired entirely.
  `EaseurWEAR` may exist as a wordmark, never in written copy.

## The open decision

**Host is deliberately undecided.** Recorded as settled 2026-08-16, reopened 2026-08-19:

```
  Cloudflare Workers + R2        Hostinger VPS
  ---------------------------    -------------------------
  free tier caps Worker at       no pipeline rewrite at all
  3 MiB; Next.js via OpenNext
  usually exceeds it

  background-removal transform
  is metered, not free
```

`docs/TRD.md` section 2 holds the criteria. It is being decided after the product is
built, on purpose. Do not close it early.

## Sensitive data

Wardrobe photos and avatar face photos are personal data, consent-gated behind a
`face-photo` scope, and unauthenticated at their URL. Treat any change touching
`public/uploads` or `avatars.faceImageUrl` as privacy-sensitive.

## Where the code actually is

```
  wear/UI-areana-ai/        <- the Next.js prototype lives HERE
      package.json            name: easeur-wear-prototype
      72 TypeScript files
```

Not `wear/src/`. The directory name is misleading and a plain scan of `wear/` finds
nothing, which is how this gets rediscovered every few sessions.

```
  npm run dev / build / start / lint / typecheck
  npm run db:push      push the schema to easeurwear
  npm run seed         seed data
```

`db:push` and `seed` talk to a live Supabase project holding wardrobe and face photos.
Treat both as personal-data operations, not local scaffolding.
