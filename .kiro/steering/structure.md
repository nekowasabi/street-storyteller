# Street Storyteller Project Structure

## Top-Level Layout
- `main.ts` – Deno entrypoint that boots the CLI.
- `src/` – Production TypeScript organized into CLI, application, domain, shared, and type layers.
- `tests/` – Deno test suites covering CLI, application, domain, and integration behaviours.
- `sample/` – Reference implementation showcasing advanced workflows (meta bindings, validation, LLM tests).
- `deno.json` / `deno.lock` – Tooling configuration and dependency lockfile.
- `README.md`, `AGENT.md`, `CLAUDE.md`, `ISSUE.md` – Documentation for users, contributors, and AI agents.

## Source Directory Details (`src/`)
- `cli.ts` – Parses CLI arguments, normalizes aliases, and delegates to the command registry.
- `cli/` – Command infrastructure: argument parser, output presenter, command registry, and module handlers under `cli/modules/`.
- `commands/generate.ts` – Wires layered services and prints success, migration, and TDD guidance for generated projects.
- `application/` – Application services coordinating filesystem access, migration facilitation, and documentation emission (`project_scaffolding_service.ts`, `file_system_gateway.ts`, `migration_facilitator.ts`, `documentation_emitter.ts`).
- `domain/` – Template catalog and validation policies ensuring generated blueprints include required directories/files.
- `shared/` – Reusable utilities (`result.ts`) implementing the shared `Result` algebra.
- `type/` – Story element type definitions consumed by generated stories (characters, plots, timeline, themes, purpose, etc.).
- `storyteller_interface.ts` – Interface describing the contract generated stories must implement.

## Test Assets (`tests/`)
- `cli_test.ts`, `command_registry_test.ts` – Validate CLI parsing, registry invariants, and error handling.
- `cli_generate_integration_test.ts` – End-to-end check that generation emits manifests plus migration/TDD guidance.
- `generate_test.ts`, `template_catalog_test.ts` – Guard the scaffolding pipeline and template catalog outputs.
- `project_scaffolding_service_test.ts`, `migration_facilitator_test.ts`, `story_domain_service_test.ts` – Exercise application/domain services and manifest workflows.
- `asserts.ts` – Shared test helpers.

## Sample Workspace (`sample/`)
- `src/` – Rich type definitions, character/setting examples, and YAML bindings for hybrid workflows.
- `manuscripts/` – Markdown chapters with paired `.meta.ts` metadata.
- `validate.ts` – Script demonstrating cross-referencing between TypeScript models and Markdown content.
- `tests/llm/` – Mock LLM harness that outlines semantic validation strategies.

## Generated Project Blueprint
The CLI scaffolds projects with directory trees for characters, settings, chapters, plots, timeline, themes, structure, and purpose plus `manuscripts/`, `drafts/`, `output/`, and `tests/`. It seeds template files (`story.ts`, `story.config.ts`, `README.md`, starter tests), writes a `.storyteller.json` manifest (version `1.0.0`), and emits console guidance for migration and TDD workflows.

## Naming & Conventions
- Type definitions use singular nouns (`Character`, `Setting`) stored in `src/type/`.
- CLI commands favour long-form names with single-letter aliases (`generate`/`g`, `help`/`h`).
- Generated files default to PascalCase exports (`MyStory`) and cast story data to typed collections.

_Last updated: October 22, 2025_
