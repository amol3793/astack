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

for (const [marker, name] of PRODUCTS) {
  if (!cwd.includes(marker)) continue;
  const ctx = read(`context/products/${name}.md`);
  if (ctx) parts.push(ctx);
  break;
}

// Cross-repo lessons, if any have been promoted.
try {
  const lessons = fs
    .readFileSync(path.join(require("os").homedir(), ".astack", "lessons.md"), "utf8")
    .trim();
  if (lessons) parts.push("# Lessons (cross-repo)\n\n" + lessons);
} catch {
  /* none yet */
}

if (!parts.length) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: parts.join("\n\n---\n\n"),
    },
  })
);
