#!/usr/bin/env node
// astack token-stats — real token accounting for the current session.
//
// Reads the live Claude Code transcript for this working directory and reports
// what the session actually cost. Replaces the caveman-stats hook that the
// skill referenced but that never existed on disk.
//
// Usage: node bin/token-stats.cjs [--session <path-to-jsonl>]

const fs = require("fs");
const path = require("path");
const os = require("os");

function slugFor(cwd) {
  // Claude Code encodes the cwd as a directory name under ~/.claude/projects.
  return cwd.replace(/[\/:]/g, "-").replace(/-+/g, "-");
}

function findTranscript() {
  const explicit = process.argv.indexOf("--session");
  if (explicit > -1 && process.argv[explicit + 1]) return process.argv[explicit + 1];

  const projects = path.join(os.homedir(), ".claude", "projects");
  if (!fs.existsSync(projects)) return null;

  const want = slugFor(process.cwd()).toLowerCase();
  const dirs = fs
    .readdirSync(projects)
    .filter((d) => d.toLowerCase().replace(/-+/g, "-") === want.replace(/^-+/, ""));

  const dir = dirs.length
    ? path.join(projects, dirs[0])
    : // fall back to the most recently touched project directory
      fs
        .readdirSync(projects)
        .map((d) => path.join(projects, d))
        .filter((p) => fs.statSync(p).isDirectory())
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];

  if (!dir) return null;

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => path.join(dir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  return files[0] || null;
}

const file = findTranscript();
if (!file || !fs.existsSync(file)) {
  console.log("astack token-stats: no transcript found for this directory.");
  process.exit(0);
}

let turns = 0;
let input = 0;
let output = 0;
let thinking = 0;
let cacheRead = 0;
let cacheWrite = 0;

for (const line of fs.readFileSync(file, "utf8").split("\n")) {
  if (!line.trim()) continue;
  let d;
  try {
    d = JSON.parse(line);
  } catch {
    continue;
  }
  const u = (d.message || {}).usage;
  if (!u) continue;
  turns++;
  input += u.input_tokens || 0;
  output += u.output_tokens || 0;
  thinking += (u.output_tokens_details || {}).thinking_tokens || 0;
  cacheRead += u.cache_read_input_tokens || 0;
  cacheWrite += u.cache_creation_input_tokens || 0;
}

if (!turns) {
  console.log("astack token-stats: transcript has no usage records yet.");
  process.exit(0);
}

const n = (x) => x.toLocaleString("en-US");
const visible = output - thinking;

// Cache reads are billed at roughly a tenth of fresh input, cache writes at
// about 1.25x. This is the shape agents actually bill under; treat it as an
// estimate, not an invoice.
const billable = input + cacheWrite * 1.25 + cacheRead * 0.1 + output;

console.log(`
  astack token-stats
  transcript: ${path.basename(file)}

  turns with usage      ${n(turns)}

  fresh input           ${n(input)}
  cache written         ${n(cacheWrite)}
  cache read            ${n(cacheRead)}
  output (total)        ${n(output)}
    of which thinking   ${n(thinking)}
    visible to you      ${n(visible)}

  cache-weighted total  ${n(Math.round(billable))}   (estimate)
  output per turn       ${n(Math.round(output / turns))}
`);

if (cacheRead + cacheWrite > 0) {
  const hit = Math.round((cacheRead / (cacheRead + cacheWrite)) * 100);
  console.log(`  cache hit rate        ${hit}%  (higher is cheaper)\n`);
}
