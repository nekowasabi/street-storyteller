# street-storyteller

![CI](https://github.com/nekowasabi/street-storyteller/actions/workflows/ci.yml/badge.svg)

**Version**: 0.3.0 (CLI) / 1.0.0 (Project Schema)

## Description

SaC(StoryWriting as Code).

Support for writing a story.

## Installation

```bash
# Clone the repository
git clone https://github.com/nekowasabi/street-storyteller.git
cd street-storyteller

# Build the executable (local ./storyteller)
deno task build
```

Install to your PATH (builds via `deno compile`):

```bash
./scripts/install.sh
# or
./scripts/install.sh --prefix "$HOME/.local" --force
```

## Usage

`storyteller` is a command line tool for writing stories in a structured way.

### Commands

#### MCP Server (Claude Desktop)

Start an MCP (Model Context Protocol) server over stdio so Claude Desktop (and
other MCP clients) can call storyteller tools/resources/prompts.

```bash
# Start with current directory as project root
./storyteller mcp start --stdio

# Start with an explicit project root
./storyteller mcp start --stdio --path /path/to/story-project
```

Claude Desktop configuration example (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "storyteller": {
      "command": "storyteller",
      "args": ["mcp", "start", "--stdio"]
    }
  }
}
```

The server exposes:

- **Tools**: `meta_check`, `meta_generate`, `element_create`, `view_browser`,
  `lsp_validate`, `lsp_find_references`
- **Resources**: `storyteller://project`, `storyteller://characters`,
  `storyteller://character/<id>`, `storyteller://settings`,
  `storyteller://setting/<id>`
- **Prompts**: `character_brainstorm`, `plot_suggestion`, `scene_improvement`,
  `project_setup_wizard`, `chapter_review`, `consistency_fix`

See `docs/mcp.md` for the API details (arguments, schemas, and examples).

#### Generate Command

Create a new story project with structured directories and template files.

```bash
# Basic usage
./storyteller generate --name "project-name"

# Short form
./storyteller g -n "project-name"

# With template specification
./storyteller generate --name "my-novel" --template novel

# With custom path
./storyteller generate --name "screenplay" --template screenplay --path ~/stories
```

#### Meta Command

Generate chapter companion metadata files (`.meta.ts`) from Markdown manuscripts
(see `sample/` for the companion-file workflow).

```bash
# Generate .meta.ts next to the manuscript
./storyteller meta generate manuscripts/chapter01.md

# Preview only (no write)
./storyteller meta generate manuscripts/chapter01.md --dry-run --preview

# Update only the auto blocks (preserve manual edits)
./storyteller meta generate manuscripts/chapter01.md --update

# Interactive resolution for ambiguous/low-confidence references
./storyteller meta generate manuscripts/chapter01.md --interactive

# Apply a validation preset
./storyteller meta generate manuscripts/chapter01.md --preset dialogue

# Batch generation (glob) requires --batch
./storyteller meta generate manuscripts/*.md --batch

# Batch generation (directory)
./storyteller meta generate --dir manuscripts --recursive

# Watch for changes and keep .meta.ts up to date
./storyteller meta watch --dir manuscripts --recursive

# CI/pre-commit friendly check (no writes)
./storyteller meta check --dir manuscripts --recursive
```

##### Meta generate options

- `--characters <ids>` - Comma-separated character ids (overrides frontmatter)
- `--settings <ids>` - Comma-separated setting ids (overrides frontmatter)
- `--output <path>` - Output file path (single file only)
- `--dry-run` - Generate without writing the output file
- `--preview` - Print a generation preview
- `--interactive` - Prompt to resolve ambiguous/low-confidence references
- `--preset <type>` - Validation preset (`battle-scene`, `romance-scene`,
  `dialogue`, `exposition`)
- `--update` - Update only the auto-generated blocks when output exists
- `--force` - Overwrite existing output files
- `--batch` - Treat the markdown input as a glob and process all matches
- `--dir <dir>` - Process all `.md` files in a directory
- `--recursive, -r` - Recursive search for `--dir`

##### Meta check task

For automation (CI / git hooks):

```bash
deno task meta:check -- --dir manuscripts --recursive
```

To install a local git pre-commit hook:

```bash
./scripts/install-precommit.sh --dir manuscripts
```

#### Options

