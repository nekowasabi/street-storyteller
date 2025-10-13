# Street Storyteller Project Structure

## Top-Level Layout
- `main.ts` – Deno entrypoint that boots the CLI.
- `src/` – Production TypeScript sources.
- `tests/` – Deno test suites targeting CLI behaviour and project generation.
- `sample/` – Reference implementation showcasing advanced workflows (meta bindings, validation, LLM tests).
- `deno.json` / `deno.lock` – Tooling configuration and dependency lockfile.
- `README.md`, `AGENT.md`, `CLAUDE.md`, `ISSUE.md` – Documentation for users, contributors, and AI agents.

## Source Directory Details (`src/`)
- `cli.ts` – Parses command-line arguments and dispatches CLI commands.
- `commands/generate.ts` – Implements project scaffolding, directory creation, templated files, and logging.
- `storyteller_interface.ts` – Defines the `StoryTeller` interface and documents design considerations.
- `type/` – Minimal type aliases for core narrative elements consumed by generated projects.

## Test Assets (`tests/`)
- `cli_test.ts` – Unit tests for CLI argument handling (`runCLI`).
- `generate_test.ts` – Filesystem-backed tests verifying the scaffolding behaviour of `generateStoryProject`.

## Sample Workspace (`sample/`)
- `src/` – Rich type definitions, character/setting examples, and YAML bindings for hybrid workflows.
- `manuscripts/` – Markdown chapters plus `.meta.ts` metadata files consumed by `validate.ts`.
- `validate.ts` – Executable script demonstrating cross-referencing between TypeScript models and Markdown content.
- `tests/llm/` – Mock LLM harness that outlines semantic validation strategies.

## Generated Project Blueprint
The CLI scaffolds projects with:
- `src/characters|settings|chapters|plots|timeline|themes|structure|purpose/` subdirectories for story modes.
- `manuscripts/`, `drafts/`, `output/`, `tests/` directories for content, ideation, generated output, and validation suites.
- Template files (`story.ts`, `story.config.ts`, `README.md`, `tests/story_test.ts`, etc.) pre-populated with imports and placeholders aligned to `StoryTeller` interface requirements.

## Naming & Conventions
- Type definitions use singular nouns (`Character`, `Setting`) stored in `src/type/` with `description` or `name` fields.
- CLI commands favour long-form names with single-letter aliases (`generate` / `g`, `--name` / `-n`).
- Template files and tests default to PascalCase exports (`MyStory`) for Deno compatibility.

_Last updated: October 13, 2025_
