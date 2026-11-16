#!/usr/bin/env node
// astack router — recommends the right skill before you have to remember it.
//
// Fires on UserPromptSubmit. Classifies the prompt, and if one skill clearly
// fits, injects a single line naming it. The model still decides; this only
// makes sure the option is on the table.
//
// Design rules, learned from watching 350 skills go unused:
//   - At most ONE recommendation per prompt. A menu is what we are escaping.
//   - Stay silent unless the score clears a threshold. A router that fires on
//     everything gets ignored exactly like a 285-skill listing does.
//   - Never fire when the user already named a skill.
//
// Escape hatch: ASTACK_ROUTER=off

const { readInput } = require("./lib.cjs");

if (process.env.ASTACK_ROUTER === "off") process.exit(0);

const input = readInput();
const prompt = String(input.prompt || "").trim();

// Too short to classify, or the user already picked a skill.
if (prompt.length < 12) process.exit(0);
if (/^\s*\//.test(prompt)) process.exit(0);
if (/\bBase directory for this skill\b/.test(prompt)) process.exit(0);

const p = prompt.toLowerCase();

// Each rule: [weight, pattern]. Patterns come from two months of real prompts.
const RULES = [
  [
    "where-was-i",
    "read the records and tell you where this build actually is",
    [
      [3, /\bwhere (was|did) i\b/],
      [3, /\bwhat'?s? (the )?(status|next|pending|left)\b/],
      [3, /\blets? do the pend/],
      [3, /\b(next |the )?roadmap\b/],
      [3, /\bany more pend/],
      [2, /\b(finish|complete) the \w+/],
      [2, /\bwhat(.s| is) (left|remaining|outstanding)\b/],
      [2, /\b(status|roadmap|pending|left off|catch up)\b/],
      [2, /\bwhat did (i|we) decide\b/],
      [1, /\b(resume|continue where)\b/],
    ],
  ],
  [
    "verify",
    "establish evidence and hand you a manual test, instead of claiming done",
    [
      [3, /\b(are you sure|did you (check|verify|test|run)|prove it)\b/],
      [3, /\bis it (actually )?(working|done|fixed|live|deployed)\b/],
      [2, /\b(verify|confirm|double.?check|make sure)\b/],
      [2, /\bhow do (i|we) know\b/],
      [3, /\b(i|ill|i will) (test|check) (it|this)( manually)?\b/],
      [3, /\bwhat (changes|should i expect|to (test|see|look))\b/],
      [3, /\bwhere should i test\b/],
      [3, /\b(start|run|restart).{0,25}server/],
      [3, /\btell? me what.{0,30}(to test|to see|components|changes)/],
      [2, /\bfor my testing\b/],
      [2, /\btell me what (to test|components to see|changes)\b/],
    ],
  ],
  [
    "ship",
    "verify, stop for your manual test, then commit",
    [
      [3, /\b(ship it|commit (this|it|the)|push (this|it|to)|create a pr|raise a pr)\b/],
      [2, /\b(deploy|merge|release|go live)\b/],
      [2, /\b(to|in|on) prod(uction)?\b/],
      [1, /\bdeploy (it|this|that|workout|eat|wear|health|landing|the \w+)\b/],
      [2, /\bready to (ship|commit|push)\b/],
    ],
  ],
  [
    "product",
    "challenge the assumption and force an MVP split before any code",
    [
      [3, /\bshould (we|i) (build|add|make|ship)\b/],
      [3, /\b(is it|would it be) worth (it|building)\b/],
      [3, /\b(ai|llm|model) (feature|recommend|suggest|powered)\b/],
      [2, /\b(monetiz|pricing|business model|users would|adoption)\b/],
      [2, /\bnew (product|feature) idea\b/],
    ],
  ],
  [
    "audit",
    "check astack and the setup around it for rot: stale facts, dead skills, router gaps",
    [
      [4, /\baudit (astack|(my |the |our )?(current |whole |claude )?(setup|tooling|workflow))\b/],
      [5, /\b(review|check|audit|improve) (my |the |our )?(astack|claude setup|skills and hooks)\b/],
      [3, /\b(astack|the router|my setup) (is|feels|seems) (stale|wrong|off|broken)\b/],
    ],
  ],
  [
    "new-app",
    "scaffold the repo, CI, deploy, watch and astack context from the newest live app",
    [
      [4, /\b(start|scaffold|bootstrap|set ?up|spin up|create) (a |an |the )?(new |next )?(app|project|product|repo)\b/],
      [3, /\bnew (app|repo|project) for\b/],
    ],
  ],
  [
    "review",
    "review with confidence scores, and suppress findings it cannot quote",
    [
      [3, /\b(review (this|the|my)|code review|audit (this|the))\b/],
      [2, /\b(look over|critique|any (bugs|issues) in)\b/],
    ],
  ],
  [
    "web",
    "check the running site: SEO, browser pass, or visual review",
    [
      [3, /\b(seo|sitemap|robots\.txt|structured data|schema markup|lighthouse)\b/],
      [2, /\b(meta (tag|description)|canonical|core web vitals|crawl)\b/],
      [3, /\bsearch console\b/],
    ],
  ],
  [
    "design",
    "read the surface, set the visual dials, then build or critique against the anti-slop floor",
    [
      [3, /\b(redesign|re-design|restyle|design system|design tokens?|anti.?slop)\b/],
      [3, /\b(ui\/ux|ux review|visual hierarchy|typography|colou?r palette)\b/],
      [3, /\b(design|polish|critique) (the |this |my )?(ui|landing page|hero|screen|layout|theme)\b/],
      [3, /\b(make|build|create) (me |the |a |an )?(new )?(landing page|hero section|dashboard ui|component library)\b/],
      [2, /\b(looks?|feels?) (bland|generic|boring|ugly|dated|off|templated)\b/],
      [2, /\b(more (polished|premium|modern)|spacing|font pairing)\b/],
      // Gaps found 2026-11-16: every animation and UX prompt got silence.
      [3, /\b(animations?|animate|micro.?interactions?|parallax|hover (effect|state|animation))\b/],
      [3, /\b(user experience|ux|onboarding flow|janky|jank)\b/],
      // Weak alone on purpose: "state transition" and "smoother to read" are not UI.
      [2, /\b(transitions?|smoother|laggy)\b/],
      [3, /\b(shadcn|magic ?ui|kokonut|bklit|21st\.dev|motion\.dev|anime\.?js|three\.?js)\b/],
      [3, /\b(make|get) (the |this |my )?[\w ]{0,30}(look|feel) (better|good|nicer|premium|smooth)/],
    ],
  ],
  // Added 2026-11-16 (owner request). Sits before "launch" and scores 5 on its own name so
  // "security review before launch" goes here, not to the legal checklist.
  [
    "security",
    "run the security and cost-abuse checklist: secrets, prompt injection, rate limits, spend caps",
    [
      [5, /\bsecurity (review|check|checklist|audit|pass|posture)\b/],
      [3, /\b(prompt injection|jailbreak|leaked (api )?keys?|api abuse|credit abuse|card testing|pen ?test)\b/],
      [3, /\b(burning|abusing|draining) (my |our |the )?(api )?(credits|quota|budget)\b/],
      [3, /\bis (it|this|\w+) (secure|hackable|safe from (attack|abuse))\b/],
      [3, /\bharden (the |this |my )?\w+/],
      // Weak alone on purpose: "add a rate limit to this route" is ordinary coding.
      [2, /\b(rate.?limit(s|ing)?|spend(ing)? (cap|limit)|kill switch)\b/],
    ],
  ],
  // Added 2026-11-16 (owner request). No "make X faster" pattern on purpose: "make the
  // query faster to read" is not a speed complaint. Lighthouse and Core Web Vitals stay
  // with "web".
  [
    "performance",
    "apply the performance guidelines, measure against the budget, and report with evidence",
    [
      [5, /\bperformance (review|check|checklist|audit|budget|guidelines?|pass)\b/],
      [3, /\b(feels?|is|are|so|too|really|very) (slow|sluggish)\b/],
      [3, /\b(slow to load|loads? slow(ly)?|page speed|speed check|load(ing)? time|bundle size|n\+1)\b/],
      [3, /\b(skeleton (loader|loading|screen)s?|lazy.?load(ing)?|virtuali[sz]e)\b/],
    ],
  ],
  [
    "launch",
    "run the pre-launch checklist: legal, privacy, accessibility, honesty, past lessons",
    [
      [4, /\b(pre.?launch|launch (check|checklist|ready|readiness)|ready (to|for) launch|before (we |i )?launch)/],
      [3, /\b(privacy policy|terms of service|cookie banner|refund policy|dpdp|gdpr|compliance check)\b/],
      [3, /\b(go public|open (it )?to (real )?users|public launch)\b/],
    ],
  ],
  [
    "diagram-design:diagram-design",
    "draw it as an editorial HTML/SVG diagram you can publish",
    [
      [3, /\b(make|draw|create|generate) (me )?(a|an|the)? ?\w*\s?(diagram|flowchart)/],
      [3, /\b(architecture|sequence|flow|state|org|gantt|sankey) diagram\b/],
      [3, /\b(flowchart|wardley map|fishbone|swimlane|user journey)\b/],
      [2, /\b(visuali[sz]e|diagram) (this|it|the)\b/],
      [2, /\b(mermaid|excalidraw|drawio)\b/],
    ],
  ],
  [
    "caveman-stats",
    "show what this session actually cost in tokens",
    [
      [3, /\b(token (usage|cost)|how many tokens|what did this (session )?cost)\b/],
      [2, /\bcontext (usage|left|window)\b/],
    ],
  ],
  [
    "superpowers:systematic-debugging",
    "find the root cause before proposing a fix",
    [
      [3, /\bwhy (is|are|does|did).{0,40}(broken|failing|fail|not work)/],
      [3, /\b(it.?s broken|not working|stopped working)\b/],
      [3, /\b(fix (this|the) bug|debug (this|the))\b/],
      [3, /\b(fix|debug) (the |this |that |a )?(failing|broken|flaky|red)\b/],
      [2, /\b(error|exception|stack trace|500|crash|fails?)\b/],
      [2, /\bit was working (yesterday|before)\b/],
    ],
  ],
  [
    "superpowers:brainstorming",
    "settle intent and design before implementation starts",
    [
      [3, /\b(lets?|let'?s) (build|add|create|make)\b/],
      [3, /\bbuild (me |the |a |an )?\w+/],
      [2, /\b(implement|add a|create a|new feature)\b/],
    ],
  ],
  [
    "superpowers:writing-plans",
    "turn this into a written plan before touching code",
    [
      [3, /\b(write (a|the) plan|plan (this|it) out|implementation plan)\b/],
      [2, /\bhow should (we|i) (structure|approach|architect)\b/],
    ],
  ],
  [
    "superpowers:test-driven-development",
    "write the failing test first",
    [
      [3, /\b(write tests?|add tests?|test coverage|tdd)\b/],
      [2, /\b(vitest|playwright|unit test|e2e test)\b/],
    ],
  ],
];

const THRESHOLD = 3;
let best = null;

for (const [skill, why, patterns] of RULES) {
  let score = 0;
  for (const [weight, pattern] of patterns) if (pattern.test(p)) score += weight;
  if (score >= THRESHOLD && (!best || score > best.score)) best = { skill, why, score };
}

if (!best) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext:
        `[astack router] This looks like a job for \`${best.skill}\` — it will ` +
        `${best.why}. Invoke it unless the request is genuinely trivial, and say ` +
        `which skill you are using. If it does not fit, ignore this line.`,
    },
  })
);
