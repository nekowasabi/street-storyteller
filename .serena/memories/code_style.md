# Code Style & Conventions
- Language: TypeScript targeting Deno 2.x; leverage ES modules and `readonly` types, functional helpers (`ok/err` results).
- Follow layered architecture guidance in `@ARCHITECT.md`; shared abstractions exported from `src/shared`, application logic in `src/application`, infrastructure adapters under `src/infrastructure`, CLI wiring in `src/cli`.
- Repository rules in `CLAUDE.md`: emphasize type safety, extensibility, and keeping CLI/Preset responsibilities separated from logging.
- Prefer immutability, descriptive type aliases, and dependency injection via constructors/factories; no implicit singletons.
- Tests use Deno's built-in test runner; organize new tests alongside relevant layer (e.g., `tests/` for integration, `src/.../__tests__` if needed).
- Respect ASCII default; add comments sparingly to clarify complex logic.