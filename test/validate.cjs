#!/usr/bin/env node
// astack self-test. Run: node test/validate.cjs
// Validates manifests, skill frontmatter, hook wiring, and hook behaviour.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
let pass = 0;
const failures = [];

function check(name, fn) {
  try {
    const why = fn();
    if (why) failures.push(`${name}: ${why}`);
    else pass++;
  } catch (e) {
    failures.push(`${name}: threw ${e.message}`);
  }
}

function readJSON(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

// Run a hook with a fake tool call, return its decision or null.
function runHook(hook, toolInput, env = {}, cwd) {
  const out = execFileSync("node", [path.join(root, "hooks", hook)], {
    input: JSON.stringify({ tool_input: toolInput, ...(cwd ? { cwd } : {}) }),
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  if (!out.trim()) return null;
  return JSON.parse(out).hookSpecificOutput.permissionDecision;
}

// ---------- manifests ----------
check("plugin.json parses and names astack", () => {
  const p = readJSON(".claude-plugin/plugin.json");
  if (p.name !== "astack") return `name is ${p.name}`;
  if (!p.description) return "no description";
});

check("marketplace.json parses and lists astack", () => {
  const m = readJSON(".claude-plugin/marketplace.json");
  if (!Array.isArray(m.plugins) || !m.plugins.length) return "no plugins array";
  if (m.plugins[0].name !== "astack") return `first plugin is ${m.plugins[0].name}`;
});

check("VERSION matches plugin.json", () => {
  const v = fs.readFileSync(path.join(root, "VERSION"), "utf8").trim();
  const p = readJSON(".claude-plugin/plugin.json");
  if (v !== p.version) return `VERSION ${v} != plugin.json ${p.version}`;
});

// ---------- skills ----------
const skillDirs = fs
  .readdirSync(path.join(root, "skills"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

check("at least one skill exists", () => (skillDirs.length ? null : "skills/ is empty"));

for (const s of skillDirs) {
  check(`skill ${s} has valid frontmatter`, () => {
    const f = path.join(root, "skills", s, "SKILL.md");
    if (!fs.existsSync(f)) return "no SKILL.md";
    const t = fs.readFileSync(f, "utf8");
    const m = t.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return "no frontmatter block";
    if (!/^name:\s*\S/m.test(m[1])) return "no name:";
    if (!/^description:\s*\S/m.test(m[1])) return "no description:";
    const nm = m[1].match(/^name:\s*(\S+)/m)[1];
    if (nm !== s) return `name "${nm}" does not match directory "${s}"`;
  });
}

// ---------- context ----------
check("spine exists and is small enough to always load", () => {
  const f = path.join(root, "context", "spine.md");
  if (!fs.existsSync(f)) return "context/spine.md missing";
  const lines = fs.readFileSync(f, "utf8").split("\n").length;
  if (lines > 120) return `${lines} lines, budget is 120`;
});

// ---------- hook wiring ----------
check("hooks.json references only files that exist", () => {
  const h = readJSON("hooks/hooks.json");
  const missing = [];
  for (const event of Object.values(h.hooks)) {
    for (const group of event) {
      for (const hook of group.hooks) {
        const m = hook.command.match(/hooks\/([\w.-]+\.cjs)/);
        if (!m) continue;
        if (!fs.existsSync(path.join(root, "hooks", m[1]))) missing.push(m[1]);
      }
    }
  }
  if (missing.length) return `missing: ${missing.join(", ")}`;
});

// ---------- hook behaviour ----------
const SAFE = "npm test";
const BUILD_CLEANUP = "rm -rf node_modules";

check("careful allows an ordinary command", () =>
  runHook("careful.cjs", { command: SAFE }) === null ? null : "did not allow"
);

check("careful allows removing build artefacts", () =>
  runHook("careful.cjs", { command: BUILD_CLEANUP }) === null ? null : "asked about node_modules"
);

check("careful denies a Cloudflare write", () => {
  const d = runHook("careful.cjs", { command: "wrangler deploy" });
  return d === "deny" ? null : `got ${d}`;
});

check("careful denies force-push to main", () => {
  const d = runHook("careful.cjs", { command: "git push --force origin main" });
  return d === "deny" ? null : `got ${d}`;
});

check("careful allows force-with-lease on a feature branch", () => {
  const d = runHook("careful.cjs", {
    command: "git push --force-with-lease origin feature/x",
  });
  return d === null ? null : `got ${d}`;
});

check("careful asks about a hard reset", () => {
  const d = runHook("careful.cjs", { command: "git reset --hard HEAD~3" });
  return d === "ask" ? null : `got ${d}`;
});

check("careful honours its escape hatch", () => {
  const d = runHook("careful.cjs", { command: "wrangler deploy" }, { ASTACK_CAREFUL: "off" });
  return d === null ? null : `got ${d}`;
});

// ---------- deploy paths the HIGH tier cannot see (added 2026-11-16) ----------
// Guards: a production deploy never runs without a confirmation, whichever shell or
// command shape carries it.
const DEPLOY_PATHS = [
  ['gh workflow run "Deploy to Cloudflare" --ref main', "ask", "CI deploy dispatch"],
  ['gh workflow run "Deploy to Cloudflare" -R founder-easeur/eat', "ask", "CI deploy dispatch, other repo"],
  ["cd ../workout && npx wrangler deploy", "ask", "wrangler deploy inside a compound command"],
  ["gh workflow run nightly-watch.yml", null, "a workflow that is not a deploy"],
  ["gh run list --workflow deploy.yml", null, "reading deploy runs"],
];

for (const [command, want, label] of DEPLOY_PATHS) {
  check(`careful deploy path: ${label}`, () => {
    const d = runHook("careful.cjs", { command });
    return d === want ? null : `want ${want}, got ${d}`;
  });
}

check("careful and commit-gate also guard PowerShell", () => {
  const h = readJSON("hooks/hooks.json");
  const entry = h.hooks.PreToolUse.find((e) =>
    e.hooks.some((x) => x.command.includes("commit-gate.cjs"))
  );
  const tools = entry.matcher.split("|");
  if (!tools.includes("Bash") || !tools.includes("PowerShell")) return `matcher is ${entry.matcher}`;
  if (!entry.hooks.some((x) => x.command.includes("careful.cjs"))) return "careful not on the same matcher";
});

// ---------- file removal, per segment ----------
// Regression guard for the first real false positive astack produced: a temp-file
// cleanup at the end of a build pipeline was flagged as destructive because -f was
// treated like -rf. A hook that cries wolf gets clicked through.
const REMOVALS = [
  // [command, expected decision, what it is]
  ["rm -f ./measure-tmp.mjs", null, "force, one named file"],
  ["rm tmp.txt", null, "plain removal"],
  ["rm -rf node_modules", null, "build artefact"],
  ["rm -rf .next dist", null, "build artefacts"],
  ["npm test && rm -f ./out.tmp", null, "compound, safe cleanup"],
  ["rm -rf src", "ask", "recursive on real source"],
  ["rm -rf ../other-repo", "ask", "recursive outside the repo"],
  ["rm -f *.log", "ask", "force with a glob"],
  ["rm -f ~/.ssh/id_rsa", "ask", "force on a home path"],
  ["rm -f /etc/hosts", null, "force on one absolute path"],
  ["rm -f D:/work/easeur/wear/tmp.mjs", null, "force on one Windows absolute path"],
  ["rm -rf /", "deny", "root"],
  ["rm -rf ~", "deny", "home"],
];

for (const [command, want, label] of REMOVALS) {
  check(`careful: ${label}`, () => {
    const d = runHook("careful.cjs", { command });
    return d === want ? null : `want ${want}, got ${d}`;
  });
}

// git clean: asks in a main checkout, passes in a linked worktree (.git is a file).
{
  const os = require("os");
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "astack-clean-"));
  const main = path.join(base, "main");
  const wt = path.join(base, "wt");
  fs.mkdirSync(path.join(main, ".git"), { recursive: true });
  fs.mkdirSync(wt);
  fs.writeFileSync(path.join(wt, ".git"), "gitdir: " + main + "/.git/worktrees/wt");
  const CASES = [
    ["git clean -fdq", main, "ask", "main checkout"],
    ["git clean -fdq", wt, null, "linked worktree"],
    ["git clean -n -fd", main, null, "dry run"],
    ["cd ../wt && git checkout -q -f --detach HEAD && git clean -fdq", main, null, "cd into a worktree"],
    ["cd ../main && git clean -fdq", wt, "ask", "cd out of a worktree into main"],
    ["cd $X && git clean -fdq", wt, "ask", "unresolvable cd"],
    ["git clean -fdq", path.join(wt, "sub"), null, "subdirectory of a worktree"],
  ];
  fs.mkdirSync(path.join(wt, "sub"));
  for (const [command, cwd, want, label] of CASES) {
    check("careful git clean: " + label, () => {
      const d = runHook("careful.cjs", { command }, {}, cwd);
      return d === want ? null : "want " + want + ", got " + d;
    });
  }
}

// The command that actually fired the false positive, verbatim.
check("careful allows the real temp-file cleanup pipeline", () => {
  const command =
    "sed -i " +
    String.fromCharCode(39) + "s|a|b|" + String.fromCharCode(39) +
    " " + JSON.stringify("C:/Users/x/AppData/Local/Temp/claude/y/scratchpad/measure-body.mjs") +
    " && cp " + JSON.stringify("C:/Users/x/AppData/Local/Temp/claude/y/scratchpad/measure-body.mjs") +
    " ./measure-tmp.mjs && node ./measure-tmp.mjs 2>&1 | tail -30; rm -f ./measure-tmp.mjs";
  const d = runHook("careful.cjs", { command });
  return d === null ? null : `got ${d}; an absolute path in a sed argument must not condemn the rm`;
});

check("commit-gate asks before commit", () => {
  const d = runHook("commit-gate.cjs", { command: 'git commit -m "wip"' });
  return d === "ask" ? null : `got ${d}`;
});

check("commit-gate asks before push", () => {
  const d = runHook("commit-gate.cjs", { command: "git push origin main" });
  return d === "ask" ? null : `got ${d}`;
});

check("commit-gate ignores a dry run", () => {
  const d = runHook("commit-gate.cjs", { command: "git push --dry-run" });
  return d === null ? null : `got ${d}`;
});

check("commit-gate ignores unrelated git commands", () => {
  const d = runHook("commit-gate.cjs", { command: "git status" });
  return d === null ? null : `got ${d}`;
});

check("secret-scan asks about a private key", () => {
  const d = runHook("secret-scan.cjs", {
    file_path: "src/config.ts",
    content: "-----BEGIN RSA PRIVATE KEY-----\nAAAA\n",
  });
  return d === "ask" ? null : `got ${d}`;
});

check("secret-scan allows a .env.example placeholder", () => {
  const d = runHook("secret-scan.cjs", {
    file_path: ".env.example",
    content: "SUPABASE_SERVICE_KEY=your_key_here_0123456789abcdef",
  });
  return d === null ? null : `got ${d}`;
});

check("secret-scan allows a fake key in a test fixture", () => {
  const d = runHook("secret-scan.cjs", {
    file_path: "tests/e2e/feedback.spec.ts",
    content: 'const KEY = "sk-or-v1-e2e0123456789abcdef0123456789ab";',
  });
  return d === null ? null : `got ${d}`;
});

check("secret-scan still asks about a real-looking key in a test file", () => {
  const d = runHook("secret-scan.cjs", {
    file_path: "tests/e2e/feedback.spec.ts",
    content: 'const KEY = "sk-or-v1-9fK2mQx7LpA4vRt8ZwYc3NbH6jUe";',
  });
  return d === "ask" ? null : `got ${d}`;
});

check("secret-scan asks when a fake and a real key share a write", () => {
  const d = runHook("secret-scan.cjs", {
    file_path: "src/config.ts",
    content: 'a = "sk-fake-0123456789abcdefghij"\nb = "sk-9fK2mQx7LpA4vRt8ZwYc3NbH6jUe"',
  });
  return d === "ask" ? null : `got ${d}`;
});

check("secret-scan allows ordinary source", () => {
  const d = runHook("secret-scan.cjs", {
    file_path: "src/page.tsx",
    content: "export default function Page() { return null }",
  });
  return d === null ? null : `got ${d}`;
});


// ---------- router ----------
function routeOf(prompt) {
  const out = execFileSync("node", [path.join(root, "hooks", "router.cjs")], {
    input: JSON.stringify({ prompt }),
    encoding: "utf8",
  });
  if (!out.trim()) return null;
  const ctx = JSON.parse(out).hookSpecificOutput.additionalContext;
  const m = ctx.match(/`([^`]+)`/);
  return m ? m[1] : null;
}

const ROUTES = [
  ["lets do the pending stuff", "where-was-i"],
  ["whats the status of the liquid glass theme?", "where-was-i"],
  ["where was i on this repo", "where-was-i"],
  ["are you sure this actually works?", "verify"],
  ["did you check the table?", "verify"],
  ["ok lets commit this and push", "ship"],
  ["should we add AI outfit recommendations?", "product"],
  ["is it worth building a native app", "product"],
  ["review this diff please", "review"],
  ["lets do the search console setup", "web"],
  ["the sitemap lastmod looks wrong", "web"],
  ["why is the login broken", "superpowers:systematic-debugging"],
  ["lets build the exercise filtering experience", "superpowers:brainstorming"],
  ["add tests for the filter", "superpowers:test-driven-development"],
  ["what did this session cost in tokens", "caveman-stats"],
  ["make me a diagram of the auth flow", "diagram-design:diagram-design"],
  ["architecture diagram for workout", "diagram-design:diagram-design"],
  ["draw a flowchart", "diagram-design:diagram-design"],
  ["redesign the workout landing page", "design"],
  ["this screen looks generic, polish the ui", "design"],
  ["set up design tokens for wear", "design"],
  // Gaps found by the 2026-11-14 setup audit: these prompts got nothing.
  ["deploy workout to production", "ship"],
  ["fix the failing e2e test on the train page", "superpowers:systematic-debugging"],
  ["audit my current setup for easeur projects", "audit"],
  ["lets start a new app for finance", "new-app"],
  ["scaffold a new project for docs", "new-app"],
  // Gaps found by the 2026-11-16 review: UI and animation prompts got nothing, and
  // "review my astack" went to code review.
  ["make the workout home page animation smoother", "design"],
  ["add a hover animation to the cards", "design"],
  ["use shadcn for the settings page", "design"],
  ["make the hero look better", "design"],
  ["the onboarding ux feels janky", "design"],
  ["I want you to review my astack in details one by one each component", "audit"],
  ["run the pre-launch checklist for eat", "launch"],
  ["is workout ready to launch?", "launch"],
  ["do we need a cookie banner on the landing page", "launch"],
  ["add a privacy policy and terms of service to eat", "launch"],
  // Security skill, added 2026-11-16 (owner request).
  ["run a security review on eat before launch", "security"],
  ["do a security check of the workout ai feature", "security"],
  ["is the chat open to prompt injection", "security"],
  ["someone is burning my api credits", "security"],
  ["is it secure enough to open up", "security"],
  // Performance skill, added 2026-11-16 (owner request).
  ["run a performance check on workout before launch", "performance"],
  ["the train page feels slow on my phone", "performance"],
  ["eat is slow to load on mobile data", "performance"],
  ["the bundle size went up after that change", "performance"],
];

for (const [prompt, want] of ROUTES) {
  check(`router: "${prompt.slice(0, 38)}" -> ${want}`, () => {
    const got = routeOf(prompt);
    return got === want ? null : `got ${got}`;
  });
}

const SILENT = [
  "hi",
  "/caveman",
  "rename this variable to userId",
  "thanks, that looks good",
  "Base directory for this skill: C:/x/y",
];

for (const prompt of SILENT) {
  check(`router stays silent on "${prompt.slice(0, 30)}"`, () => {
    const got = routeOf(prompt);
    return got === null ? null : `recommended ${got}`;
  });
}

check("router honours its escape hatch", () => {
  const out = execFileSync("node", [path.join(root, "hooks", "router.cjs")], {
    input: JSON.stringify({ prompt: "lets do the pending stuff" }),
    env: { ...process.env, ASTACK_ROUTER: "off" },
    encoding: "utf8",
  });
  return out.trim() === "" ? null : "fired anyway";
});

check("router recommends at most one skill", () => {
  const out = execFileSync("node", [path.join(root, "hooks", "router.cjs")], {
    input: JSON.stringify({ prompt: "lets build it, review it, ship it and verify it" }),
    encoding: "utf8",
  });
  if (!out.trim()) return null;
  const ctx = JSON.parse(out).hookSpecificOutput.additionalContext;
  const n = (ctx.match(/`/g) || []).length / 2;
  return n <= 1 ? null : `named ${n} skills`;
});


