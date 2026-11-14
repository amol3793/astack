# Getting started

## Install

```bash
# 1. remove the old gstack tree (preserved on a branch first)
bash scripts/remove-gstack.sh

# 2. register astack as a marketplace and install it
claude plugin marketplace add D:/work/easeur/astack
claude plugin install astack@astack

# 3. confirm it works
node test/validate.cjs        # expect: 95 passed, 0 failed
```

Requires Node. No Bun, no daemon, no build step, no API key.

## Turn ECC off without losing it

ECC stays on disk. Disabled, it costs zero session tokens, and everything it contains
is indexed in `docs/reference/ecc-catalogue.md` — 68 agents and 285 skills, by name,
with descriptions.

```json
// ~/.claude/settings.json
"enabledPlugins": {
  "ecc@ecc": false,
  "superpowers@claude-plugins-official": true,
  "frontend-design@claude-plugins-official": true,
  "cloudflare@cloudflare": true,
  "diagram-design@diagram-design": true
}
```

`superpowers` must stay enabled — astack's router points at four of its skills.

ECC also supplied the `chrome-devtools` MCP server, used 283 times in two months.
astack's own `.mcp.json` keeps it, so it survives ECC being disabled.

## First run

Start a session in an Easeur repo and check three things.

```
  1  session start   product context for that repo is loaded, not the others
  2  router          type "whats the status" and watch it name where-was-i
  3  commit gate     type a commit command and watch it ask first
```

If none of that happens, the plugin is not loaded. `claude plugin list` should show
`astack`.

## Day-to-day

You should not need to remember skill names. The router reads what you type and names
the right one. These all work with no slash command:

```
  "lets do the pending stuff"        ->  where-was-i
  "are you sure that works?"         ->  verify
  "should we build X?"               ->  product
  "why is the login broken"          ->  systematic-debugging
  "ok commit this"                   ->  ship
  "lets do the search console setup" ->  web
```

Invoke directly when you want to force it: `/where-was-i`, `/verify`, `/ship`,
`/product`, `/review`, `/web`, `/audit`, `/caveman`, `/caveman-stats`.

## When something is in the way

Every hook has an off switch. Set it for one command, not for the session, unless you
mean it.

```bash
ASTACK_COMMIT_GATE=off   # skip the manual-test gate once
ASTACK_CAREFUL=off       # skip the destructive-command guard
ASTACK_SECRET_SCAN=off   # skip the credential scan
ASTACK_ROUTER=off        # stop skill recommendations
```

If you find yourself setting one of these often, that is a bug in the hook. Open the
pattern and fix it rather than living with the workaround.

## Keeping it honest

```bash
/audit                               # monthly: stale facts, dead skills, router accuracy
node scripts/gen-ecc-catalogue.cjs   # after an ECC update
node bin/token-stats.cjs             # what this session actually cost
```
