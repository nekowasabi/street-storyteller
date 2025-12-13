# Street Storyteller Product Overview

## Product Overview

Street Storyteller applies the "Storywriting as Code (SaC)" concept: authors
structure stories with TypeScript definitions and Deno tooling, enabling
validation, automation, and AI-assisted workflows. The CLI is now layered (CLI
modules → application services → domain templates) so the `generate` command not
only scaffolds projects but also validates templates, emits migration/TDD
guides, and seeds a `.storyteller.json` manifest for future upgrades.

## Core Features

- Modular CLI command registry (`src/cli/`) routes aliases (`g`, `h`) to
  handlers, providing consistent parsing, validation, and structured output
  messaging.
- `storyteller generate` provisions directories, story templates, starter tests,
  and accompanies them with automated migration and TDD guidance plus a schema
  manifest to support upgrades.
- Application services (`src/application/`) coordinate filesystem writes,
  migration assessments, and documentation emission, insulating CLI code from
  side effects.
- Domain catalog (`StaticTemplateCatalog`) and validation policies guarantee
  every template ships with required directories/files, guardrails, and sample
  assertions.
- Test suite spans CLI integration, command registry behaviour, domain
  validation, migration workflows, and scaffolding services to keep the
  developer experience reliable.

## Target Use Cases

- Fiction writers and narrative designers who prefer infrastructure that
  enforces structure, validation, and repeatability.
- Technical storytellers exploring automated QA (LLM-based or rule-based) for
  long-form manuscripts.
- Engineering teams extending the CLI with new commands (view, meta, AI) while
  keeping templates migratable and well-documented.

## Key Value Proposition

- Bridges creative writing with software tooling, delivering reproducible
  scaffolds and type-safe story models reinforced by manifest-driven migration
  guidance.
- Ensures consistency by pairing generated tests, validation workflows, and
  layered services with strongly typed story elements.
- Provides a runway for AI and LSP integrations through the sample architecture,
  modular CLI registry, and documented roadmap.

## Near-Term Goals

- Finalize CLI infrastructure scope in Issue #6 (command registry enhancements,
  structured output, shell completion).
- Expand the template catalog and schema metadata in Issue #2 to support richer
  character/detail modelling.
- Document and automate migration/TDD flows outlined in Issue #7 so future
  commands reuse the same application services.
- Kick off LSP diagnostics and visualization tracks (Issues #3 and #10) once the
  CLI scaffolding stabilizes.

_Last updated: October 22, 2025_
