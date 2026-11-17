---
name: design
description: Use before building, redesigning, critiquing or polishing any UI — a page, component, flow, theme or design system. Reads the brief, sets visual dials, names the register (Persuade, Operate, Read, Experience), then builds or reviews against twenty UX rules, the Apple HIG habits that transfer to the web, and an anti-slop checklist. Also for usability problems: a confusing flow, too many choices, small tap targets, unclear errors, onboarding friction. Not for backend work, SEO, or plain diagrams.
---

# Design

One skill, four moves. Say which one you are in.

```
  READ     what is this surface, for whom, in which register
  BUILD    make it, from the dials the read produced
  CRITIQUE look at what exists, worst problem first
  SYSTEM   tokens and DESIGN.md, so the next screen matches
```

Ideas absorbed from impeccable, taste-skill, ui-ux-pro-max (see `D008`) and Apple's
Human Interface Guidelines. None of their code is copied, and no Apple skill pack is
installed: those are written for SwiftUI and UIKit, and every Easeur app is a web app. Impeccable is **called** when installed; everything else here
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
2. **Walk the main task before any code.** Write the steps a user takes to finish the
   one job of this screen, then run them against the UX rules (U1-U24), the HIG habits
   (H1-H10) and the Scale question below. Draw every component to the craft rules
   (C1-C10) and give each touch its motion answer (M1-M6, A1-A12). Fix the flow on paper; it is cheapest there.
3. **Use the real system when the brief names one.** shadcn, Radix, Material, Fluent:
   install the official package, do not hand-recreate its CSS, and do not import a
   system's tokens then override most of them. One system per project.
4. **Reuse ladder applies** (spine): repo component, then platform CSS, then installed
   dependency. No new UI dependency for what a few lines of CSS cover.
5. **Build everything, then look once.** Desktop and mobile together, fix the whole batch,
   confirm at most once more, stop. Open-ended self-polish costs more than it finds.
6. **Hand off to `astack:web` VISUAL mode** for the browser pass. Do not claim it looks
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

## Component craft — how the pieces are drawn (owner list, 2026-11-17)

Ten details that separate a built component from a sloppy one. BUILD applies them,
CRITIQUE checks them at level 7 (craft). Each check is something you can grep or see.

| # | Rule | Do | Check |
|---|---|---|---|
| C1 | Nested radii differ | inner radius = outer radius minus the padding between them (never below 0) | no child with the same `border-radius` as its padded parent; a token or `calc(var(--r-outer) - var(--pad))` |
| C2 | Alpha borders | borders and dividers use a translucent colour (`oklch(0 0 0 / 0.1)` on light, `oklch(1 0 0 / 0.1)` on dark) so they blend into any background | no solid hex border on a surface that can change colour |
| C3 | OKLCH, not HSL | colour tokens are written in `oklch()`; lightness steps match what the eye sees | no new `hsl()` in tokens or Tailwind config |
| C4 | Gradients interpolate in OKLCH | `linear-gradient(in oklch, a, b)` so the middle stays vivid, not grey | every gradient with two saturated ends carries `in oklch` |
| C5 | Icon stroke matches text weight | a thin icon beside bold text looks sloppy: raise the stroke with the font weight (for example 1.5 beside regular, 2 beside semibold) | set stroke from one token, not per icon |
| C6 | Mask carousel edges | a scroller that clips content fades it out with `mask-image: linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)` instead of a hard cut | every horizontal scroller shows a fade at the clipped edge; it disappears at the scroll ends |
| C7 | Soften icon swaps | when an icon changes (copy to check, play to pause) cross-fade with scale, 150-200 ms; blur per X1 | a swapped icon never pops; honours `prefers-reduced-motion` |
| C8 | Dark-mode depth is lightness | shadows barely show on dark, so raise a surface by making it lighter (page, surface, raised) | no dark-mode card that relies on `box-shadow` alone to separate from the page |
| C9 | `dvh`, not `vh` | full-screen layouts use `100dvh` (or `svh` / `lvh` by intent) so Safari's moving toolbar does not clip them | no `100vh` on a mobile-facing layout |
| C10 | Multiply white product shots | an image with a white background on a light surface gets `mix-blend-mode: multiply` so the white vanishes | no visible white box around a product photo; not used on dark surfaces, where multiply turns the image dark |

Notes that keep these consistent with the rest of the skill:

