# Suggested Commands
- `deno run main.ts` – run the CLI directly (uses args from command line).
- `deno task generate -- <args>` – invoke the generate command via Deno task wrapper.
- `deno task build` – compile the CLI into a standalone `storyteller` binary.
- `deno test` – run the full test suite (read/write permissions already configured).
- `deno task test:cli` / `deno task test:application` / `deno task test:domain` – scoped test suites.
- `deno fmt` / `deno lint` – formatting and linting with repo-specific exclusions.
- `deno check src/...` – type-check without running (useful for incremental TDD steps).
- `./storyteller help` – after build, run the compiled binary's help command.