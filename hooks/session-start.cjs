#!/usr/bin/env node
// astack session-start — load the spine, and only the product context that applies.
//
// This is the whole context-layer mechanism: L0 always, L2 only when the cwd is
// that product's repo. Nothing else is loaded until a skill asks for it.

const fs = require("fs");
const path = require("path");

const root = process.env.CLAUDE_PLUGIN_ROOT || path.join(__dirname, "..");
const cwd = process.cwd().replace(/\\/g, "/").toLowerCase();

const PRODUCTS = [
  ["/easeur/workout", "workout"],
  ["/easeur/wear", "wear"],
  ["/easeur/health", "health"],
  ["/easeur/easeur-ecosystem-landing-page", "landing"],
  ["/easeur/eat", "eat"],
];

function read(rel) {
  try {
    return fs.readFileSync(path.join(root, rel), "utf8").trim();
  } catch {
    return "";
  }
}

const parts = [];

const spine = read("context/spine.md");
if (spine) parts.push(spine);

// Caveman is on by default (owner request, 2026-11-16). This is the short form: the full
// skill is ~1.8k tokens and would break the 1500-token payload budget in test/validate.cjs.
const caveman = read("context/caveman.md");
if (caveman) parts.push(caveman);

for (const [marker, name] of PRODUCTS) {
  if (!cwd.includes(marker)) continue;
  const ctx = read(`context/products/${name}.md`);
  if (ctx) parts.push(ctx);
  break;
}

// Cross-repo lessons are the dead-ends list in ~/.claude/CLAUDE.md, which Claude Code
// loads by itself. Nothing to load here (the unused ~/.astack/lessons.md tier was
// removed 2026-11-16).

if (!parts.length) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: parts.join("\n\n---\n\n"),
    },
  })
);