- C7's blur conflicts with "animate `transform` and `opacity` only": see conflict X1,
  which gives two choices.
- C2, C3 and C8 belong in the tokens (SYSTEM), so a component never hardcodes them.
- C3 to C4 together mean colour is defined and blended in one space; do not mix HSL
  tokens with OKLCH gradients.

## Motion feel — the six micro-interactions (owner list, 2026-11-17)

Why premium apps feel smooth: every touch gets a physical answer. These are small,
fast and purposeful, so they fit Operate screens as well as Persuade ones. Build them
with Motion (`motion/react`), the default engine in "Where to use what".

| # | Moment | Behaviour | Numbers | Check |
|---|---|---|---|---|
| M1 | Button press | scales down to 95% on press, springs back on release; the squish tells the thumb the tap landed | `scale: 0.95`; press about 100 ms, release a short spring, overshoot per X2 | every primary and icon button reacts to press, not only to hover |
| M2 | Pull to refresh | the finger travels the full distance, the list follows only part of it; the resistance makes it feel real | list moves 35% of finger travel | list offset is about a third of the drag; it snaps back on release |
| M3 | Number change | when a total changes, the digits roll into place one after another instead of swapping | staggered per digit, tabular figures, 300-500 ms | a changed total animates; the final value is in the DOM and read by assistive tech at once |
| M4 | Drag to reorder | the picked row lifts and grows 5% while the other rows slide out of its way, like moving a real card | `scale: 1.05`, layout animation on siblings | siblings animate to their new slots; a keyboard or button path does the same move (H10) |
| M5 | Card expand | fast at first, then slowing down | ease-out, 350 ms (cap per X3) | expanding card uses ease-out, not linear or ease-in-out |
| M6 | Success | the circle draws first, then the tick; watching it finish makes the moment feel done | SVG `pathLength` 0 to 1, circle then tick, about 400-600 ms total (cap per X3) | the check is drawn in sequence, not shown whole; ends on the completed state (U18) |

How these sit with the rest of the skill:

- **Conflicts.** M1 (spring), M5 and M6 (duration) and the dial budget collide with
  existing rules. Each is settled in the next section, X1 to X4, with two choices.
- **Properties.** Animate `transform` and `opacity`. For M5 and M4 use a layout
  animation (transform-based), not `height` or `top`. M6 draws an SVG stroke.
- **Reduced motion.** With `prefers-reduced-motion`, drop the squish, the roll and the
  draw to an instant state change or a plain fade. The result, focus and content stay
  correct. Pull to refresh keeps its resistance because it follows the finger.
- **Cost.** Test at 400px on a throttled CPU; a dropped frame in any of these is a defect.

## Animation principles — the twelve, translated for UI (owner list, 2026-11-17)

The classic twelve principles of animation, read as UI rules. M1-M6 are the concrete
moments; these are the reasons behind them and apply to any motion that is not on that
list. BUILD uses them to design a transition, CRITIQUE checks them at level 7.

| # | Principle | In a UI | Check |
|---|---|---|---|
| A1 | Anticipation | a small counter-move before the main one tells the eye what is about to happen: a press dips before the action fires, a row lifts before it is dragged, a sheet nudges before it opens | the big move is never the first thing the user sees; see X6 for how long it may take |
| A2 | Windup | the bigger the action, the more it charges first: pull to refresh stretches before it fires, a long press fills a ring, swipe-to-delete reveals as the drag grows | the charge grows with the gesture and is cancellable; it is the gesture itself, so it adds no delay (X6) |
| A3 | Staging the focus | one thing leads at a time; dim, blur or hold still everything else so the eye knows where to look | at any moment one element moves with purpose; a modal dims what is behind it; no two unrelated things animate together |
| A4 | Pose to pose | define the key states first (start, end, at most one in between) and let the engine tween them; do not hand-animate every frame | each transition is written as two or three named states, not a chain of timeouts |
| A5 | Follow-through | parts settle after the main body stops: sheet content settles a beat after the sheet lands, a list trails its container, a dropped item eases into place | nothing stops dead; the settle is finite and about 100 ms or less |
| A6 | Slow in, slow out | movement eases at the start and the end; position and size are never linear | no `linear` on a moving element, only on opacity and colour; see X7 for which ease |
| A7 | Moving in arcs | things that travel between two points follow a curve, not a straight line: an item flying to the cart, a button morphing into a sheet | travel across the screen uses different easing on x and y, so the path bends |
| A8 | Secondary action | one small supporting motion backs the main one: the cart count ticks as the item lands, the icon fills as the button squishes | at most one secondary action per primary; it never competes with it or outlasts it |
| A9 | Snappy timing | quick to start, quick to finish; timing carries weight, so small things move faster than large ones | UI motion is 150-300 ms (X3 for the exceptions); a small control never takes longer than a large panel |
| A10 | Exaggerated feedback | make the response a little bigger than the event so it registers, sized to how much the event matters | a saved set and a deleted workout do not get the same feedback; see X5 for how far to push |
| A11 | Solid drawing in 3D | shapes keep volume, perspective and light: one light direction for every shadow, one elevation scale, and a raised element casts a larger, softer shadow | all shadows in the app share one angle; elevation steps are tokens; no flat element rotates as if it had depth |
| A12 | Overall appeal | the sum feels designed: one personality, one family of curves and durations used everywhere | easings and durations come from tokens; play the motion at normal speed and at quarter speed, and nothing looks accidental |

