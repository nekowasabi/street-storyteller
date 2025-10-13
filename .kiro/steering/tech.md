# Street Storyteller Technology Stack

## Architecture Overview
- **Entrypoint:** `main.ts` invokes `runCLI()` from `src/cli.ts` when executed via Deno.
- **CLI Layer:** `src/cli.ts` parses arguments with `jsr:@std/cli/parse-args`, routes commands, and handles help messaging.
- **Command Implementations:** `src/commands/generate.ts` provisions project directories, writes template files, and reports success/failure.
- **Domain Model:** Lightweight TypeScript aliases in `src/type/` define `Purpose`, `Character`, `Plot`, `Setting`, and related entities used by generated projects.
- **Sample Reference:** `sample/` demonstrates future-state architecture (meta bindings, validation scripts, LLM tests) without affecting the production CLI path.

## Runtime & Tooling
- **Language & Runtime:** TypeScript on Deno v2.2.12 (no Node.js dependencies).
- **Dependency Management:** Relies on Deno's `deno.json` import map, consuming Deno Standard Library modules via JSR (`@std/assert`, `@std/fs`, `@std/path`, `@std/cli`). No third-party network requests at runtime.
- **Compilation:** `deno task build` produces a standalone `storyteller` binary (`deno compile --allow-write --allow-read`).

## Development Environment
- Install Deno ≥2.2.12.
- Recommended permissions when running locally: `--allow-read --allow-write` for project generation and tests.
- Editors benefit from TypeScript + Deno language server support; sample assets assume Markdown tooling.

## Common Commands
- `deno task build` – compile the CLI binary.
- `deno task test` – execute Deno tests with read/write access for filesystem-mocking suites.
- `deno task generate -- --name <project>` – shorthand to invoke the CLI via Deno.
- `deno fmt` / `deno lint` – format and lint (excludes `output/`).

## Testing & Quality
- `tests/cli_test.ts` covers argument parsing, help output, and error handling by mocking `Deno.args` and `Deno.exit`.
- `tests/generate_test.ts` validates scaffolded directory/file structure and template contents using temporary directories.
- Sample `sample/tests/llm` directory sketches LLM-based validation harnesses for future integration.

## Configuration & Environments
- Configured via `deno.json`; no separate environment files.
- No required environment variables at present; CLI options cover user input.
- No network services or port bindings are used; execution is local filesystem only.

## External Integrations
- Documentation references GitHub issues for roadmap coordination.
- Future integrations (LSP servers, AI tooling, visualization server) are staged but not yet implemented in the main CLI path.

_Last updated: October 13, 2025_
