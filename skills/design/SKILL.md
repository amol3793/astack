---
name: design
description: Use before building, redesigning, critiquing or polishing any UI — a page, component, flow, theme or design system. Reads the brief, sets visual dials, names the register (Persuade, Operate, Read, Experience), then builds or reviews against an anti-slop checklist. Not for backend work, SEO, or plain diagrams.
---

# Design

One skill, four moves. Say which one you are in.

```
  READ     what is this surface, for whom, in which register
  BUILD    make it, from the dials the read produced
  CRITIQUE look at what exists, worst problem first
  SYSTEM   tokens and DESIGN.md, so the next screen matches
```

Ideas absorbed from impeccable, taste-skill and ui-ux-pro-max (see `D008`). None of
their code is copied. Impeccable is **called** when installed; everything else here
works without it.

## READ — before any code

State one line, then proceed. Ask a question only if two readings genuinely diverge,
and then ask exactly one.

> Reading this as: `<surface>` for `<audience>`, register `<register>`, leaning `<direction>`.

**Register** decides almost everything, so name it from the *surface*, not the product:

| Register | Visitor's success | Brand shows up as | Easeur default |
|---|---|---|---|
| Persuade | decides and acts | the whole design | landing page, marketing |
| Operate | completes a task | precise details | Workout, Health, Wear app UI |
| Read | understands something | the reading experience | docs, exercise pages, changelog |
| Experience | is inside the work | the interface recedes | anatomy viewer, wardrobe |

A tool's landing page is Persuade. Its settings page is Operate. Do not carry one
register across the other.

**Quiet constraints override taste.** Health data, accessibility, trust-first, kids:
lower the dials, raise contrast, remove surprise. The brief wins over your preference —
redirecting a clear brief toward your own taste is a failure.

## Dials

Set three, 1-10, from the read. State them. Every later choice is gated by them.

```
  VARIANCE   1 symmetric ......... 10 chaotic
  MOTION     1 static ............ 10 cinematic
  DENSITY    1 gallery ........... 10 cockpit
```

| Surface | VAR | MOT | DEN |
|---|---|---|---|
| Marketing / landing | 7 | 6 | 4 |
| Product app UI (Operate) | 3 | 3 | 6 |
| Docs, long reads | 4 | 2 | 4 |
| Health, trust-first | 3 | 2 | 5 |
| Portfolio, showcase | 8 | 7 | 3 |

Redesign-preserve: match the existing dials, motion +1. Redesign-replace: variance +2,
and treat the old look as an anti-reference, never as a base to polish.

## BUILD

1. **Inspect what exists first.** Existing tokens, `DESIGN.md`, components, Tailwind
   config. A missing `DESIGN.md` does not mean greenfield.
2. **Use the real system when the brief names one.** shadcn, Radix, Material, Fluent:
   install the official package, do not hand-recreate its CSS, and do not import a
   system's tokens then override most of them. One system per project.
3. **Reuse ladder applies** (spine): repo component, then platform CSS, then installed
   dependency. No new UI dependency for what a few lines of CSS cover.
4. **Build everything, then look once.** Desktop and mobile together, fix the whole batch,
   confirm at most once more, stop. Open-ended self-polish costs more than it finds.
5. **Hand off to `astack:web` VISUAL mode** for the browser pass. Do not claim it looks
   right from the code.

If `frontend-design` is available it supplies the aesthetic push; this skill supplies
the read, the dials and the floor. Do not run both as separate workflows.

## Anti-slop floor

Reject on sight, whoever wrote it:

- Inter / Arial / system-default type as the only voice; AI purple-blue gradients
- cards nested in cards; every section wrapped in a card
- gray text on a coloured background; pure `#000` / `#808080` (tint neutrals)
- the rounded-square icon tile above every heading; three equal feature cards
- bounce or elastic easing; infinite micro-animations
- centered hero over a dark mesh gradient; glass on everything
- emoji used as icons

Plus the ones no linter catches: a heading hierarchy that disagrees with visual weight,
a control with no hover, focus or disabled state, a removed focus ring with no
replacement, copy that describes the feature instead of the user's gain.

## Resilience — the production failures

- Text reflows at 400px, at browser zoom and with large text. Long identifiers wrap.
- Chips and tags wrap or use an operable `+n`. Truncation needs a full-value path for
  keyboard, pointer and touch.
- Colour is never the only carrier of meaning. Contrast: 4.5:1 body, 3:1 large text.
- `prefers-reduced-motion` respected. Rapid interaction may cancel animation but the
  final state, focus and content must stay correct.