Notes:

- The source list read "Pose oppose" and "Windup". They are taken as *pose to pose* (A4)
  and as a stronger form of anticipation (A2). Amol can correct either reading.
- A11 is the in-UI half of C8 (dark-mode depth is lightness) and applies to Experience
  surfaces with real 3D (`img2threejs`, three). On flat Operate screens it means
  consistent shadows and elevation only.
- Every principle holds under `prefers-reduced-motion` by reducing to an instant state
  change or a fade. Four of them (A1, A2, A5, A8) are decoration if they are removed, so
  drop them first.

## Conflicts — two choices (owner rules against the floor)

Where an owner rule above contradicts an older rule in this skill, there are two choices,
not a silent winner. **Choice A keeps the older rule. Choice B follows the owner's rule
literally.** Default to A. Take B only when the surface fits its "Use B when" column,
and write the choice in the READ line, for example
`register Persuade, dials 7 / 6 / 4, conflicts X1=B X2=B`. CRITIQUE then checks the
screen against the choice it claimed. Amol can flip a default by editing this table.

| # | Conflict | Choice A (default, keeps the older rule) | Choice B (owner rule, literal) | Use B when |
|---|---|---|---|---|
| X1 | C7 icon-swap blur against "animate `transform` and `opacity` only" | cross-fade with scale and opacity, no blur | add a small blur to the cross-fade, 200 ms or less, small icons only, never on large or repeating elements | a Persuade or Experience surface where the swap is a showpiece, MOTION 5 or more, and the throttled-CPU check at 400px shows no dropped frame |
| X2 | M1 spring-back against the ban on bounce and elastic easing | critically damped spring: settles at once, never passes rest | a real spring with at most about 3% overshoot past rest | Bold-playful style, MOTION 5 or more, never on Health or trust-first surfaces |
| X3 | M5 (350 ms) and M6 (400-600 ms) against "UI stays at 150-300 ms" | cap both at 300 ms: M5 ease-out 300 ms, M6 circle then tick in about 300 ms | the owner's numbers: M5 350 ms, M6 400-600 ms, each a one-off moment, never a loop | the moment is a one-off reward (first success, a finished flow, U18) and not a step the user repeats within a task |
| X4 | M1-M6 against "MOTION 1 to 3 = hover and focus states only" | at MOTION 3 or less allow only M1 (press) and M6 (success); the rest wait for MOTION 4 or more | allow all six at any MOTION of 2 or more, including every Operate screen | Operate screens where feel is part of the job (Train, a logged set, a reorderable list) and the dials were set deliberately |
| X5 | A10 exaggerated feedback against the ban on bounce and elastic easing, and the calm of trust-first surfaces | feedback sized to the event, with a clear change of scale (up to 1.05) or colour and no overshoot | pronounced feedback: scale up to 1.15, overshoot allowed as in X2, a bright colour pop | a reward moment on Bold-playful or Persuade, MOTION 5 or more, never on Health or on errors |
| X6 | A1 anticipation and A2 windup against U12 (every tap answers within 400 ms) | anticipation is part of the response: 80 ms or less, and the result starts right after; windup only through a gesture the user is already making (drag, pull, long press), so nothing is delayed | a timed windup of 100-200 ms before the result, total still inside 400 ms | a one-off showpiece moment, MOTION 6 or more, never on a tap the user repeats within a task |
| X7 | A6 slow in, slow out (ease-in-out) against M5 "ease-out, not ease-in-out" | ease-out for anything the user's touch starts (expanding, opening, entering); ease-in-out only for an element moving between two on-screen spots by itself | ease-in-out for all movement, M5 included | Experience or Persuade surfaces, where the motion is not a direct answer to a touch |
| X8 | U24 frequency of use against M1-M6 at full strength | an action repeated more than about 10 times in a session gets an instant or 100 ms response; M3 (roll) and M6 (draw) are skipped for it | keep M1-M6 at full strength however often the action repeats | the repeat is itself the reward loop and the surface is Bold-playful, set deliberately |