// Real prompts Amol actually typed, taken from the transcripts. These are the cases
// that matter: the router is only useful if it fires on how he really writes, typos
// and elliptical phrasing included.
const REAL_PROMPTS = [
  ["lets do the pendinf stuff", "where-was-i"],
  ["just tell me here all the next roadmap", "where-was-i"],
  ["any more pending changes for glass effect", "where-was-i"],
  ["This search console property will help in whats?", "web"],
  ["Let me know exactly what visual changes I should expect and I will test it manually", "verify"],
  ["stop running server and start one for my testing and tel me what components to see", "verify"],
];

for (const [prompt, want] of REAL_PROMPTS) {
  check(`router (real): "${prompt.slice(0, 34)}" -> ${want}`, () => {
    const got = routeOf(prompt);
    return got === want ? null : `got ${got}`;
  });
}

// Prompts that should get nothing. A router that fires on these is noise.
const REAL_SILENT = [
  "checkout this repo https://github.com/callstack/liquid-glass",
  "finish the glass coverage",
  // Design words that also mean something else (2026-11-16).
  "the state transition in the reducer is wrong",
  "make the query faster and smoother to read",
  // Ordinary coding that mentions a security word (2026-11-16).
  "what does the rate limit header say",
];

for (const prompt of REAL_SILENT) {
  check(`router silent (real): "${prompt.slice(0, 30)}"`, () => {
    const got = routeOf(prompt);
    return got === null ? null : `recommended ${got}`;
  });
}

