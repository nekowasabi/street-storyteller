import { err, ok } from "../../../shared/result.ts";
import type { CommandContext, CommandExecutionError } from "../../types.ts";
import { BaseCliCommand } from "../../base_command.ts";
import {
  type ChapterMeta,
  MetaGeneratorService,
} from "../../../application/meta/meta_generator_service.ts";
import { TypeScriptEmitter } from "../../../application/meta/typescript_emitter.ts";
import { createLegacyCommandDescriptor } from "../../legacy_adapter.ts";
import type {
  CommandDescriptor,
  CommandOptionDescriptor,
} from "../../types.ts";
import { expandGlob } from "@std/fs";
import { InteractiveResolver } from "./interactive_resolver.ts";

interface MetaGenerateOptions {
  readonly markdownInputs: readonly string[];
  readonly dir?: string;
  readonly batch?: boolean;
  readonly recursive?: boolean;
  readonly characters?: readonly string[];
  readonly settings?: readonly string[];
  readonly output?: string;
  readonly preset?: string;
  readonly "dry-run"?: boolean;
  readonly preview?: boolean;
  readonly interactive?: boolean;
  readonly force?: boolean;
}

export class MetaGenerateCommand extends BaseCliCommand {
  override readonly name = "generate" as const;
  override readonly path = ["meta", "generate"] as const;

  constructor(
    private readonly service: MetaGeneratorService = new MetaGeneratorService(),
    private readonly emitter: TypeScriptEmitter = new TypeScriptEmitter(),
    private readonly interactiveResolver: InteractiveResolver =
      new InteractiveResolver(),
  ) {
    super([]);
  }

  protected async handle(context: CommandContext) {
    const args = context.args ?? {};
    if (args.help === true || args.h === true) {
      context.presenter.showInfo(renderMetaGenerateHelp());
      return ok(undefined);
    }

    const parsed = parseOptions(context);
    if ("code" in parsed) {
      return err(parsed);
    }

    if ((parsed.batch || parsed.dir) && parsed.output) {
      return err({
        code: "invalid_arguments",
        message: "--output cannot be used with --batch or --dir",
      });
    }

    const markdownPaths = await resolveMarkdownTargets(parsed);
    if (markdownPaths.length === 0) {
      return err({
        code: "invalid_arguments",
        message: "No markdown files found to process",
      });
    }

    const metas: ChapterMeta[] = [];
    const total = markdownPaths.length;

    for (const [index, markdownPath] of markdownPaths.entries()) {
      if (total > 1) {
        context.presenter.showInfo(`[${index + 1}/${total}] ${markdownPath}`);
      }

      const generated = await this.service.generateFromMarkdown(markdownPath, {
        dryRun: true,
        characters: parsed.characters,
        settings: parsed.settings,
        preset: parsed.preset,
      });

      if (!generated.ok) {
        return err({
          code: "meta_generation_failed",
          message: generated.error.message,
        });
      }

      let meta = generated.value;

      if (parsed.interactive) {
        const entities = [...(meta.characters ?? []), ...(meta.settings ?? [])];
        meta = {
          ...meta,
          references: await this.interactiveResolver.resolve(entities, {
            threshold: 0.8,
          }),
        };
      }

      if (parsed.preview) {
        context.presenter.showInfo(renderPreview(markdownPath, meta));
      }

      const outputPath = parsed.output ?? defaultOutputPath(markdownPath);

      if (!parsed["dry-run"]) {
        const exists = await pathExists(outputPath);
        if (exists && !parsed.force) {
          return err({
            code: "meta_generation_failed",
            message:
              `Output already exists: ${outputPath} (use --force to overwrite)`,
          });
        }

        const emitted = await this.emitter.emit(meta, outputPath);
        if (!emitted.ok) {
          return err({
            code: "meta_generation_failed",
            message: emitted.error.message,
          });
        }
      }

      metas.push(meta);
    }

    return ok(parsed.batch || parsed.dir ? metas : metas[0]);
  }
}

function parseOptions(
  context: CommandContext,
): MetaGenerateOptions | CommandExecutionError {
  const args = context.args ?? {};

  const dir = typeof args.dir === "string" && args.dir.trim().length > 0
    ? args.dir
    : undefined;
  const markdownInputs = extractMarkdownInputs(args.extra);

  if (!dir && markdownInputs.length === 0) {
    return {
      code: "invalid_arguments",
      message:
        "Markdown path is required (e.g. storyteller meta generate manuscripts/chapter01.md), or use --dir <dir>",
    };
  }

  const characters = typeof args.characters === "string"
    ? splitCsv(args.characters)
    : undefined;
  const settings = typeof args.settings === "string"
    ? splitCsv(args.settings)
    : undefined;

  const output =
    typeof args.output === "string" && args.output.trim().length > 0
      ? args.output
      : undefined;
  const preset =
    typeof args.preset === "string" && args.preset.trim().length > 0
      ? args.preset
      : undefined;

  return {
    markdownInputs,
    dir,
    batch: args.batch === true,
    recursive: args.recursive === true || args.r === true,
    characters,
    settings,
    output,
    preset,
    "dry-run": args["dry-run"] === true,
    preview: args.preview === true,
    interactive: args.interactive === true,
    force: args.force === true,
  };
}

