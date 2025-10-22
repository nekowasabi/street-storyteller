# street-storyteller

## Description

SaC(StoryWriting as Code).

Support for writing a story.

## Installation

```bash
# Clone the repository
git clone https://github.com/nekowasabi/street-storyteller.git
cd street-storyteller

# Build the executable
deno task build
```

## Usage

`storyteller` is a command line tool for writing stories in a structured way.

### Commands

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

#### Options

- `--name, -n <name>` - Project name (required)
- `--template, -t <type>` - Template type (default: basic)
- `--path, -p <path>` - Custom project path (optional)
- `--log-level <level>` - Override logging level (`trace`-`fatal`)
- `--log-format <human|json>` - Choose console log format
- `--environment <env>` - Set runtime environment (`development`, `test`, `production`)
- `--cache-ttl <seconds>` - Adjust default cache TTL
- `--provider <id>` - Set default external provider id
- `--config <path>` - Provide explicit configuration file

#### Other Commands

```bash
# Show help
./storyteller help
./storyteller h
```

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

The generated `story.ts` file implements the `StoryTeller` interface and includes:

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

```bash
# Run tests
deno task test

# Show CLI help with verbose logging
deno run main.ts --log-level debug help

# Format code
deno fmt

# Lint code
deno lint
```

## Misc

Inspired by
[StreetStoryteller in StrategicStoratosphere](http://motonaga.world.coocan.jp/)
