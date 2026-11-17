#!/usr/bin/env node
// astack routing-gate — makes the model-routing skill's checkpoints real.
//
// The skill is advice. This hook is the part the model cannot skip. It does nothing
// until a session is armed, which happens when the `model-routing` skill is invoked
// (PreToolUse on the Skill tool) or when the skill's first step runs:
//
//   node hooks/routing-gate.cjs arm <session_id>
//
// Once armed, for the main session only (subagents are workers and are not gated):
//
//   plan gate      PreToolUse Write|Edit   deny a new file past `planGateFiles` until the
//                                          advisor agent has been consulted
//   review gate    Stop                    block once when `reviewGateFiles` files changed
//                                          since the advisor last looked
//   escalation     PostToolUseFailure      after `escalateAfterFailures` shell failures in
//                                          a row, tell the model to stop retrying
//   advisor seen   SubagentStop            an `advisor` agent finishing opens both gates
//
// Thresholds: skills/model-routing/routing.json. State: one small JSON file per session
// in the OS temp directory. Escape hatch: ASTACK_ROUTING=off

const fs = require("fs");
const os = require("os");
const path = require("path");
const { readInput, decide } = require("./lib.cjs");

const root = process.env.CLAUDE_PLUGIN_ROOT || path.join(__dirname, "..");
const DIR = process.env.ASTACK_ROUTING_DIR || path.join(os.tmpdir(), "astack-routing");
const DEFAULTS = { planGateFiles: 3, reviewGateFiles: 3, escalateAfterFailures: 3 };

function config() {
  try {
    const raw = fs.readFileSync(path.join(root, "skills", "model-routing", "routing.json"), "utf8");
    const parsed = JSON.parse(raw);
    const cfg = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS)) {
      if (Number.isInteger(parsed[k]) && parsed[k] > 0) cfg[k] = parsed[k];
    }
    return cfg;
  } catch {
    return DEFAULTS;
  }
}

function stateFile(id) {
  return path.join(DIR, String(id).replace(/[^\w.-]/g, "_") + ".json");
}

function load(id) {
  try {
    return JSON.parse(fs.readFileSync(stateFile(id), "utf8"));
  } catch {
    return null;
  }
}

function save(id, state) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(stateFile(id), JSON.stringify(state));
}

function arm(id) {
  if (!load(id)) save(id, { armed: true, files: [], sinceReview: [], advised: false, failures: 0 });
}

function norm(p) {
  return String(p || "").replace(/\\/g, "/").toLowerCase();
}

// Top-level `decision: "block"` is the documented shape for Stop and PostToolUseFailure.
// The reason is handed to the model as feedback.
function feedback(reason) {
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
  process.exit(0);
}

// ---------- command line: arm, disarm, status ----------
const [action, cliId] = process.argv.slice(2);
if (action) {
  if (!cliId) {
    console.error("usage: routing-gate.cjs arm|disarm|status <session_id>");
    process.exit(1);
  }
  if (action === "arm") {
    arm(cliId);
    console.log("model-routing gates armed for this session");
  } else if (action === "disarm") {
    fs.rmSync(stateFile(cliId), { force: true });
    console.log("model-routing gates disarmed for this session");
  } else if (action === "status") {
    console.log(JSON.stringify({ config: config(), state: load(cliId) }, null, 2));
  } else {
    console.error(`unknown action: ${action}`);
    process.exit(1);
  }
  process.exit(0);
}

// ---------- hook ----------
if (process.env.ASTACK_ROUTING === "off") process.exit(0);

const input = readInput();
const id = input.session_id;
if (!id) process.exit(0);

const event = input.hook_event_name;
const tool = input.tool_name;
const toolInput = input.tool_input || {};

// Invoking the skill arms the session.
if (event === "PreToolUse" && tool === "Skill") {
  if (/(^|:)model-routing$/.test(String(toolInput.skill || ""))) arm(id);
  process.exit(0);
}

const state = load(id);
if (!state || !state.armed) process.exit(0);
const cfg = config();

// An advisor agent finishing opens the plan gate and resets the review counter.
// Plugin agents may be reported as "astack:advisor", so match the last segment.
if (event === "SubagentStop") {
  if (/(^|:)advisor$/.test(String(input.agent_type || ""))) {
    state.advised = true;
    state.sinceReview = [];
    state.failures = 0;
    save(id, state);
  }
  process.exit(0);
}

// Everything below gates the main session only. A hook that fires inside a subagent
// carries agent_id; subagents are the cheap workers and run under an approved plan.
if (input.agent_id) process.exit(0);

if (event === "PreToolUse" && (tool === "Write" || tool === "Edit")) {
  const file = norm(toolInput.file_path);
  if (!file) process.exit(0);
  // Scratch files and Claude's own notes are not part of the task's blast radius.
  if (file.startsWith(norm(os.tmpdir())) || file.includes("/.claude/")) process.exit(0);

  const known = state.files.includes(file);
  if (!known && !state.advised && state.files.length >= cfg.planGateFiles) {
    decide(
      "deny",
      `[astack/model-routing] This task now touches more than ${cfg.planGateFiles} files and ` +
        "no advisor has seen the plan. Send the advisor agent (astack:advisor) a brief: the " +
        "goal, the plan, the files involved and the open risks. Apply its verdict, then retry " +
        "this edit. The gate opens when the advisor finishes."
    );
  }
  if (!known) state.files.push(file);
  if (!state.sinceReview.includes(file)) state.sinceReview.push(file);
  save(id, state);
  process.exit(0);
}

if (event === "PostToolUseFailure") {
  if (input.is_interrupt) process.exit(0);
  state.failures += 1;
  save(id, state);
  if (state.failures % cfg.escalateAfterFailures === 0) {
    feedback(
      `[astack/model-routing] ${state.failures} shell commands in a row have failed. Stop ` +
        "retrying variations. Name the assumption that may be wrong, then escalate: send the " +
        "advisor agent (astack:advisor) the exact error text and what was tried. If a failure " +
        "was expected (a red test, a search with no match), carry on."
    );
  }
  process.exit(0);
}

if (event === "PostToolUse") {
  if (state.failures) {
    state.failures = 0;
    save(id, state);
  }
  process.exit(0);
}

if (event === "Stop") {
  // stop_hook_active is true when this stop already follows a stop-hook block. Never
  // block twice in a row: that is a loop, not a gate.
  if (input.stop_hook_active) process.exit(0);
  if (state.sinceReview.length >= cfg.reviewGateFiles) {
    feedback(
      `[astack/model-routing] ${state.sinceReview.length} files changed since an advisor last ` +
        "looked. Before finishing, save the diff to a scratch file and send the advisor agent " +
        "(astack:advisor) the goal, the diff path and what was verified. Fix what it flags. " +
        "If you are stopping only to ask the user a question, ask it now."
    );
  }
  process.exit(0);
}

process.exit(0);
