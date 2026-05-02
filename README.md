# Food Safety Escape Room

A data-driven, browser-based educational game that teaches a food microbiology course as a 4-room escape room. 

## Overview

The project is designed to be easily configurable and maintainable. It operates entirely client-side with no build step required. The game engine dynamically renders puzzles based on configuration files, keeping content distinct from code logic.

## Project Structure

- `docs/index.html`: The main entry point template for the escape room.
- `docs/style.css`: Cyberpunk-terminal aesthetic styling.
- `docs/script.js`: The core game engine and application logic.
- `docs/data.json`: The complete dataset of puzzles, rooms, and game content.
- `schema.json`: JSON schema defining the required structure for `data.json`.
- `scripts/`: Python utility scripts (e.g., validation script for `data.json` against `schema.json`).
- `AGENTS.md` / `SPEC.md` / `TODO.md`: Detailed project guidelines, architecture specifications, and backlog.

## How to Play

No local server is required. Simply open `docs/index.html` in any modern web browser to start playing.

## Development & Modification

To modify game content, update `docs/data.json`. The game will automatically read the updated content on the next reload. Ensure that `data.json` adheres to the constraints outlined in `schema.json` to prevent application errors.