// ---------- every routed skill must exist ----------
check("every skill the router names is reachable", () => {
  const named = new Set(ROUTES.map(([, s]) => s));
  const missing = [];
  for (const s of named) {
    if (s.includes(":")) continue; // provided by another plugin (superpowers, diagram-design)
    if (!fs.existsSync(path.join(root, "skills", s, "SKILL.md"))) missing.push(s);
  }
  if (missing.length) return `router names skills that do not exist: ${missing.join(", ")}`;
});

check(".mcp.json offers the shadcn registry MCP for the design skill", () => {
  const m = readJSON(".mcp.json");
  if (!m.mcpServers || !m.mcpServers.shadcn) return "shadcn missing";
});

// The design skill must say which library to reach for. Amol's list, 2026-11-16.
check("design skill maps every UI library to a use", () => {
  const body = fs.readFileSync(path.join(root, "skills", "design", "SKILL.md"), "utf8").toLowerCase();
  const libs = ["shadcn", "magic ui", "kokonut", "bklit", "motion", "anime.js", "img2threejs",
    "awesome-design-md", "21st.dev", "taste-skill", "impeccable", "oil-ui"];
  const missing = libs.filter((l) => !body.includes(l));
  if (missing.length) return "missing: " + missing.join(", ");
  if (/npx impeccable install/.test(body)) return "tells the model to run a launcher that is a dead end";
});

