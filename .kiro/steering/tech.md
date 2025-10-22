# Street Storyteller Technology Stack

## Architecture Overview
- **Layered CLI pipeline:** `main.ts` delegates to `src/cli.ts`, which parses arguments, normalizes aliases, and dispatches handlers via the command registry.
- **CLI modules:** `src/cli/modules` supply command implementations (`generate`, `help`) that return typed `Result` objects and rely on the console presenter for user-facing output.
- **Application services:** `src/application/project_scaffolding_service.ts` composes the filesystem gateway, migration facilitator, story domain service, and documentation emitter to orchestrate project creation.
- **Domain templates & validation:** `StaticTemplateCatalog` defines blueprint assets while `createStoryDomainService` enforces required directories/files through the standard validation policy.
- **Shared utilities & types:** `src/shared/result.ts` offers a minimal result algebra reused across layers; story constructs reside under `src/type/` for reuse inside generated projects.

## Runtime & Tooling
- **Language & Runtime:** TypeScript on Deno v2.2.12; no Node runtime required.
- **Dependencies:** Deno Standard Library modules from JSR (`@std/assert`, `@std/fs`, `@std/path`, `@std/cli`); no third-party HTTP calls at runtime.
- **Compilation:** `deno task build` compiles the CLI binary (`storyteller`) with read/write permissions, bundling `main.ts` entry.

## Development Environment
- Install Deno ≥2.2.12; enable TypeScript + Deno language server integrations for editor support.
- Run commands locally with `deno run --allow-read --allow-write main.ts <command>` while iterating on CLI behaviour.
- Generated projects include a `.storyteller.json` manifest plus migration/TDD guidance—commit or prune according to repo policy.

## Common Commands
- `deno task build` – compile CLI binary.
- `deno task generate -- --name <project>` – invoke the generate handler through Deno.
- `deno task test` – execute the full test suite.
- `deno task test:cli` / `test:domain` / `test:application` / `test:scaffold` – focused suites for faster iteration.
- `deno fmt`, `deno lint` – formatting and linting (excluding `output/`).

## Testing & Quality
- CLI layer tests (`tests/cli_test.ts`, `tests/command_registry_test.ts`) guard argument parsing, registry validation, and error messaging.
- Application layer tests (`tests/project_scaffolding_service_test.ts`, `tests/migration_facilitator_test.ts`) ensure filesystem orchestration, manifest creation, and documentation emission behave as expected.
- Domain layer tests (`tests/story_domain_service_test.ts`, `tests/template_catalog_test.ts`) validate template resolution and blueprint integrity.
- Integration test (`tests/cli_generate_integration_test.ts`) confirms end-to-end behaviour: manifest versioning, migration guides, and TDD guidance emitted on project creation.

## Configuration & Environments
- Centralized in `deno.json`; import map lists std modules and tasks segment test groups.
- No required environment variables; CLI flags provide runtime configuration.
- `.storyteller.json` manifest tracks schema version `1.0.0` for migration facilitator upgrades within generated projects.

## External Integrations
- Roadmap and coordination live in GitHub Issues; `sample/` demonstrates forward-looking AI, LSP, and visualization workflows without adding runtime dependencies yet.

_Last updated: October 22, 2025_
