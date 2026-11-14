#!/usr/bin/env node
// astack commit-gate — Amol's standing rule, enforced.
//
// "Never commit or push until the user has confirmed their own manual test
//  passed, or has explicitly asked to commit."
//
// The hook asks; it never decides. The answer is his.
// Escape hatch: ASTACK_COMMIT_GATE=off

const { readInput, decide, allow } = require("./lib.cjs");

if (process.env.ASTACK_COMMIT_GATE === "off") allow();

const input = readInput();
const cmd = ((input.tool_input || {}).command || "").trim();
if (!cmd) allow();

const COMMITS = /(^|[;&|]\s*)git\s+(commit|push)\b/;
if (!COMMITS.test(cmd)) allow();

// `git push --dry-run` and read-only inspection are not the thing being gated.
if (/--dry-run/.test(cmd)) allow();

const verb = /git\s+push\b/.test(cmd) ? "push" : "commit";

decide(
  "ask",
  `[astack/commit-gate] About to ${verb}. Your standing rule: nothing is committed ` +
    `or pushed until you confirm your own manual test passed, or explicitly ask to ` +
    `commit. If you have tested this, approve. If not, decline and ask for the ` +
    `manual-test handoff first.`
);
