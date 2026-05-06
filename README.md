# Food Safety Escape Room

A collection of data-driven, browser-based educational games that teach food safety topics as escape rooms. Each quiz is fully self-contained — no build step, no server required.

## Overview

The project uses a shared engine architecture: each quiz directory contains its own `index.html`, `style.css`, `script.js`, and `data.json`. The engine dynamically renders puzzles from the data file, keeping content entirely separate from code logic. Adding a new puzzle is a data-only change.

## Quizzes

| Directory | Title | Topic | Rooms |
|---|---|---|---|
| [docs/microb/](docs/microb/) | Food Safety Facility | Food microbiology (biofilm, thermal destruction, hurdle technology, AMR) | 4 |
| [docs/food-kitchen/](docs/food-kitchen/) | Kitchen Safety Facility | Kitchen food safety (storage, hygiene, cooking temperatures, cold chain) | 4 |

## How to Play

No local server is required. Open the `index.html` in any modern web browser:

- **Microbiology quiz**: open `docs/microb/index.html`
- **Kitchen safety quiz**: open `docs/food-kitchen/index.html`

## Puzzle Types

The engine supports four puzzle types:

| Type | Description |
|---|---|
| `mcq` | Multiple choice — single correct answer |
| `multiselect` | Multiple choice — select all that apply |
| `order` | Drag-and-drop or arrow-button sequencing |
| `match` | Two-column click-to-pair matching (mix and match) |

## Project Structure

```
docs/
  microb/           Food microbiology escape room
    index.html
    style.css
    script.js
    data.json
  food-kitchen/     Kitchen food safety escape room
    index.html
    style.css        (includes match puzzle CSS)
    script.js        (includes match puzzle rendering + checking)
    data.json
schema.json         JSON schema for data.json validation
scripts/            Python utility scripts (e.g. validate.py)
AGENTS.md           AI agent operational guide
SPEC.md             Architecture and content specification
TODO.md             Prioritized backlog
```

## Development

To modify game content, edit `data.json` in the relevant quiz directory. The game reads the file on load — no rebuild needed.

To add a new quiz:
1. Create a new subdirectory under `docs/`
2. Copy engine files from an existing quiz
3. Write a new `data.json` following [schema.json](schema.json)

To validate `data.json` against the schema:

```bash
python scripts/validate.py docs/food-kitchen/data.json
```

See [AGENTS.md](AGENTS.md) for editing conventions and [SPEC.md](SPEC.md) for full architecture details.
