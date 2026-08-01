# Food Safety Escape Room Platform

A data-driven, browser-based educational escape room platform for food science curricula. A single React 19 app routed by TanStack Router, with an interactive browser authoring studio and automated Zod validation.

---

## Overview

The platform uses a decoupled, data-driven architecture:
- **Player**: React components under `src/player/`, driven by one reducer over the game state. Puzzle grading is pure: `check(puzzle, answer)`.
- **Authoring Studio**: React 19 + Immer (`src/editor/`), served at `/editor` and lazily loaded so players never download it. Authors can create, edit, validate, live-preview, and export quiz JSON.
- **Routing**: TanStack Router (`src/router.tsx`), with route modules in `src/routes/`.
- **Data Schemas**: Quiz structure and referential integrity are enforced by a single-source-of-truth Zod schema (`src/schema/quiz.ts`).

### Routes

| Route | Description |
|---|---|
| `/` | Quiz picker. Legacy `?quiz=<id>` links redirect to `/play/<id>`. |
| `/play/:quizId` | The game. `?debug=1` reveals the room-skip control; `?instructor=1` logs the answer key. |
| `/preview` | Live-preview target framed by the studio. |
| `/editor/config`, `/editor/rooms`, `/editor/puzzles` | Authoring studio. |

---

## Active Quizzes

| Quiz ID | Title | Topic | Rooms |
|---|---|---|---|
| `microb` | Food Safety Facility | Food microbiology (biofilm, thermal destruction, hurdle technology, AMR, ATR, water activity) | 4 |
| `food-kitchen` | Food Colloids Kitchen | Food colloids (emulsions, gels, foams, colloidal stability, rheology, PIT, thixotropy) | 4 |

---

## Quick Start & Development Commands

Using `pnpm` or `make`:

```bash
# Start local development server
make dev        # or pnpm dev

# Run all test gates (Zod validation + schema and game regressions + tsc + Oxlint + Oxfmt + html-validate)
make test       # or pnpm test

# Build for GitHub Pages (emits to docs/, plus the 404.html SPA fallback)
make build      # or pnpm build

# Re-download the self-hosted fonts (needs network; output is committed)
pnpm fetch-fonts
```

---

## Puzzle Types

Four puzzle types defined in `puzzleData`, one module each in `src/player/puzzles/`:

| Type | Description | Accessibility |
|---|---|---|
| `mcq` | Single-answer multiple choice | Native `<fieldset>` + radio buttons |
| `multiselect` | Multiple-answer checkbox | Native `<fieldset>` + checkboxes |
| `order` | Sequence reordering | Move buttons using `aria-disabled`, so bounds stay focusable |
| `match` | Pairing / classification | Native `<select>` dropdown per row (WCAG 2.2 AA) |

---

## Repository Structure

```
index.html          Single HTML entry for the whole SPA
src/
  main.tsx          Mounts the RouterProvider
  router.tsx        Route tree
  routes/           Route definitions (home, play, preview, editor)
  player/           The game
    gameReducer.ts  All game state transitions
    components/     Screens (title, HUD, room, code pads, victory)
    puzzles/        Puzzle types (mcq, multiselect, order, match)
    lib/            Storage, sound, shuffle, HTML/SVG sanitising, ranking
  editor/           Browser Author Studio (React 19 + Immer + IDB autosave)
  schema/           Single-source-of-truth Zod schema (quiz.ts)
public/
  quizzes/          Quiz JSON data files (microb.json, food-kitchen.json)
  CNAME             Custom domain; must live here or the build wipes it
docs/               Production GitHub Pages build target (generated)
tools/              CLI validation, schema export, and manifest generation
Makefile            Standardized build and test workflow commands
schema.json         Draft-07 JSON Schema exported from Zod definition
```

---

## Authoring & Validation

To validate quiz JSON files against the Zod schema and referential integrity rules:

```bash
pnpm validate
```

To export an updated Draft-07 `schema.json`:

```bash
pnpm gen-schema
```

See [AGENTS.md](AGENTS.md) for strict editing conventions and [PROPOSAL.md](PROPOSAL.md) for complete architectural specifications.
