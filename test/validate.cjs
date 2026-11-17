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
  // Scale skill, added 2026-11-17 (owner rule).
  ["will this design handle 1m users", "scale"],
  ["are we still inside the supabase free tier", "scale"],
  ["do we need to upgrade the plan for wear", "scale"],
  ["how many users can eat sync handle", "scale"],
  // Model-routing skill, added 2026-11-17 (owner request).
  ["set up model routing so cheap models do the routine work", "model-routing"],
  ["how do i reduce token usage on long sessions", "model-routing"],
  ["use fable only as an advisor for this refactor", "model-routing"],
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
  // The prompt that asked for the model-routing skill, verbatim (2026-11-17).
  ["I want to create a skill in astack so that in a complex task we use higher models like opus and fable only as a advisors and most of the task can simply handeled by lower models", "model-routing"],
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

// Amol's UX list, 2026-11-17: twenty rules, each one must stay in the design skill.
check("design skill keeps all twenty UX rules", () => {
  const body = fs.readFileSync(path.join(root, "skills", "design", "SKILL.md"), "utf8");
  const need = [
    "Reduce choices per screen", "Make targets large", "Follow familiar patterns",
    "Group related information", "Break content into chunks", "Interactions within 400 ms",
    "Highlight the primary action", "Place key actions nearby", "Put essentials first",
    "End flows memorably", "Show visible progress", "Simplify complex interfaces",
    "Use sensible defaults", "Prevent errors proactively", "Make errors recoverable",
    "Maintain pattern consistency", "Connect related elements visually",
    "Reduce task completion time", "Reveal complexity gradually", "Make completion feel closer",
  ];
  const missing = need.filter((t) => !body.includes(t));
  if (missing.length) return "missing: " + missing.join(", ");
  for (let i = 1; i <= 20; i++) if (!body.includes("| U" + i + " |")) return "no row U" + i;
});

// Design audit, 2026-11-17: rules outside the workflow are not applied. BUILD must send
// the reader through the UX rules, the HIG habits and Scale, and CRITIQUE must end in a
// report with evidence. The HIG block must stay dated and name where it was read.
check("design skill applies its rules in BUILD and reports them in CRITIQUE", () => {
  const body = fs.readFileSync(path.join(root, "skills", "design", "SKILL.md"), "utf8");
  if (!/Walk the main task before any code/.test(body)) return "BUILD has no main-task step";
  if (!/U1-U20/.test(body) || !/H1-H10/.test(body)) return "BUILD or CRITIQUE does not name U1-U20 and H1-H10";
  if (!/design critique:/.test(body) || !/Never write SOUND with a FAIL/.test(body)) return "no critique report";
  if (!/INP 200 ms/.test(body)) return "U12 does not point at the INP budget";
});

check("design skill keeps the ten Apple HIG habits, dated and sourced", () => {
  const body = fs.readFileSync(path.join(root, "skills", "design", "SKILL.md"), "utf8");
  for (let i = 1; i <= 10; i++) if (!body.includes("| H" + i + " |")) return "no row H" + i;
  if (!/Human Interface Guidelines on \d{4}-\d{2}-\d{2}/.test(body)) return "no read date";
  if (!body.includes("tutorials/data/design/human-interface-guidelines")) return "no source path";
});

// Owner rule, 2026-11-17: design for 1M users, stay on free tiers until there is revenue.
// It must be in the spine (so every session and every skill has it by default), and the
// skill must keep its two halves: no rewrite to scale, no paying before revenue.
check("spine carries the scale and free-tier rule", () => {
  const body = fs.readFileSync(path.join(root, "context", "spine.md"), "utf8");
  if (!/1M users/.test(body)) return "no 1M users rule";
  if (!/free tiers/.test(body)) return "no free-tier rule";
  if (!/`scale` skill/.test(body)) return "does not name the scale skill";
});

check("scale skill keeps the free-tier gate and the honest ceiling", () => {
  const body = fs.readFileSync(path.join(root, "skills", "scale", "SKILL.md"), "utf8");
  const need = [
    "never the architecture", "until the app has paying users", "capacity sheet",
    "50,000", "100,000", "500 MB", "plan change", "Amol confirms",
    "Never propose a paid plan", "first wall", "free-tiers.md",
  ];
  const missing = need.filter((t) => !body.includes(t));
  return missing.length ? "missing: " + missing.join(", ") : null;
});