// The launch checklist must keep every item Amol asked for (2026-11-16). A term going
// missing here means a pre-launch rule was dropped.
check("launch checklist keeps every required item", () => {
  const body = fs.readFileSync(path.join(root, "skills", "launch", "SKILL.md"), "utf8").toLowerCase();
  const need = [
    "privacy policy", "terms of service", "cookie banner", "unsubscribe", "retention",
    "contrast", "fake timers", "alt text", "keyboard", "customer logos", "licence",
    "deletion", "dark patterns", "ai-generated", "checkbox", "refund", "cancel",
    "collect only", "reviews", "claim", "parental consent", "acceptance recorded",
    "open-source", "marketing", "soc 2", "takedown", "train models", "auto-renewal",
    "sdk", "dpa", "before consent", "sub-processors", "uptime", "hidden costs",
    "business contact",
  ];
  const missing = need.filter((t) => !body.includes(t));
  return missing.length ? "missing: " + missing.join(", ") : null;
});

// The security checklist must keep every item from the two lists Amol supplied
// (2026-11-16): AI prompt-injection hardening and API cost abuse. A term going missing
// here means a security rule was dropped.
check("security checklist keeps every required item", () => {
  const body = fs.readFileSync(path.join(root, "skills", "security", "SKILL.md"), "utf8").toLowerCase();
  const need = [
    // AI feature hardening
    "server environment variables", "xml tags", "prompt injection filter", "hostile",
    "max_tokens", "user id comes from the session", "hidden text", "timeout", "allowlist",
    "tool argument", "runs on the server", "no write access", "input length",
    "confirm button", "rate limit", "canary token", "fails the schema",
    "row-level security", "sanitized before rendering", "personal data masked",
    "user role", "markdown images", "prompt injection attacks",
    // cost abuse
    "frontend code", "revoked and replaced", "bot checks", "fake signups", "daily quota",
    "chat history", "test and prod keys", "paid access is verified", "card testing",
    "per ip", "verification emails", "locked server-side", "output tokens",
    "third-party api calls", "simultaneous requests", "duplicate billable",
    "quota is reserved", "retries are capped", "upload size", "zip bombs",
    "signed expiring", "public rights on storage", "temp files", "log retention",
    "recursive function triggers", "job has a timeout", "overlap", "batch sizes",
    "concurrency are capped", "tracked by user", "spikes", "before the budget",
    "budget runs out", "kill switch", "parallel requests",
  ];
  const missing = need.filter((t) => !body.includes(t));
  return missing.length ? "missing: " + missing.join(", ") : null;
});