- `--name, -n <name>` - Project name (required)
- `--template, -t <type>` - Template type (default: basic)
- `--path, -p <path>` - Custom project path (optional)
- `--log-level <level>` - Override logging level (`trace`-`fatal`)
- `--log-format <human|json>` - Choose console log format
- `--environment <env>` - Set runtime environment (`development`, `test`,
  `production`)
- `--cache-ttl <seconds>` - Adjust default cache TTL
- `--provider <id>` - Set default external provider id
- `--config <path>` - Provide explicit configuration file

#### Other Commands

```bash
# Show help
./storyteller help
./storyteller h

# Show tool version
./storyteller version

# Check/apply project metadata updates
./storyteller update --check
./storyteller update --apply

# Start the LSP server (stdio)
./storyteller lsp start --stdio
```

#### RAG Command

Generate RAG (Retrieval-Augmented Generation) documents for AI-assisted writing.

```bash
# Export all elements to RAG documents
./storyteller rag export

# Export only changed files (incremental)
./storyteller rag export --incremental

# Update RAG documents + digrag index
./storyteller rag update

# Install Git hooks for auto-update
./storyteller rag install-hooks
```

See `docs/rag.md` for the full guide.

### Development

```bash
# Full quality gate (fmt/lint/test/coverage>=80%/meta:check)
deno task check

# Individual tasks
deno task fmt:check    # Format check
deno task lint         # Lint check
deno task test         # Run tests
deno task coverage     # Coverage check (threshold: 80%)
deno task bench        # Run benchmarks

# Build distributable artifacts (dist/)
deno task cli:package
```

### Quality Gates

- **Test Coverage**: Minimum 80% required (enforced by CI)
- **Format/Lint**: `deno fmt --check` and `deno lint`
- **Meta Check**: `storyteller meta check` for manuscripts

### Templates

- `basic` - Basic story structure with all core elements
- `novel` - Novel-focused structure with extended character development
- `screenplay` - Screenplay structure with scene-based organization

### Generated Project Structure

```
story-project/
├── src/              # Story structure definitions
│   ├── characters/   # Character definitions
│   ├── settings/     # Story settings
│   ├── chapters/     # Chapter structure
│   ├── plots/        # Plot development
│   ├── timeline/     # Timeline management
│   ├── themes/       # Theme definitions
│   ├── structure/    # Story structure
│   └── purpose/      # Story purpose
├── manuscripts/      # Actual story manuscripts
├── drafts/          # Draft notes and ideas
├── output/          # Generated output for AI collaboration
├── tests/           # Story validation tests
├── story.ts         # Main story implementation
├── story.config.ts  # Project configuration
└── README.md        # Project documentation
```

### Working with Generated Projects

After generating a project, you can:

```bash
# Navigate to your project
cd my-story

# Run the story implementation
deno run story.ts

# Run story validation tests
deno test

# Format your code
deno fmt

# Lint your code
deno lint
```

The generated `story.ts` file implements the `StoryTeller` interface and
includes:

- **Purpose**: What you want to express in your story
- **Characters**: Story characters with names
- **Settings**: Story environments and locations
- **Chapters**: Story structure and organization
- **Plots**: Main story development and sub-plots
- **Themes**: Optional thematic elements
- **Timeline**: Chronological organization
- **Validation**: Built-in story consistency checking

### Example Usage

```bash
# Create a novel project
./storyteller generate --name "space-odyssey" --template novel

# Navigate and explore
cd space-odyssey
ls -la

# Edit your story structure
# Edit src/characters/main_character.ts
# Edit src/plots/ for your story development
# Write your manuscript in manuscripts/

# Test your story structure
deno test

# Run your story
deno run story.ts
```

## Feature(TODO)

- [x] Generate a project directory for storytelling
- [ ]Story elements can be expressed in TypeScript types
- [ ] Unit test for story with AI.
- [ ] Validate a setting of a story in a manuscript
- [ ] Validate a foreshadowing in a manuscript
- [ ] Validate typo with textlint
- [ ] Output writing status for statusline in vim
- [ ] Visualize story structure
- [ ] Integrate AI for writing(Just a idea)
- [ ] Talk with AI.
- [ ] Extract idea from own datalake with shellscript.

## Development

See [Development](#development) section above for available tasks.

```bash
# Show CLI help with verbose logging
deno run main.ts --log-level debug help
```

## Misc

Inspired by
[StreetStoryteller in StrategicStoratosphere](http://motonaga.world.coocan.jp/)