function extractMarkdownInputs(extra: unknown): string[] {
  if (Array.isArray(extra)) {
    return extra.map((value) => String(value)).map((v) => v.trim()).filter((
      v,
    ) => v.length > 0);
  }
  if (typeof extra === "string" && extra.trim().length > 0) {
    return [extra.trim()];
  }
  return [];
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

async function resolveMarkdownTargets(
  options: MetaGenerateOptions,
): Promise<string[]> {
  if (options.dir) {
    const dir = options.dir;
    const pattern = options.recursive
      ? `${dir.replace(/\/+$/, "")}/**/*.md`
      : `${dir.replace(/\/+$/, "")}/*.md`;
    const matches: string[] = [];
    for await (const entry of expandGlob(pattern, { includeDirs: false })) {
      matches.push(entry.path);
    }
    return matches.sort((a, b) => a.localeCompare(b));
  }

  if (options.batch) {
    const patterns = options.markdownInputs;
    const matches = new Set<string>();
    for (const pattern of patterns) {
      for await (const entry of expandGlob(pattern, { includeDirs: false })) {
        matches.add(entry.path);
      }
    }
    return Array.from(matches).sort((a, b) => a.localeCompare(b));
  }

  return options.markdownInputs.length > 0 ? [options.markdownInputs[0]] : [];
}

function defaultOutputPath(markdownPath: string): string {
  if (markdownPath.endsWith(".md")) {
    return markdownPath.slice(0, -3) + ".meta.ts";
  }
  return `${markdownPath}.meta.ts`;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

function renderPreview(markdownPath: string, meta: ChapterMeta): string {
  const lines: string[] = [];
  lines.push(`Meta generation preview: ${markdownPath}`);
  lines.push(`  chapter_id: ${meta.id}`);
  lines.push(`  title: ${meta.title}`);
  lines.push(`  order: ${meta.order}`);

  lines.push("");
  lines.push("Characters:");
  for (const character of meta.characters ?? []) {
    const confidence = Math.round((character.confidence ?? 0) * 100);
    lines.push(
      `  - ${character.id} (${character.exportName}) occurrences:${
        character.occurrences ?? 0
      } confidence:${confidence}%`,
    );
  }

  lines.push("");
  lines.push("Settings:");
  for (const setting of meta.settings ?? []) {
    const confidence = Math.round((setting.confidence ?? 0) * 100);
    lines.push(
      `  - ${setting.id} (${setting.exportName}) occurrences:${
        setting.occurrences ?? 0
      } confidence:${confidence}%`,
    );
  }

  return lines.join("\n");
}

export const metaGenerateCommandHandler = new MetaGenerateCommand();

const META_GENERATE_OPTIONS: readonly CommandOptionDescriptor[] = [
  {
    name: "--help",
    aliases: ["-h"],
    summary: "Show help for this command.",
    type: "boolean",
  },
  {
    name: "--characters",
    summary:
      "Comma-separated character ids to include (overrides frontmatter).",
    type: "string",
  },
  {
    name: "--settings",
    summary: "Comma-separated setting ids to include (overrides frontmatter).",
    type: "string",
  },
  {
    name: "--output",
    summary: "Output file path (default: <markdown>.meta.ts).",
    type: "string",
  },
  {
    name: "--preview",
    summary: "Print a preview of detected entities and metadata.",
    type: "boolean",
  },
  {
    name: "--interactive",
    summary: "Ask for confirmation on ambiguous/low-confidence references.",
    type: "boolean",
  },
  {
    name: "--batch",
    summary:
      "Treat the markdown input as a glob pattern and process all matches.",
    type: "boolean",
  },
  {
    name: "--dir",
    summary: "Process all .md files inside a directory.",
    type: "string",
  },
  {
    name: "--recursive",
    aliases: ["-r"],
    summary: "Use recursive search with --dir.",
    type: "boolean",
  },
  {
    name: "--preset",
    summary:
      "Validation preset (battle-scene, romance-scene, dialogue, exposition).",
    type: "string",
  },
  {
    name: "--dry-run",
    summary: "Generate metadata without writing the output file.",
    type: "boolean",
  },
  {
    name: "--force",
    summary: "Overwrite output file if it already exists.",
    type: "boolean",
  },
] as const;

function renderMetaGenerateHelp(): string {
  const lines: string[] = [];
  lines.push(
    "meta generate — Generate a chapter .meta.ts file from a Markdown manuscript.",
  );
  lines.push("");
  lines.push("Usage:");
  lines.push("  storyteller meta generate <markdown-path> [options]");
  lines.push("");
  lines.push("Options:");

  const optionLabels = META_GENERATE_OPTIONS.map((option) => {
    const parts = [option.name, ...(option.aliases ?? [])];
    return parts.join(", ");
  });
  const width = optionLabels.reduce(
    (max, label) => Math.max(max, label.length),
    0,
  );

  META_GENERATE_OPTIONS.forEach((option, index) => {
    const label = optionLabels[index].padEnd(width);
    lines.push(`  ${label}  ${option.summary}`.trimEnd());
  });

  lines.push("");
  lines.push("Examples:");
  lines.push("  storyteller meta generate manuscripts/chapter01.md");
  lines.push(
    "  storyteller meta generate manuscripts/chapter01.md --dry-run --preview",
  );
  lines.push("  storyteller meta generate manuscripts/*.md --batch");
  lines.push("  storyteller meta generate --dir manuscripts --recursive");

  return lines.join("\n");
}

export const metaGenerateCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(
    metaGenerateCommandHandler,
    {
      summary: "Generate a chapter .meta.ts file from a Markdown manuscript.",
      usage: "storyteller meta generate <markdown-path> [options]",
      options: META_GENERATE_OPTIONS,
      examples: [
        {
          summary: "Generate metadata for a chapter manuscript",
          command: "storyteller meta generate manuscripts/chapter01.md",
        },
        {
          summary: "Generate without writing output",
          command:
            "storyteller meta generate manuscripts/chapter01.md --dry-run",
        },
        {
          summary: "Override detected characters/settings",
          command:
            "storyteller meta generate manuscripts/chapter01.md --characters hero,heroine --settings kingdom",
        },
      ],
    },
  );