Not conflicts: M2 (pull to refresh keeps its resistance under reduced motion because it
follows the finger) and M3 (the final value is in the DOM at once) hold under both choices.

## UX rules — how the screen behaves (owner list, 2026-11-17)

These apply in every register. BUILD designs to them; CRITIQUE checks them at level 1,
before hierarchy or craft. A rule is met when the check passes, not when it sounds true.

**Decide less**

| # | Rule | Check |
|---|---|---|
| U1 | Reduce choices per screen | one decision per screen; more than about 5 equal options are grouped, ranked or cut |
| U2 | Use sensible defaults | every field and setting that has a likely answer starts with it; the default path needs no typing |
| U3 | Put essentials first | the thing the user came for is visible without scrolling at 400px |
| U4 | Reveal complexity gradually | advanced options sit behind one step ("More", a details row), never on the first view |
| U5 | Simplify complex interfaces | every control on screen is used in the main task; the rest moves out. Complexity the user must not carry is carried by the system |

**Find and hit**

| # | Rule | Check |
|---|---|---|
| U6 | Highlight the primary action | exactly one primary button per screen, visibly different from every other control |
| U7 | Make targets large | touch targets 44 by 44 px, never under 28, with about 12 px between them (Apple HIG) |
| U8 | Place key actions nearby | the action sits next to the thing it acts on, and in thumb reach on a phone |
| U9 | Group related information | related items share a container or spacing; unrelated items are separated by more space than related ones |
| U10 | Connect related elements visually | a label, its field and its error read as one unit (shared line, border or background) |
| U11 | Break content into chunks | long text, long numbers and long forms are split into groups of about 3 to 5 |

**Feel fast and familiar**

| # | Rule | Check |
|---|---|---|
| U12 | Interactions within 400 ms | every tap shows a response inside 400 ms: the result, an optimistic update or a skeleton. 400 ms is the ceiling a user tolerates; the number to measure and ship against is INP 200 ms or less (`performance` skill) |
| U13 | Follow familiar patterns | navigation, forms and gestures work the way the platform's own apps do; a novel pattern needs a reason |
| U14 | Maintain pattern consistency | the same action looks, sits and behaves the same on every screen of the app |
| U15 | Reduce task completion time | count the taps and fields of the main task; every one that can be removed, inferred or remembered is |

**Keep them going**

| # | Rule | Check |
|---|---|---|
| U16 | Show visible progress | any flow over 2 steps, and any wait over about 1 second, shows where the user is and what is left |
| U17 | Make completion feel closer | progress starts above zero (count the step just done) and the last steps are the shortest |
| U18 | End flows memorably | the last screen of a flow confirms what was achieved and offers the next step; it is never a blank return to a list |

**Errors**

| # | Rule | Check |
|---|---|---|
| U19 | Prevent errors proactively | constrain the input (picker over free text, disabled until valid, inline validation) before the user can submit a mistake |
| U20 | Make errors recoverable | every destructive action has undo or a confirm; an error message says what happened and what to do, and keeps what was typed |

**Laws of UX** (owner list, 2026-11-17)

Four of the laws are new rules. The others are already enforced by an earlier rule, so
they are mapped, not repeated.

| # | Rule | Check |
|---|---|---|
| U21 | Fitts' law: time to hit a target grows with distance and shrinks with size. Put what is used most near where the thumb or pointer already is, make it large, and use the screen edges and bottom thumb zone | the primary action sits in thumb reach on a phone; no small target far from the content it acts on |
| U22 | Bigger hit areas: the tappable region can be larger than what is drawn. Pad it with padding or a pseudo-element, make the whole row tappable, and keep neighbouring hit areas from overlapping | tap just outside a small icon and it still works; an icon that looks 20 px has a 44 px target (U7) |
| U23 | Postel's law (the paste read "Pastel's"): be liberal in what you accept and strict in what you output. Take input in the shapes people really type, store and show one canonical form | paste `  +91 98765-43210 ` or a date in three formats and the form accepts it, trims it and shows one format |
| U24 | Frequency of use: the action done most often is the cheapest, with the fewest taps, the shortest animation and no confirm; rare actions may cost more steps | rank the screen's actions by how often they run; the top three take two taps or fewer; see X8 for motion |

