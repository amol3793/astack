#!/usr/bin/env node
// astack secret-scan — stop credentials reaching a tracked file.
//
// Runs on Write and Edit. Asks rather than denies: a false positive should cost
// one keystroke, not block real work.
//
// Escape hatch: ASTACK_SECRET_SCAN=off

const { readInput, decide, allow } = require("./lib.cjs");

if (process.env.ASTACK_SECRET_SCAN === "off") allow();

const input = readInput();
const ti = input.tool_input || {};
const path = String(ti.file_path || "");
const body = [ti.content, ti.new_string].filter(Boolean).join("\n");
if (!body) allow();

// Files that are meant to hold example credentials.
if (/\.env\.example$|\.sample$|\.template$/i.test(path)) allow();

const PATTERNS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "a private key block"],
  [/\bAKIA[0-9A-Z]{16}\b/, "an AWS access key id"],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/, "a GitHub token"],
  [/\bsk-[A-Za-z0-9_-]{20,}\b/, "an API secret key"],
  [/\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/, "a JWT"],
  [/\bpostgres(ql)?:\/\/[^\s:@]+:[^\s@]+@/i, "a Postgres URL with an inline password"],
  [/\bSUPABASE_[A-Z_]*(KEY|SECRET)\s*=\s*["']?[A-Za-z0-9._-]{20,}/, "a Supabase secret"],
  [/\bCLOUDFLARE_[A-Z_]*(TOKEN|KEY)\s*=\s*["']?[A-Za-z0-9._-]{20,}/, "a Cloudflare token"],
];

// Test fixtures carry fake keys like `sk-or-v1-e2e0123456789abcdef...`. A match
// that announces itself as fake is let through; a real key is still caught,
// test files included.
const PLACEHOLDER = /0123456789|fake|test|e2e|dummy/i;

for (const [pattern, what] of PATTERNS) {
  const global = new RegExp(pattern.source, pattern.flags + "g");
  const matches = body.match(global) || [];
  if (matches.some((m) => !PLACEHOLDER.test(m))) {
    decide(
      "ask",
      `[astack/secret-scan] This write looks like it contains ${what}, into ` +
        `${path || "a file"}. Secrets belong in .env (gitignored), never in a tracked ` +
        `file. Confirm only if this is a placeholder.`
    );
  }
}

allow();