- Empty, loading, error and offline states exist for every list and every fetch.
- Both themes checked if the surface has both.

## Scale — design the screen for the 1M-user version

A screen that works with 20 rows and one user is half designed. Before BUILD, answer:
what does this look like with 10,000 items, and what does it ask a server for? Lists are
paginated or virtualised, images come as static assets, and nothing on the screen needs
a paid service or a per-request server. The `scale` skill has the free-tier limits and
the `performance` skill has the build guidelines.

## CRITIQUE

Findings worst first, each with the file that owns it. Use the `review` confidence rule:
if you cannot quote the line or point at the pixel, suppress it.

```
  1  does it do the job          task completes, primary action obvious
  2  hierarchy                   one thing reads first, then second
  3  consistency                 same thing looks the same everywhere
  4  states                      hover, focus, disabled, empty, error, loading
  5  accessibility               contrast, focus order, labels, motion
  6  responsive                  400px, 768px, 1440px
  7  craft                       spacing rhythm, alignment, type scale
  8  slop                        the floor above
```

Stop at the first level that is badly broken. Tuning craft on a screen whose primary
action is unclear wastes the pass.

If impeccable is installed, `/impeccable critique` and `/impeccable audit` give a scored
version and its detector runs 61 deterministic rules with no LLM. Use them for the
evidence; keep the report in this format.

## SYSTEM

When a second screen has to match the first:

1. Extract tokens (colour, type scale, spacing, radius, motion durations) from the code
   that exists. Do not invent a palette.
2. Write them to the repo's `DESIGN.md` in the open format, in the same change as the
   code. A design file that lags the code is worse than none.
3. Name the register and dials in it, so the next session does not re-derive them.

Cross-app consistency (Workout, Health, Wear sharing a family) is a decision for
Amol, not a default. Propose, do not impose; record it as a D-entry in `BUILD_STATE.md`.

## Where to use what

Pick from this table before writing a component by hand. First row that fits wins.
The reuse ladder still applies: what the repo already has beats all of it.

| Need | Use | How |
|---|---|---|
| Base primitives: button, dialog, form, table, sheet, tabs | **shadcn/ui** | shadcn MCP (`search`, `view`, `add`), or `npx shadcn@latest add <name>` |
| Marketing sections: hero, marquee, bento, animated text, backgrounds | **Magic UI** | `npx shadcn@latest add @magicui/<name>` |
| Micro-interactions: fancy inputs, buttons, cards, AI-chat pieces | **Kokonut UI** | `npx shadcn@latest add @kokonutui/<name>` |
| Charts | **Bklit UI** | `npx shadcn@latest add @bklit/<name>`; docs at `bklit.com/llms.txt` |
| Animation in React: enter/exit, layout, gestures, scroll, springs | **Motion** (`motion/react`) | the default engine. One engine per app |
| SVG path drawing, morphing, long sequenced timelines | **Anime.js** | only when Motion cannot. Lazy-load it |
| 3D from a reference image, Experience register only | **img2threejs** + three | never on an Operate screen |
| Brand reference: "feel like Linear / Stripe" | **awesome-design-md** | read the matching DESIGN.md as input to READ. Do not copy a brand |
| One-off inspiration for a block | **21st.dev** | opt-in, needs an API key. Ask before sending a prompt there |
| Critique rules | this skill's floor; `taste-skill`, `impeccable`, `oil-ui` as text | read their rules, do not install their hooks or launchers |

Rules that keep the result smooth:

1. Registries are namespaces in the repo's `components.json`. Eat has `@kokonutui` and
   `@bklit`. Add a namespace before using it; the code is copied in, so read it.
2. Animate `transform` and `opacity` only. Durations 150 to 300 ms for UI, longer only
   for a hero. Honour `prefers-reduced-motion` on every animation.
3. MOTION dial sets the budget: 1 to 3 = hover and focus states only; 4 to 6 = enter
   and layout transitions; 7 and up = scroll and choreography, Persuade or Experience only.
4. An Operate screen (Train, a form, settings) gets shadcn plus small Motion feedback.
   No marquee, no parallax, no 3D.
5. Check the weight: a new animation library is a dependency. Motion is already in Eat;
   elsewhere add it once, not Motion and Anime.js both for the same job.
6. Verify in the browser at 400px on a throttled CPU. A dropped frame is a defect.

Impeccable's launcher downloads a binary: read it as text, never run it (dead end).