Already covered by an earlier rule. The `Dolpherty threshold` in the paste is the
*Doherty threshold*.

| Law | Where it is enforced |
|---|---|
| Hick's law: more choices, slower decision | U1, U4, U5 |
| Miller's law: short-term memory holds a handful of items | U11 (chunks of about 3 to 5, stricter than "7 plus or minus 2") |
| Jacob's law: people expect your app to work like the others they use | U13, U14 |
| Doherty threshold: respond within about 400 ms and the user stays in flow | U12 (400 ms ceiling, INP 200 ms to measure) |

When two rules pull apart (U1 against U15: fewer choices per screen can mean more
screens), the main task's total time decides. The Operate register leans to U15, the
Persuade register to U1.

## Apple HIG habits that transfer to the web

Read from Apple's Human Interface Guidelines on 2026-11-17 (pages: accessibility,
tab bars, modality, onboarding, feedback, loading). Only what applies to a web app is
kept. Where a row repeats a U rule, the U rule is the check and this is the detail.

| # | Habit | Check |
|---|---|---|
| H1 | Navigation bar navigates, it does not act. Actions on the current view go in a toolbar or next to the content | no "Add" or "Save" inside the bottom nav |
| H2 | The nav bar stays visible and its items are never hidden or disabled. An empty section explains why it is empty | open every section signed out and with no data |
| H3 | Few tabs, each with a short label, one word where possible. A badge is for critical information only | count tabs and badges |
| H4 | A modal only when it helps the user focus or decide. It is short, has an obvious way out, and never opens a second modal on top | every sheet and dialog has a visible close and also closes with Escape |
| H5 | Closing a modal that holds typed content asks first, and offers to save | type, then dismiss with the gesture and with the button |
| H6 | Onboarding is brief, or replaced by tips shown next to the thing they explain. Non-essential setup is postponed and defaults let the user start at once | time from first open to first useful action |
| H7 | Ask for a permission when the user first uses the feature that needs it, not at first launch | camera, notifications and location prompts each follow a user action |
| H8 | Show something as soon as possible: placeholders that are replaced as content arrives. Say that content is loading, and how long when it is known | no blank screen on a throttled load |
| H9 | Match the feedback to its weight: status sits quietly near the item, an interrupting alert is for critical and actionable news. Warn only before unexpected, irreversible loss; confirm success only when it matters | list every alert and toast, and what would be lost without it |
| H10 | Text scales to 200% without breaking, and every gesture (swipe, long press, drag) has a visible control that does the same thing | browser zoom 200%; keyboard-only pass |

To read more of the HIG, fetch
`developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json`.
The normal HTML page returns only its title to a fetch.

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
  1  does it do the job          task completes, primary action obvious, U1-U24, H1-H10
  2  hierarchy                   one thing reads first, then second
  3  consistency                 same thing looks the same everywhere
  4  states                      hover, focus, disabled, empty, error, loading
  5  accessibility               contrast, focus order, labels, motion
  6  responsive                  400px, 768px, 1440px
  7  craft                       spacing rhythm, alignment, type scale, component craft C1-C10, motion feel M1-M6, animation principles A1-A12
  8  slop                        the floor above
```

Stop at the first level that is badly broken. Tuning craft on a screen whose primary
action is unclear wastes the pass.

Report in this shape. A rule is listed as checked only with its evidence.

```
  design critique: <screen>, <app>, <date>     register: Operate   dials: 3 / 3 / 6

  Main task   log a set: 4 taps, 1 field
  FAIL        U6   two primary buttons on /train            TrainHeader.tsx:41
              H5   closing the note sheet drops typed text  NoteSheet.tsx:88
  PASS        U1-U5, U7-U24, H1-H4, H6-H10 (evidence below)
  Not checked level 7 craft: stopped at level 1

  Verdict     FIX FIRST: U6   |   SOUND
  Next        <the one change to start with>
```

Never write SOUND with a FAIL at level 1.

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
