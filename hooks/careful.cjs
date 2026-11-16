#!/usr/bin/env node
// astack careful — destructive-command guard.
//
// Two tiers:
//   HIGH   deny  — catastrophic and unambiguous
//   MEDIUM ask   — destructive, sometimes legitimate
//
// Best-effort advisory guard, not a policy boundary. Compound commands
// (;, &&, ||, |) fall through to the MEDIUM tier on purpose: deciding which
// repo `cd X && git push --force` targets is not something a regex can do.
//
// Escape hatch: ASTACK_CAREFUL=off

const { readInput, decide, allow } = require("./lib.cjs");

if (process.env.ASTACK_CAREFUL === "off") allow();

const input = readInput();
const cmd = ((input.tool_input || {}).command || "").trim();
if (!cmd) allow();

const isSimple = !/[;&|\n]|\$\(|`/.test(cmd);

// Build artefacts that are always safe to remove recursively.
const SAFE_TARGET =
  /\b(node_modules|\.next|\.turbo|dist|build|out|coverage|__pycache__|\.cache|test-results|\.vite)\b/;

const HOME_TARGET = /["']?(\/|~|\$HOME)["']?\s*$/;
const RECURSIVE_REMOVE = /^\s*rm\s+(-[a-zA-Z]*[rR][a-zA-Z]*\s+|--recursive\s+)+/;

// ---------- HIGH tier: deny ----------
if (isSimple) {
  // Recursive removal of the filesystem root or the home directory.
  if (RECURSIVE_REMOVE.test(cmd) && HOME_TARGET.test(cmd)) {
    decide(
      "deny",
      "[astack/careful HIGH] Recursive removal of / or the home directory. Blocked. " +
        "If you genuinely mean it, run it yourself outside the agent."
    );
  }

  // Cloudflare writes. Amol's standing rule: Cloudflare is read-only unless he has
  // confirmed that specific change. This is the enforcement, not a reminder.
  if (
    /^\s*(npx\s+)?wrangler\s+(deploy|publish|delete|rollback|secret\s+put|kv|r2\s+object\s+(put|delete)|d1\s+execute|pages\s+deploy|versions\s+deploy)/.test(
      cmd
    )
  ) {
    decide(
      "deny",
      "[astack/careful HIGH] Cloudflare write blocked. Reading is always fine. Changing " +
        "Cloudflare state needs Amol's confirmation of this exact change (zone, object, " +
        "old value -> new value) first. Propose it; do not run it."
    );
  }

  // Force-push aimed at a default branch.
  if (
    /^\s*git\s+push\b/.test(cmd) &&
    /(^|\s)(-f|--force)(\s|$)/.test(cmd) &&
    !/--force-with-lease/.test(cmd) &&
    /(^|\s)\+?(main|master)(\s|$|:)/.test(cmd)
  ) {
    decide(
      "deny",
      "[astack/careful HIGH] Force-push to the default branch. Blocked. " +
        "Use --force-with-lease on a feature branch."
    );
  }
}

// ---------- MEDIUM tier: ask ----------
const MEDIUM = [
  // File removal is judged per-segment further down, not here. A compound
  // command's other arguments must not make its `rm` look worse than it is.
  [/\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i, "SQL DROP permanently removes database objects."],
  [/\bTRUNCATE\b/i, "TRUNCATE empties a table and cannot be undone."],
  [
    /\bDELETE\s+FROM\b(?![\s\S]*\bWHERE\b)/i,
    "DELETE with no WHERE clause empties the whole table.",
  ],
  // --force-with-lease is the safe variant and is deliberately not flagged.
  // Asking every time would train the reflex to click through the warning.
  [
    /\bgit\s+push\b(?![\s\S]*--force-with-lease)[\s\S]*(-f\b|--force)/,
    "Force-push rewrites remote history.",
  ],
  [/\bgit\s+reset\s+--hard\b/, "git reset --hard discards uncommitted work."],
  [
    /\bgit\s+(checkout|restore)\s+\.\s*$/,
    "This discards every uncommitted change in the working tree.",
  ],
  // git clean is judged per-segment further down: it is only dangerous in a main
  // checkout, where new files wait uncommitted for a manual test.
  [/\bkubectl\s+delete\b/, "kubectl delete affects a live cluster."],
  [
    /\bdocker\s+(system\s+prune|rm\s+-f|volume\s+rm)/,
    "Docker prune or remove destroys containers or volumes.",
  ],
  [/\bsupabase\s+db\s+reset\b/, "This resets the database."],
  // The real deploy path. A dispatch ships to production at once (no required
  // reviewers), so it is a Cloudflare write by another name.
  [
    /\bgh\s+workflow\s+run\b[\s\S]*deploy/i,
    "This dispatches a production deploy. Amol confirms each deploy.",
  ],
  // A Cloudflare write hidden in a compound command (`cd x && npx wrangler deploy`)
  // misses the HIGH tier, which only reads simple commands. Catch it here.
  [
    /\bwrangler\s+(deploy|publish|delete|rollback|secret\s+put|pages\s+deploy|versions\s+deploy)\b/,
    "Cloudflare write inside a compound command.",
  ],
];

for (const [pattern, why] of MEDIUM) {
  if (pattern.test(cmd)) decide("ask", `[astack/careful] ${why} Confirm before this runs.`);
}

// ---------- git clean, judged by where it runs ----------
// `git clean -fd` deletes untracked files and git cannot bring them back. In a main
// checkout those are Amol's new, uncommitted files, so it asks. In a linked worktree
// (`git worktree add`, `.git` is a file) the tree is disposable by definition, and the
// e2e recipe is `cd ../workout-x && git checkout -f && git clean -fdq` every time.
// Dry runs delete nothing. The working directory is the hook's cwd, moved by any
// `cd <literal path>` segments that come before the clean.
const path = require("path");
const fs = require("fs");

function toNativePath(p) {
  const m = p.match(/^\/([a-zA-Z])\/(.*)$/); // Git Bash: /d/work -> D:/work
  return m ? `${m[1].toUpperCase()}:/${m[2]}` : p;
}

function inLinkedWorktree(dir) {
  for (let d = dir, prev = null; d !== prev; prev = d, d = path.dirname(d)) {
    try {
      const st = fs.statSync(path.join(d, ".git"));
      return st.isFile(); // a file means linked worktree; a directory means main checkout
    } catch {}
  }
  return false;
}

{
  let dir = path.resolve(toNativePath(input.cwd || process.cwd()));
  const segments = cmd.split(/\s*(?:&&|\|\||;|\n)\s*/).map((s) => s.replace(/^\(|\)$/g, "").trim());
  for (const seg of segments) {
    const cd = seg.match(/^cd\s+("([^"]*)"|'([^']*)'|(\S+))$/);
    if (cd) {
      const target = cd[2] ?? cd[3] ?? cd[4];
      if (!/[$`~*]/.test(target)) dir = path.resolve(dir, toNativePath(target));
      else dir = null; // cannot resolve statically; fall through to ask
      if (dir === null) dir = "\0unknown";
      continue;
    }
    if (!/^git\s+clean\s+-[a-zA-Z]*[fd]/.test(seg)) continue;
    if (/(^|\s)(-[a-zA-Z]*n[a-zA-Z]*|--dry-run)(\s|$)/.test(seg)) continue;
    if (dir !== "\0unknown" && inLinkedWorktree(dir)) continue;
    decide("ask", "[astack/careful] git clean removes untracked files. Confirm before this runs.");
  }
}

