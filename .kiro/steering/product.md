# Street Storyteller Product Overview

## Product Overview
Street Storyteller applies the "Storywriting as Code (SaC)" concept: authors structure stories with TypeScript definitions and Deno tooling, enabling validation, automation, and AI-assisted workflows. The current CLI prototype scaffolds story projects and ships example assets that demonstrate hybrid TypeScript/Markdown storytelling.

## Core Features
- CLI command `storyteller generate` scaffolds story projects with directories, template files, and starter tests tailored to `basic`, `novel`, or `screenplay` templates.
- Generated TypeScript types (`src/type/*.ts`) model narrative elements such as purpose, characters, plots, and settings.
- Sample assets under `sample/` illustrate advanced integrations: hybrid `.ts` + `.md` content, YAML bindings, and validation scripts.
- Deno task scripts (`deno task build/test/generate`) streamline compilation, testing, and project generation.
- Automated tests (`tests/cli_test.ts`, `tests/generate_test.ts`) harden CLI behaviour and project scaffolding.

## Target Use Cases
- Fiction writers and narrative designers who prefer infrastructure that enforces structure, validation, and repeatability.
- Technical storytellers exploring automated QA (LLM-based or rule-based) for long-form manuscripts.
- Teams planning to extend the CLI with AI-assisted authoring, LSP integration, or visualization tooling.

## Key Value Proposition
- Bridges creative writing with software tooling, delivering reproducible scaffolds and type-safe story models.
- Ensures consistency by pairing generated tests and validation workflows with strongly typed story elements.
- Provides a runway for AI and LSP integrations through the sample architecture and documented roadmap.

## Near-Term Goals
- Mature the architecture and CLI infrastructure (Issues #6 and #7) to support richer commands and extension points.
- Expand TypeScript schemas and meta-generation tooling (Issues #2 and #4) so stories capture deeper semantics.
- Deliver LSP diagnostics, visualization, and AI interaction layers (Issues #3, #5, #8, #10) for the v1.0 release target.

_Last updated: October 13, 2025_
