# Food Safety Escape Room Platform Makefile
# Wraps pnpm commands for standard development workflows.

.PHONY: all dev build test validate lint fmt fmt-check gen-schema clean help

# Default target
all: test build

# Start local dev server
dev:
	pnpm dev

# Build the SPA into docs/ for GitHub Pages, including the 404.html fallback
build:
	pnpm build

# Run all test gates (validate, tsc, oxlint, oxfmt check, html-validate)
test:
	pnpm test

# Validate quiz data files against Zod schema
validate:
	pnpm validate

# Lint codebase with oxlint
lint:
	pnpm lint

# Format codebase with oxfmt
fmt:
	pnpm fmt

# Check formatting without modifying files
fmt-check:
	pnpm fmt:check

# Generate JSON Schema (schema.json)
gen-schema:
	pnpm gen-schema

# Clean build artifacts in dist/
clean:
	rm -rf dist
	rm -rf docs

# Display help menu
help:
	@echo "Available Makefile targets:"
	@echo "  make dev         - Start local Vite development server"
	@echo "  make build       - Build production assets into docs/ for GitHub Pages"
	@echo "  make test        - Run validate, typecheck, oxlint, oxfmt, html-validate"
	@echo "  make validate    - Validate quiz JSON data files"
	@echo "  make lint        - Run oxlint linter"
	@echo "  make fmt         - Auto-format code with oxfmt"
	@echo "  make fmt-check   - Check code formatting with oxfmt"
	@echo "  make gen-schema  - Export Draft-07 schema.json from Zod definition"
	@echo "  make clean       - Remove dist/ and docs/ build directories"