// BYOK in the browser is an owner decision (workout D134). The skill must not turn
// "move every AI call to the server" into an automatic FAIL for it, and must never
// aim load or attack probes at production.
check("security skill handles BYOK and keeps probes off production", () => {
  const body = fs.readFileSync(path.join(root, "skills", "security", "SKILL.md"), "utf8");
  if (!/BYOK in the browser/.test(body)) return "no BYOK branch";
  if (!/never\s+production/.test(body)) return "does not keep probes off production";
  for (const s of ["PASS", "FAIL", "N/A", "ACCEPTED"]) if (!body.includes(s)) return "missing state " + s;
});

check("launch checklist points at the security skill", () => {
  const body = fs.readFileSync(path.join(root, "skills", "launch", "SKILL.md"), "utf8");
  return /`security` skill/.test(body) ? null : "launch never sends the reader to the security skill";
});

// The performance guidelines must keep every item Amol supplied (2026-11-16). A term
// going missing here means a guideline was dropped.
check("performance guidelines keep every required item", () => {
  const body = fs.readFileSync(path.join(root, "skills", "performance", "SKILL.md"), "utf8").toLowerCase();
  const need = [
    "skeleton loading screens", "webp or avif", "duplicate api calls", "debounce",
    "pagination", "through a cdn", "background job queue", "n+1", "brotli",
    "cache frequently accessed data", "redis", "unused dependencies",
    "timeouts for external api calls", "token by token", "before the server responds",
    "lazy load images", "in parallel", "database indexes", "opentelemetry",
    "close to the database", "at build time", "third-party scripts after the page",
    "split javascript by page", "virtualize long lists", "only the columns you need",
    "connection pooling", "unnecessary re-renders", "browser caching",
    "load balance", "self-host fonts", "font weights", "real user speed",
    "slow phones and networks",
  ];
  const missing = need.filter((t) => !body.includes(t));
  return missing.length ? "missing: " + missing.join(", ") : null;
});

