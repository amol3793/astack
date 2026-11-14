#!/usr/bin/env bash
# Remove the gstack tree, leaving astack's own files in place.
#
# Everything removed here is preserved on the branch gstack-upstream-v1.84.1
# and on both remotes (origin/main, upstream/main).
#
# Undo:  git checkout gstack-upstream-v1.84.1 -- .
#
# Run:   bash scripts/remove-gstack.sh

set -e
cd "$(dirname "$0")/.."

if ! git rev-parse --verify --quiet gstack-upstream-v1.84.1 >/dev/null; then
  echo "Refusing to run: branch gstack-upstream-v1.84.1 does not exist."
  echo "Create it first:  git branch gstack-upstream-v1.84.1"
  exit 1
fi

PATHS="
AGENTS.md ARCHITECTURE.md BROWSER.md CHANGELOG.md CLAUDE.md CONTRIBUTING.md
DESIGN.md ETHOS.md NOTICE.md SKILL.md SKILL.md.tmpl TODOS.md
USING_GBRAIN_WITH_GSTACK.md LICENSE .env.example .gitattributes .gitlab-ci.yml
.osv-scanner.toml bunfig.toml conductor.json connect-chrome package.json
bun.lock setup slop-scan.config.json test-setup.ts
.github agents agents-digest autoplan benchmark benchmark-models browse
browser-skills canary careful claude codex context-restore context-save contrib
cso design design-consultation design-html design-review design-shotgun
devex-review diagram document-generate document-release extension freeze gstack
gstack-upgrade guard health hosts investigate ios-clean ios-design-review
ios-fix ios-qa ios-sync land-and-deploy landing-report learn lib licenses
make-pdf model-overlays office-hours openclaw open-gstack-browser pair-agent
patches plan-ceo-review plan-design-review plan-devex-review plan-eng-review
plan-tune qa qa-only retro review scrape setup-browser-cookies setup-deploy
setup-gbrain ship skillify spec supabase sync-gbrain unfreeze
"

echo "Removing the gstack tree (preserved on gstack-upstream-v1.84.1)..."
# shellcheck disable=SC2086
git rm -rq --ignore-unmatch $PATHS

# gstack's own bin/ and test/ files, without touching astack's.
git ls-files 'bin/*' | grep -v 'bin/token-stats.cjs' | xargs -r git rm -q --
git ls-files 'test/*' | grep -v 'test/validate.cjs' | xargs -r git rm -q --

echo
echo "Remaining tracked files: $(git ls-files | wc -l)"
echo
node test/validate.cjs
