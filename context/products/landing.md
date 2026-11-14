# Landing page — product context (L2)

Load when cwd is `D:\work\easeur\easeur-ecosystem-landing-page`.

**Live at `easeur.com`** since 2026-09-01. OpenNext on Cloudflare Workers, Hyperdrive
to Supabase `easeurweb`, KV incremental cache.

## The one rule that catches people

```
  git push main   ->   ships NOTHING
                       deploys are workflow_dispatch only, hand-dispatched
```

`Nightly watch` is the only production alerting that exists.

## products.ts is the catalogue

`src/data/products.ts` is the **only** place an app's public name, description, stage
and visibility are set. The site, sitemap, structured data, `/llms.txt`, the JSON API
and the MCP server all derive from it. Never hardcode an app list anywhere else.

Every derived total on the site comes from `visibleProducts` — hidden apps contribute
to no figure anywhere. Re-derive counts from `products.ts` rather than trusting any
prose total, including one written in a CLAUDE.md.

## Verified workflows

Checked on 2026-09-14.

```
  .github/workflows/deploy.yml   on: workflow_dispatch    <- only trigger, no push
  .github/workflows/watch.yml    on: schedule             <- Nightly watch
```

There is no push trigger anywhere. Pushing `main` genuinely ships nothing.

`.claude/commands/cf-check.md` is a repo-local command and survives any plugin change.