// Guards two things the owner's stack depends on: a static export is never told to add
// Redis, a queue or a load balancer, and a fix is never made before a measurement.
check("performance skill measures first and adds no infrastructure by default", () => {
  const body = fs.readFileSync(path.join(root, "skills", "performance", "SKILL.md"), "utf8");
  if (!/Measure before you fix/.test(body)) return "no measure-first rule";
  if (!/Never add infrastructure/.test(body)) return "no rule against adding infrastructure";
  for (const t of ["LCP", "INP", "CLS"]) if (!body.includes(t)) return "budget missing " + t;
});

// "These should be part of all products": a new app is built to the guidelines from the
// first commit, and launch does not pass without the check.
check("new-app and launch both send the reader to the performance skill", () => {
  for (const s of ["new-app", "launch"]) {
    const body = fs.readFileSync(path.join(root, "skills", s, "SKILL.md"), "utf8");
    if (!/`performance` skill/.test(body)) return s + " never names the performance skill";
  }
});

check("launch law reference covers India, EU/UK and the US, and says it is not advice", () => {
  const body = fs.readFileSync(path.join(root, "skills", "launch", "laws.md"), "utf8");
  for (const t of ["DPDP", "GDPR", "COPPA", "CAN-SPAM", "DMCA", "Dark Patterns", "Not legal advice"])
    if (!body.includes(t)) return "missing: " + t;
});

