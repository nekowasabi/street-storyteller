import { err, ok } from "@storyteller/shared/result.ts";
import type {
  CommandContext,
  CommandExecutionError,
} from "@storyteller/cli/types.ts";
import type {
  CommandDescriptor,
  CommandOptionDescriptor,
} from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import { createLegacyCommandDescriptor } from "@storyteller/cli/legacy_adapter.ts";
import { MetaGeneratorService } from "@storyteller/application/meta/meta_generator_service.ts";
import { TypeScriptEmitter } from "@storyteller/application/meta/typescript_emitter.ts";

type WatchOptions = {
  readonly targetPath?: string;
  readonly dir?: string;
  readonly recursive?: boolean;
  readonly debounceMs?: number;
  readonly force?: boolean;
  readonly update?: boolean;
  readonly preset?: string;
  readonly characters?: readonly string[];
  readonly settings?: readonly string[];
};

export function extractMarkdownPathsFromWatchEvent(event: {
  readonly kind: string;
  readonly paths: readonly string[];
}): string[] {
  if (event.kind === "access") return [];
  const result: string[] = [];
  for (const path of event.paths ?? []) {
    if (path.endsWith(".md")) result.push(path);
  }
  return result;
}

function extractTargetPath(extra: unknown): string | undefined {
  if (Array.isArray(extra)) {
    const first = extra.map((v) => String(v)).map((v) => v.trim()).find((v) =>
      v.length > 0
    );
    return first;
  }
  if (typeof extra === "string" && extra.trim().length > 0) {
    return extra.trim();
  }
  return undefined;
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

async function statIfExists(path: string): Promise<Deno.FileInfo | null> {
  try {
    return await Deno.stat(path);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return null;
    throw error;
  }
}

function defaultOutputPath(markdownPath: string): string {
  if (markdownPath.endsWith(".md")) {
    return markdownPath.slice(0, -3) + ".meta.ts";
  }
  return `${markdownPath}.meta.ts`;
}

function parseWatchOptions(
  context: CommandContext,
): WatchOptions | CommandExecutionError {
  const args = context.args ?? {};

  const dir = typeof args.dir === "string" && args.dir.trim().length > 0
    ? args.dir.trim()
    : undefined;
  const targetPath = extractTargetPath(args.extra);

  if (!dir && !targetPath) {
    return {
      code: "invalid_arguments",
      message:
        "Path is required (e.g. storyteller meta watch manuscripts/, or use --dir <dir>)",
    };
  }

  const debounceRaw = args.debounce;
  const debounceMs = typeof debounceRaw === "number"
    ? debounceRaw
    : typeof debounceRaw === "string" && debounceRaw.trim().length > 0
    ? Number(debounceRaw)
    : undefined;
  if (
    debounceMs !== undefined && (!Number.isFinite(debounceMs) || debounceMs < 0)
  ) {
    return {
      code: "invalid_arguments",
      message: "--debounce must be a non-negative number",
    };
  }

  const characters = typeof args.characters === "string"
    ? splitCsv(args.characters)
    : undefined;
  const settings = typeof args.settings === "string"
    ? splitCsv(args.settings)
    : undefined;
  const preset =
    typeof args.preset === "string" && args.preset.trim().length > 0
      ? args.preset.trim()
      : undefined;

  const force = args.force === true;
  const update = args.update === true || !force;

  return {
    targetPath,
    dir,
    recursive: args.recursive === true || args.r === true,
    debounceMs: debounceMs ?? 300,
    force,
    update,
    preset,
    characters,
    settings,
  };
}

export class MetaWatchCommand extends BaseCliCommand {
  override readonly name = "watch" as const;
  override readonly path = ["meta", "watch"] as const;

  constructor(
    private readonly service: MetaGeneratorService = new MetaGeneratorService(),
    private readonly emitter: TypeScriptEmitter = new TypeScriptEmitter(),
    private readonly watcherFactory: (
      paths: readonly string[],
      options: { recursive: boolean },
    ) => { close(): void } & AsyncIterable<{ kind: string; paths: string[] }> =
      (
        paths,
        options,
      ) => Deno.watchFs([...paths], options),
  ) {
    super([]);
  }

  protected async handle(context: CommandContext) {
    const args = context.args ?? {};
    if (args.help === true || args.h === true) {
      context.presenter.showInfo(renderMetaWatchHelp());
      return ok(undefined);
    }

    const parsed = parseWatchOptions(context);
    if ("code" in parsed) return err(parsed);

    const watchTargets: string[] = [];
    let recursive = parsed.recursive === true;

    if (parsed.dir) {
      watchTargets.push(parsed.dir);
    } else if (parsed.targetPath) {
      const stat = await statIfExists(parsed.targetPath);
      if (!stat) {
        return err({
          code: "invalid_arguments",
          message: `Path not found: ${parsed.targetPath}`,
        });
      }
      if (stat.isDirectory) {
        watchTargets.push(parsed.targetPath);
        recursive = parsed.recursive === true;
      } else {
        watchTargets.push(parsed.targetPath);
        recursive = false;
      }
    }

    context.presenter.showInfo(
      `Watching ${watchTargets.join(", ")} (recursive:${
        recursive ? "yes" : "no"
      }, debounce:${parsed.debounceMs}ms)`,
    );

    const watcher = this.watcherFactory(watchTargets, { recursive });
    const pending = new Set<string>();
    let timer: number | null = null;

    const flush = async () => {
      timer = null;
      const paths = Array.from(pending.values());
      pending.clear();
      for (const markdownPath of paths) {
        try {
          const generated = await this.service.generateFromMarkdown(
            markdownPath,
            {
              dryRun: true,
              characters: parsed.characters,
              settings: parsed.settings,
              preset: parsed.preset,
            },
          );
          if (!generated.ok) {
            context.presenter.showError(
              `[meta watch] generation failed: ${markdownPath}: ${generated.error.message}`,
            );
            continue;
          }

          const meta = generated.value;
          const outputPath = defaultOutputPath(markdownPath);
          const emitted = parsed.force
            ? await this.emitter.emit(meta, outputPath)
            : await this.emitter.updateOrEmit(meta, outputPath);
          if (!emitted.ok) {
            context.presenter.showError(
              `[meta watch] write failed: ${outputPath}: ${emitted.error.message}`,
            );
            continue;
          }
          context.presenter.showSuccess(`[meta watch] updated: ${outputPath}`);
        } catch (cause) {
          const message = cause instanceof Error
            ? cause.message
            : String(cause);
          context.presenter.showError(
            `[meta watch] unexpected error: ${message}`,
          );
        }
      }
    };

    try {
      for await (const event of watcher) {
        for (const path of extractMarkdownPathsFromWatchEvent(event)) {
          if (path.endsWith(".meta.ts")) continue;
          pending.add(path);
        }

        if (pending.size === 0) continue;

        if (timer !== null) {
          clearTimeout(timer);
        }
        timer = setTimeout(() => {
          flush();
        }, parsed.debounceMs) as unknown as number;
      }
    } finally {
      try {
        watcher.close();
      } catch {
        // ignore
      }
    }

    return ok(undefined);
  }
}

export const metaWatchCommandHandler = new MetaWatchCommand();

const META_WATCH_OPTIONS: readonly CommandOptionDescriptor[] = [
  {
    name: "--help",
    aliases: ["-h"],
    summary: "Show help for this command.",
    type: "boolean",
  },
  {
    name: "--dir",
    summary: "Watch a directory containing .md files.",
    type: "string",
  },
  {
    name: "--recursive",
    aliases: ["-r"],
    summary: "Watch directories recursively.",
    type: "boolean",
  },
  {
    name: "--debounce",
    summary: "Debounce time in ms (default: 300).",
    type: "number",
  },
  {
    name: "--preset",
    summary:
      "Validation preset (battle-scene, romance-scene, dialogue, exposition).",
    type: "string",
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
    name: "--update",
    summary:
      "Use marker-based safe updates when output exists (default: enabled).",
    type: "boolean",
  },
  {
    name: "--force",
    summary: "Overwrite output file if it already exists.",
    type: "boolean",
  },
] as const;

function renderMetaWatchHelp(): string {
  const lines: string[] = [];
  lines.push("meta watch — Watch Markdown files and keep .meta.ts up to date.");
  lines.push("");
  lines.push("Usage:");
  lines.push("  storyteller meta watch <path> [options]");
  lines.push("  storyteller meta watch --dir <dir> [options]");
  lines.push("");
  lines.push("Options:");

  const optionLabels = META_WATCH_OPTIONS.map((option) => {
    const parts = [option.name, ...(option.aliases ?? [])];
    return parts.join(", ");
  });
  const width = optionLabels.reduce(
    (max, label) => Math.max(max, label.length),
    0,
  );
  META_WATCH_OPTIONS.forEach((option, index) => {
    const label = optionLabels[index].padEnd(width);
    lines.push(`  ${label}  ${option.summary}`.trimEnd());
  });

  lines.push("");
  lines.push("Examples:");
  lines.push("  storyteller meta watch manuscripts/");
  lines.push("  storyteller meta watch --dir manuscripts --recursive");
  lines.push(
    "  storyteller meta watch manuscripts/chapter01.md --debounce 200",
  );
  lines.push("  storyteller meta watch manuscripts/ --force");

  return lines.join("\n");
}

export const metaWatchCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(metaWatchCommandHandler, {
    summary: "Watch Markdown files and update .meta.ts on changes.",
    usage: "storyteller meta watch <path> [options]",
    options: META_WATCH_OPTIONS,
    examples: [
      {
        summary: "Watch a manuscripts directory and update meta files",
        command: "storyteller meta watch --dir manuscripts --recursive",
      },
    ],
  });
