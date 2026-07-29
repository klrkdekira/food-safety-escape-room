# Food Safety Escape Room Platform

A data-driven, browser-based educational escape room platform for food science curricula. Built on a shared framework-free TypeScript engine with an interactive browser authoring studio and automated Zod validation.

---

## Overview

The platform uses a decoupled, data-driven architecture:
- **Game Engine**: Pure vanilla TypeScript (`src/engine/`) compiled into a lightweight ~26 kB production bundle. No runtime frameworks or external dependencies.
- **Authoring Studio**: Built with React 19 and Immer (`src/editor/`) at `author/index.html`, allowing non-technical authors to create, edit, validate, live-preview, and export quiz JSON data.
- **Data Schemas**: Quiz structure and referential integrity are enforced by a single-source-of-truth Zod schema (`src/schema/quiz.ts`).

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

# Run all test gates (Zod validation + tsc + Oxlint + Oxfmt + html-validate)
make test       # or pnpm test

# Build for GitHub Pages (emits to docs/, including docs/offline/ bundles)
make build      # or pnpm build

# Regenerate the offline bundles on their own
make gen-offline # or pnpm run gen-offline

# Re-download the self-hosted fonts (needs network; output is committed)
pnpm fetch-fonts
```

---

## Puzzle Types

The engine dynamically renders four puzzle types defined in `puzzleData`:

| Type | Description | Accessibility |
|---|---|---|
| `mcq` | Single-answer multiple choice | Native `<fieldset>` + radio buttons |
| `multiselect` | Multiple-answer checkbox | Native `<fieldset>` + checkboxes |
| `order` | Sequence reordering | Accessible move buttons + `Element.moveBefore()` |
| `match` | Pairing / classification | Native `<select>` dropdown per row (WCAG 2.2 AA) |

---

## Repository Structure

```
src/
  engine/           Framework-free game engine (vanilla TS, 26 kB bundle)
    puzzles/        Modular puzzle handlers (mcq, multiselect, order, match)
    utils/          HTML escaping helper (XSS protection)
  editor/           Browser Author Studio (React 19 + Immer + IDB autosave)
  schema/           Single-source-of-truth Zod schema (quiz.ts)
public/
  quizzes/          Quiz JSON data files (microb.json, food-kitchen.json)
author/             Authoring studio HTML entry point
docs/               Production GitHub Pages build target
tools/              CLI validation, schema export, manifest, and offline generators
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