check("no skill points at the memory files that never existed", () => {
  const bad = [];
  for (const s of skillDirs) {
    const body = fs.readFileSync(path.join(root, "skills", s, "SKILL.md"), "utf8");
    if (/\.astack\/(decisions|lessons)\.md/.test(body)) bad.push(s);
  }
  return bad.length ? "still referenced in: " + bad.join(", ") : null;
});

check(".mcp.json keeps chrome-devtools available without ECC", () => {
  const m = readJSON(".mcp.json");
  if (!m.mcpServers || !m.mcpServers["chrome-devtools"]) return "chrome-devtools missing";
});

check("hooks.json registers the router on UserPromptSubmit", () => {
  const h = readJSON("hooks/hooks.json");
  const ups = h.hooks.UserPromptSubmit;
  if (!ups) return "no UserPromptSubmit entry";
  const cmds = JSON.stringify(ups);
  if (!cmds.includes("router.cjs")) return "router.cjs not wired";
  if (JSON.stringify(ups).includes('"matcher"')) return "UserPromptSubmit must not take a matcher";
});

// ---------- every script must at least parse ----------
// The session-start hook shipped with a syntax error because nothing ever executed it.
// Existence checks are not enough: run every script, every time.
const SCRIPTS = [
  "hooks/lib.cjs",
  "hooks/careful.cjs",
  "hooks/commit-gate.cjs",
  "hooks/secret-scan.cjs",
  "hooks/session-start.cjs",
  "hooks/router.cjs",
  "bin/token-stats.cjs",
  "scripts/gen-ecc-catalogue.cjs",
];

for (const s of SCRIPTS) {
  check(`syntax: ${s}`, () => {
    try {
      execFileSync("node", ["--check", path.join(root, s)], { stdio: "pipe" });
    } catch (e) {
      return String(e.stderr || e.message).split("\n").slice(0, 3).join(" ");
    }
  });
}

// ---------- token-stats counts a reply once ----------
// A reply is written as one transcript line per content block, each repeating the reply's
// usage. Summing lines overstated a real session about 3x (2026-11-16).
check("token-stats counts each model reply once, not once per transcript line", () => {
  const dir = fs.mkdtempSync(path.join(require("os").tmpdir(), "astack-stats-"));
  const file = path.join(dir, "t.jsonl");
  const line = (id, write, read, out) =>
    JSON.stringify({
      type: "assistant",
      message: { id, usage: { input_tokens: 1, cache_creation_input_tokens: write, cache_read_input_tokens: read, output_tokens: out } },
    });
  fs.writeFileSync(
    file,
    [
      line("msg_a", 1000, 5000, 10), // reply A, first block
      line("msg_a", 1000, 5000, 40), // reply A, second block: same reply, final output
      line("msg_a", 1000, 5000, 40),
      line("msg_b", 200, 6000, 7),
      JSON.stringify({ type: "user", message: { content: "hi" } }),
    ].join("\n"),
  );
  const out = execFileSync("node", [path.join(root, "bin", "token-stats.cjs"), "--session", file], { encoding: "utf8" });
  fs.rmSync(dir, { recursive: true, force: true });
  const num = (label) => {
    const m = out.match(new RegExp(label + "\\s+([\\d,]+)"));
    return m ? Number(m[1].replace(/,/g, "")) : null;
  };
  if (num("model replies") !== 2) return `replies: ${num("model replies")}, want 2`;
  if (num("cache written") !== 1200) return `cache written: ${num("cache written")}, want 1200`;
  if (num("cache read") !== 11000) return `cache read: ${num("cache read")}, want 11000`;
  if (num("output \\(total\\)") !== 47) return `output: ${num("output \\(total\\)")}, want 47`;
});

