// Shared helpers for astack hooks.
// Every hook receives one JSON object on stdin and answers on stdout.

const fs = require("fs");

function readInput() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

// A PreToolUse decision MUST be nested under hookSpecificOutput.
// Claude Code ignores a top-level permissionDecision.
function decide(decision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: decision,
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}

function allow() {
  process.exit(0);
}

module.exports = { readInput, decide, allow };
