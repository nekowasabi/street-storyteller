# Task Completion Checklist
- Ensure new/updated code passes `deno fmt` and `deno lint` (if formatting or linting changes were made).
- Run focused `deno test` (or relevant `deno task test:*`) for touched areas; execute full suite when altering shared infrastructure.
- Use `deno check <file>` for quick type-checks during TDD before running tests.
- Update `@PLAN.md` or relevant docs only when instructed; otherwise keep alignment with architectural guidance.
- Confirm logging/config integration respects layering (shared → application → infrastructure → CLI) prior to submission.