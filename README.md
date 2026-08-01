# Food Safety Escape Room

A data-driven, browser-based educational escape room platform for food science curricula built with React 19, TanStack Router, TypeScript, and Vite.

## Features

- **Player Engine**: Interactive escape room game supporting multiple puzzle types (`mcq`, `multiselect`, `order`, `match`).
- **Authoring Studio**: Built-in browser editor at `/editor` to create, validate, live-preview, and export quiz JSON data.
- **Offline & Self-Contained**: Zero external CDN calls, self-hosted fonts, and strict CSP for static deployment (e.g. GitHub Pages).

## Quick Start

```bash
# Install dependencies
pnpm install

# Start local development server
pnpm dev

# Run linting, typechecking, and tests
pnpm test

# Build for production (emits to docs/)
pnpm build
```

## Active Quizzes

Quiz content is stored as JSON in `public/quizzes/` and validated against a single source-of-truth Zod schema (`src/schema/quiz.ts`).

| Quiz ID | Title | Topic |
|---|---|---|
| `microb` | Food Safety Facility | Food microbiology |
| `food-kitchen` | Food Colloids Kitchen | Food colloids |

## Project Structure

- `src/player/` — Game engine & puzzle components
- `src/editor/` — Authoring studio UI (lazily loaded)
- `src/schema/` — Zod schemas for quiz data validation
- `src/routes/` — TanStack Router route tree
- `public/quizzes/` — Quiz JSON data files
