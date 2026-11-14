#!/usr/bin/env node
// Generate docs/reference/ecc-catalogue.md from the installed ECC copy.
// ECC stays on disk and disabled; this file is how its contents stay discoverable
// without costing session tokens. Re-run after an ECC update.

const fs = require("fs");
const path = require("path");
const os = require("os");

const ECC = path.join(os.homedir(), ".claude", "plugins", "marketplaces", "ecc");

function frontmatter(file) {
  const text = fs.readFileSync(file, "utf8");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const block = m[1];
  const name = (block.match(/^name:\s*(.+)$/m) || [])[1];
  let desc = (block.match(/^description:\s*([\s\S]*?)(?=\r?\n[a-zA-Z_-]+:|$)/m) || [])[1] || "";
  desc = desc
    .replace(/^[>|]-?\s*/, "")
    .replace(/\s+/g, " ")
    .replace(/^["']|["']$/g, "")
    .trim();
  return { name: (name || path.basename(path.dirname(file))).trim(), desc };
}

function collect(dir, kind) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file =
      kind === "skill" ? path.join(dir, entry.name, "SKILL.md") : path.join(dir, entry.name);
    if (kind === "skill" && !entry.isDirectory()) continue;
    if (kind === "agent" && !entry.name.endsWith(".md")) continue;
    if (!fs.existsSync(file)) continue;
    const r = frontmatter(file);
    if (r) out.push(r);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

const skills = collect(path.join(ECC, "skills"), "skill");
const agents = collect(path.join(ECC, "agents"), "agent");

let version = "unknown";
try {
  version = fs.readFileSync(path.join(ECC, "VERSION"), "utf8").trim();
} catch {
  /* not installed */
}

if (!skills.length && !agents.length) {
  console.error("ECC not found at " + ECC + " — nothing to catalogue.");
  process.exit(1);
}

const out = [];
const pad = (n) => String(n).padStart(3);

out.push("# ECC catalogue (reference only — plugin disabled)");
out.push("");
out.push(
  "ECC `" + version + "` stays installed on disk at `~/.claude/plugins/marketplaces/ecc`"
);
out.push(
  "and **disabled** in settings. Disabled costs zero session tokens. This file is the index,"
);
out.push("so nothing is lost and anything worth having can be pulled into astack later.");
out.push("");
out.push("Generated " + new Date().toISOString().slice(0, 10) + " from the installed copy.");
out.push("Regenerate with `node scripts/gen-ecc-catalogue.cjs`.");
out.push("");
out.push("```");
out.push("  skills   " + pad(skills.length));
out.push("  agents   " + pad(agents.length));
out.push("  measured use over two months:  9 skill calls, 0 agents spawned");
out.push("```");
out.push("");
out.push("## What was actually used");
out.push("");
out.push("Worth looking at first if you re-enable anything:");
out.push("");
out.push("| Skill | Calls | Replaced in astack by |");
out.push("|---|---|---|");
out.push("| `ecc:seo` | 3 | `astack:web`, SEO mode |");
out.push("| `ecc:save-session` | 3 | `where-was-i` writes `docs/STATUS.md` |");
out.push("| `ecc:resume-session` | 1 | `where-was-i` |");
out.push("| `ecc:code-review` | 1 | `astack:review` + built-in `/code-review` |");
out.push("| `ecc:liquid-glass-design` | 1 | not replaced — copy it in if you resume that work |");
out.push("| `ecc:gateguard` | 1 | not replaced — the spine's evidence rules cover the intent |");
out.push("");
out.push("`chrome-devtools` MCP came from ECC and is preserved separately in astack's");
out.push("`.mcp.json`, so its 283 tool calls keep working with ECC disabled.");
out.push("");
out.push("## To re-enable the whole plugin");
out.push("");
out.push("```json");
out.push("// ~/.claude/settings.json");
out.push('"enabledPlugins": { "ecc@ecc": true }');
out.push("```");
out.push("");
out.push("## To take one skill without the plugin");
out.push("");
out.push("```bash");
out.push("cp -r ~/.claude/plugins/marketplaces/ecc/skills/<name> skills/<name>");
out.push("node test/validate.cjs   # checks frontmatter name matches the directory");
out.push("```");
out.push("");
out.push("---");
out.push("");
out.push("## Agents (" + agents.length + ")");
out.push("");
for (const a of agents) out.push("- **" + a.name + "** — " + (a.desc || "(no description)").slice(0, 200));
out.push("");
out.push("## Skills (" + skills.length + ")");
out.push("");
for (const s of skills) out.push("- **" + s.name + "** — " + (s.desc || "(no description)").slice(0, 200));
out.push("");

fs.mkdirSync(path.join(__dirname, "..", "docs", "reference"), { recursive: true });
const dest = path.join(__dirname, "..", "docs", "reference", "ecc-catalogue.md");
fs.writeFileSync(dest, out.join("\n"));

console.log("wrote " + dest);
console.log("agents: " + agents.length + ", skills: " + skills.length);
console.log("size: " + fs.statSync(dest).size + " bytes");