// A limit with no source or date is a guess. The table must say when it was read and
// when to read it again, and cover the three vendors Easeur runs on.
check("free-tier limits are dated, sourced and cover all three vendors", () => {
  const body = fs.readFileSync(path.join(root, "skills", "scale", "free-tiers.md"), "utf8");
  if (!/Read from the vendors' own pages on \*\*\d{4}-\d{2}-\d{2}\*\*/.test(body)) return "no read date";
  if (!/Re-check after \*\*\d{4}-\d{2}-\d{2}\*\*/.test(body)) return "no re-check date";
  for (const t of ["Cloudflare", "Supabase", "GitHub", "developers.cloudflare.com", "supabase.com/pricing", "docs.github.com", "Not read yet"])
    if (!body.includes(t)) return "missing: " + t;
});

check("product, design and new-app all send the reader to the scale skill", () => {
  for (const s of ["product", "design", "new-app"]) {
    const body = fs.readFileSync(path.join(root, "skills", s, "SKILL.md"), "utf8");
    if (!/`scale` skill/.test(body)) return s + " never names the scale skill";
  }
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

// ---------- model-routing (added 2026-11-17, owner request) ----------
// Guards: strong models stay advisors, cheap models do the work, and the checkpoints are
// enforced by a hook rather than remembered.
function agentFrontmatter(name) {
  const t = fs.readFileSync(path.join(root, "agents", name + ".md"), "utf8");
  const m = t.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : "";
}

check("advisor agent is pinned to Fable and cannot edit", () => {
  const fm = agentFrontmatter("advisor");
  if (!/^name:\s*advisor$/m.test(fm)) return "name is not advisor";
  if (!/^model:\s*fable$/m.test(fm)) return "not pinned to fable";
  const tools = (fm.match(/^tools:\s*(.+)$/m) || [])[1] || "";
  if (!tools) return "no tools line, so it inherits every tool";
  if (/\b(Edit|Write|Bash|PowerShell|NotebookEdit)\b/.test(tools)) return `can change things: ${tools}`;
});

check("scout agent is pinned to Haiku and cannot edit", () => {
  const fm = agentFrontmatter("scout");
  if (!/^model:\s*haiku$/m.test(fm)) return "not pinned to haiku";
  const tools = (fm.match(/^tools:\s*(.+)$/m) || [])[1] || "";
  if (!tools) return "no tools line, so it inherits every tool";
  if (/\b(Edit|Write|Bash|PowerShell|NotebookEdit)\b/.test(tools)) return `can change things: ${tools}`;
});

check("judgment skills are pinned to Opus, and only those", () => {
  const want = new Set(["review", "security", "scale", "launch", "product"]);
  for (const s of skillDirs) {
    const t = fs.readFileSync(path.join(root, "skills", s, "SKILL.md"), "utf8");
    const fm = t.match(/^---\n([\s\S]*?)\n---/)[1];
    const model = (fm.match(/^model:\s*(\S+)/m) || [])[1] || null;
    if (want.has(s) && model !== "opus") return `${s} is on ${model}, want opus`;
    if (!want.has(s) && model) return `${s} pins ${model}; only the judgment skills pin a model`;
  }
});

check("model-routing thresholds parse and are whole numbers above zero", () => {
  const c = readJSON("skills/model-routing/routing.json");
  for (const k of ["planGateFiles", "reviewGateFiles", "escalateAfterFailures"]) {
    if (!Number.isInteger(c[k]) || c[k] < 1) return `${k} is ${c[k]}`;
  }
});

check("model-routing skill keeps the quality floor and names what is enforced", () => {
  const body = fs.readFileSync(path.join(root, "skills", "model-routing", "SKILL.md"), "utf8");
  const need = [
    "routing-gate.cjs\" arm", "The quality floor", "Escalation ladder", "Score the task",
    "What is enforced and what is advice", "planGateFiles", "reviewGateFiles",
    "escalateAfterFailures", "ASTACK_ROUTING=off", "Never spawn a worker on Opus or Fable",
    "Do not invent a saving you did not measure",
  ];
  const missing = need.filter((t) => !body.includes(t));
  return missing.length ? "missing: " + missing.join(", ") : null;
});

// Guards: invoking the skill with no task hands back the brief template, and a task in
// plain words is turned into a brief by the model, not by a form (owner request, 2026-11-17).
check("model-routing skill preloads the task brief and takes the task as an argument", () => {
  const body = fs.readFileSync(path.join(root, "skills", "model-routing", "SKILL.md"), "utf8");
  const need = ["argument-hint:", "$ARGUMENTS", "Goal:", "Scope:", "Done when:", "Risky:", "Unknown:", "do not make Amol fill a form"];
  const missing = need.filter((t) => !body.includes(t));
  return missing.length ? "missing: " + missing.join(", ") : null;
});

check("hooks.json wires routing-gate to every event it handles", () => {
  const h = readJSON("hooks/hooks.json").hooks;
  const wired = (event, tool) =>
    (h[event] || []).some(
      (g) =>
        g.hooks.some((x) => x.command.includes("routing-gate.cjs")) &&
        (!tool || (g.matcher || "").split("|").includes(tool))
    );
  const need = [
    ["PreToolUse", "Write"], ["PreToolUse", "Edit"], ["PreToolUse", "Skill"],
    ["PostToolUse", "Bash"], ["PostToolUseFailure", "Bash"], ["PostToolUseFailure", "PowerShell"],
    ["SubagentStop", null], ["Stop", null],
  ];
  const missing = need.filter(([e, t]) => !wired(e, t)).map(([e, t]) => e + (t ? ":" + t : ""));
  if (missing.length) return "not wired: " + missing.join(", ");
  // A matcher that names agent types would miss a plugin-prefixed "astack:advisor".
  if (h.SubagentStop.some((g) => "matcher" in g)) return "SubagentStop must not take a matcher";
});

// Behaviour: one fake session, driven through the events in order.
{
  const os = require("os");
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "astack-routing-test-"));
  const gate = path.join(root, "hooks", "routing-gate.cjs");
  const fire = (payload, env = {}) => {
    const out = execFileSync("node", [gate], {
      input: JSON.stringify(payload),
      env: { ...process.env, ASTACK_ROUTING_DIR: stateDir, ASTACK_ROUTING: "", ...env },
      encoding: "utf8",
    });
    if (!out.trim()) return null;
    const j = JSON.parse(out);
    return j.hookSpecificOutput ? j.hookSpecificOutput.permissionDecision : j.decision;
  };
  const edit = (session, file, extra = {}) =>
    fire({
      session_id: session,
      hook_event_name: "PreToolUse",
      tool_name: "Edit",
      tool_input: { file_path: file },
      ...extra,
    });
  const advisorDone = (session, type = "astack:advisor") =>
    fire({ session_id: session, hook_event_name: "SubagentStop", agent_id: "a1", agent_type: type });
  const stop = (session, active = false) =>
    fire({ session_id: session, hook_event_name: "Stop", stop_hook_active: active });
  const shellFails = (session) =>
    fire({ session_id: session, hook_event_name: "PostToolUseFailure", tool_name: "Bash", error: "Exit code 1" });

  check("routing-gate does nothing in a session that never armed it", () => {
    for (const f of ["a", "b", "c", "d", "e"]) {
      const d = edit("unarmed", `D:/repo/src/${f}.ts`);
      if (d !== null) return `edit ${f} got ${d}`;
    }
    return stop("unarmed") === null ? null : "blocked a stop";
  });

  check("routing-gate arms when the model-routing skill is invoked", () => {
    fire({ session_id: "s1", hook_event_name: "PreToolUse", tool_name: "Skill", tool_input: { skill: "astack:model-routing" } });
    return fs.existsSync(path.join(stateDir, "s1.json")) ? null : "no state file written";
  });

  check("routing-gate ignores other skills", () => {
    fire({ session_id: "other", hook_event_name: "PreToolUse", tool_name: "Skill", tool_input: { skill: "astack:review" } });
    return fs.existsSync(path.join(stateDir, "other.json")) ? "armed on astack:review" : null;
  });

  check("routing-gate allows the first three files, then denies a fourth", () => {
    for (const f of ["a", "b", "c"]) {
      const d = edit("s1", `D:/repo/src/${f}.ts`);
      if (d !== null) return `file ${f} got ${d}`;
    }
    const d = edit("s1", "D:/repo/src/d.ts");
    return d === "deny" ? null : `fourth file got ${d}`;
  });

  check("routing-gate lets a known file be edited again while the gate is closed", () => {
    const d = edit("s1", "D:\\repo\\src\\A.ts"); // same file, Windows spelling
    return d === null ? null : `got ${d}`;
  });

  check("routing-gate does not gate subagents or scratch files", () => {
    const sub = edit("s1", "D:/repo/src/e.ts", { agent_id: "w1", agent_type: "general-purpose" });
    if (sub !== null) return `subagent edit got ${sub}`;
    const tmp = edit("s1", path.join(os.tmpdir(), "claude", "scratch.diff"));
    return tmp === null ? null : `scratch file got ${tmp}`;
  });

  check("routing-gate blocks the stop once when three files changed unreviewed", () => {
    if (stop("s1") !== "block") return "did not block";
    return stop("s1", true) === null ? null : "blocked again while stop_hook_active";
  });

  check("routing-gate is not opened by an agent that is not the advisor", () => {
    advisorDone("s1", "astack:scout");
    const d = edit("s1", "D:/repo/src/d.ts");
    return d === "deny" ? null : `got ${d}`;
  });

  check("routing-gate opens both gates when the advisor finishes", () => {
    advisorDone("s1");
    const d = edit("s1", "D:/repo/src/d.ts");
    if (d !== null) return `fourth file still got ${d}`;
    return stop("s1") === null ? null : "stop blocked right after a review";
  });

  check("routing-gate escalates on the third shell failure in a row, not before", () => {
    if (shellFails("s1") !== null) return "fired on failure 1";
    if (shellFails("s1") !== null) return "fired on failure 2";
    return shellFails("s1") === "block" ? null : "silent on failure 3";
  });

  check("routing-gate resets the failure count after a shell success", () => {
    shellFails("s1");
    fire({ session_id: "s1", hook_event_name: "PostToolUse", tool_name: "Bash" });
    if (shellFails("s1") !== null) return "fired on failure 1 after a success";
    return shellFails("s1") === null ? null : "fired on failure 2 after a success";
  });

  check("routing-gate honours its escape hatch", () => {
    fire({ session_id: "s2", hook_event_name: "PreToolUse", tool_name: "Skill", tool_input: { skill: "model-routing" } });
    for (const f of ["a", "b", "c"]) edit("s2", `D:/repo/src/${f}.ts`);
    const d = edit("s2", "D:/repo/src/d.ts", {});
    if (d !== "deny") return `control case got ${d}`;
    const off = fire(
      { session_id: "s2", hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path: "D:/repo/src/d.ts" } },
      { ASTACK_ROUTING: "off" }
    );
    return off === null ? null : `got ${off}`;
  });

  check("routing-gate arm, status and disarm work from the command line", () => {
    const env = { ...process.env, ASTACK_ROUTING_DIR: stateDir };
    execFileSync("node", [gate, "arm", "cli"], { env, encoding: "utf8" });
    const status = JSON.parse(execFileSync("node", [gate, "status", "cli"], { env, encoding: "utf8" }));
    if (!status.state || !status.state.armed) return "arm did not arm";
    if (status.config.planGateFiles !== readJSON("skills/model-routing/routing.json").planGateFiles) return "status does not read routing.json";
    execFileSync("node", [gate, "disarm", "cli"], { env, encoding: "utf8" });
    return fs.existsSync(path.join(stateDir, "cli.json")) ? "disarm left the state file" : null;
  });

  fs.rmSync(stateDir, { recursive: true, force: true });
}

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
  "hooks/routing-gate.cjs",
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