// ---------- file removal, judged one segment at a time ----------
// Splitting first matters: in
//   sed -i 's|...|...|' "/abs/path/x.mjs" && node x.mjs ; rm -f ./tmp.mjs
// only the last segment removes anything. Testing the whole string would let the
// absolute path in the `sed` argument condemn a one-file cleanup.
function removalSegments(command) {
  return command
    .split(/[;&|]+|\n/)
    .map((s) => s.trim())
    .filter((s) => /^(sudo\s+)?rm(\s|$)/.test(s));
}

const GLOB = /[*?]|\[[^\]]*\]/;
// Absolute paths are the normal shape here (D:/work/..., scratchpad temp files), so
// they no longer ask. Only the home directory, where keys live, still does.
const REACHES_OUTSIDE = /(^|\s)["']?(~|\$HOME)/;

for (const seg of removalSegments(cmd)) {
  const flags = (seg.match(/(?:^|\s)-([a-zA-Z]+)/g) || []).join("");
  const recursive = /[rR]/.test(flags) || /--recursive/.test(seg);
  const forced = /f/.test(flags) || /--force/.test(seg);

  if (recursive) {
    // Build artefacts are regenerated by the next build. Removing them is routine.
    if (SAFE_TARGET.test(seg) && !HOME_TARGET.test(seg)) continue;
    decide("ask", "[astack/careful] Recursive file removal. Confirm before this runs.");
  }

  // `rm -f` without -r deletes exactly what it names. Cleaning up a temp file is
  // the most common shape in this workspace, and asking every time would train
  // the reflex to click through the warning — the same reason --force-with-lease
  // is never flagged. Ask only when it can reach further than the names given:
  // a glob, or a path under the home directory.
  if (forced && (GLOB.test(seg) || REACHES_OUTSIDE.test(seg))) {
    decide(
      "ask",
      "[astack/careful] Forced removal with a glob or a home-directory path. " +
        "Confirm before this runs."
    );
  }
}

// Personal-data blast radius: easeurhealth and easeurwear hold personal data.
if (
  /\beaseurhealth\b|\beaseurwear\b/.test(cmd) &&
  /\b(DROP|TRUNCATE|DELETE|ALTER)\b/i.test(cmd)
) {
  decide(
    "ask",
    "[astack/careful] This touches a database holding personal data " +
      "(easeurhealth / easeurwear). Confirm the exact change."
  );
}

allow();