// ---------- session-start actually runs ----------
function runSessionStart(cwd) {
  const out = execFileSync("node", [path.join(root, "hooks", "session-start.cjs")], {
    input: "{}",
    cwd,
    encoding: "utf8",
    // Capture the child stderr instead of letting it pollute the report.
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (!out.trim()) return null;
  return JSON.parse(out).hookSpecificOutput;
}

check("session-start runs and emits a SessionStart payload", () => {
  const o = runSessionStart(root);
  if (!o) return "emitted nothing";
  if (o.hookEventName !== "SessionStart") return `wrong event: ${o.hookEventName}`;
  if (!o.additionalContext.includes("ASTACK spine")) return "spine not loaded";
});

check("session-start loads only the spine outside an Easeur product repo", () => {
  const o = runSessionStart(root);
  if (!o) return "emitted nothing";
  const leaked = ["Workout", "Wear —", "Health —", "Landing page"].filter((n) =>
    o.additionalContext.includes(n)
  );
  if (leaked.length) return `leaked product context: ${leaked.join(", ")}`;
});

check("session-start adds product context inside a product repo", () => {
  const workout = path.join(root, "..", "workout");
  if (!fs.existsSync(workout)) return null; // not on this machine; skip
  const o = runSessionStart(workout);
  if (!o) return "emitted nothing";
  if (!o.additionalContext.includes("Workout")) return "workout context not loaded";
  if (!o.additionalContext.includes("ASTACK spine")) return "spine missing";
});

// Eat went live on 2026-11-10 with no entry here, so its sessions got the spine only
// and its context file still said "There is no repo" (found 2026-11-14).
check("session-start adds Eat context inside the eat repo", () => {
  const eat = path.join(root, "..", "eat");
  if (!fs.existsSync(eat)) return null; // not on this machine; skip
  const o = runSessionStart(eat);
  if (!o) return "emitted nothing";
  if (!o.additionalContext.includes("Eat — product context")) return "eat context not loaded";
  if (/There is no repo/.test(o.additionalContext)) return "eat context still says there is no repo";
});

// Every product context file must be reachable, or it rots unread (as eat.md did).
check("every context/products file is registered in session-start", () => {
  const src = fs.readFileSync(path.join(root, "hooks", "session-start.cjs"), "utf8");
  const missing = fs
    .readdirSync(path.join(root, "context", "products"))
    .map((f) => f.replace(/\.md$/, ""))
    .filter((n) => !src.includes(`"${n}"`));
  if (missing.length) return `not registered: ${missing.join(", ")}`;
});

// Owner request 2026-11-16: caveman is on in every session without typing /caveman.
check("session-start turns caveman on by default", () => {
  const o = runSessionStart(root);
  if (!o) return "emitted nothing";
  if (!o.additionalContext.includes("Caveman mode: ON by default")) return "caveman block not loaded";
});

check("session-start payload stays within its context budget", () => {
  const o = runSessionStart(root);
  if (!o) return "emitted nothing";
  const tokens = Math.round(o.additionalContext.length / 4);
  if (tokens > 1500) return `~${tokens} tokens, budget is 1500`;
});

// ---------- hooks.json uses only keys Claude Code accepts ----------
// ECC warns on every start about unknown keys in its own hooks.json. Do not repeat it.
check("hooks.json carries no unknown keys", () => {
  const h = readJSON("hooks/hooks.json");
  const GROUP_OK = new Set(["matcher", "hooks"]);
  const HOOK_OK = new Set(["type", "command", "timeout", "async", "shell"]);
  const bad = [];
  for (const [event, groups] of Object.entries(h.hooks)) {
    for (const g of groups) {
      for (const k of Object.keys(g)) if (!GROUP_OK.has(k)) bad.push(`${event}.${k}`);
      for (const hk of g.hooks) {
        for (const k of Object.keys(hk)) if (!HOOK_OK.has(k)) bad.push(`${event}.hooks.${k}`);
      }
    }
  }
  if (bad.length) return `unknown keys: ${[...new Set(bad)].join(", ")}`;
});

// ---------- report ----------
console.log(`\nastack self-test: ${pass} passed, ${failures.length} failed\n`);
for (const f of failures) console.log("  FAIL  " + f);
process.exit(failures.length ? 1 : 0);
