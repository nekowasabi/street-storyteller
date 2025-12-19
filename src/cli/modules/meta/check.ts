import { expandGlob } from "@std/fs";
import { err, ok } from "@storyteller/shared/result.ts";
import type {
  CommandContext,
  CommandDescriptor,
  CommandExecutionError,
  CommandOptionDescriptor,
} from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import { createLegacyCommandDescriptor } from "@storyteller/cli/legacy_adapter.ts";
import { MetaGeneratorService } from "@storyteller/application/meta/meta_generator_service.ts";

type MetaCheckOptions = {
  readonly markdownInputs: readonly string[];
  readonly dir?: string;
  readonly batch?: boolean;
  readonly recursive?: boolean;
  readonly characters?: readonly string[];
  readonly settings?: readonly string[];
  readonly preset?: string;
};

export class MetaCheckCommand extends BaseCliCommand {
  override readonly name = "check" as const;
  override readonly path = ["meta", "check"] as const;

  constructor(
    private readonly service: MetaGeneratorService = new MetaGeneratorService(),
  ) {
    super([]);
  }

  protected async handle(context: CommandContext) {
    const args = context.args ?? {};
    if (args.help === true || args.h === true) {
      context.presenter.showInfo(renderMetaCheckHelp());
      return ok(undefined);
    }

    const parsed = parseOptions(context);
    if ("code" in parsed) {
      return err(parsed);
    }

    const markdownPaths = await resolveMarkdownTargets(parsed);
    if (markdownPaths.length === 0) {
      return err({
        code: "invalid_arguments",
        message: "No markdown files found to check",
      });
    }

    const total = markdownPaths.length;
    const failures: { path: string; message: string }[] = [];

    for (const [index, markdownPath] of markdownPaths.entries()) {
      if (total > 1) {
        context.presenter.showInfo(`[${index + 1}/${total}] ${markdownPath}`);
      }

      const result = await this.service.generateFromMarkdown(markdownPath, {
        dryRun: true,
        characters: parsed.characters,
        settings: parsed.settings,
        preset: parsed.preset,
      });

      if (!result.ok) {
        failures.push({ path: markdownPath, message: result.error.message });
      }
    }

    if (failures.length > 0) {
      for (const failure of failures.slice(0, 10)) {
        context.presenter.showError(
          `[meta check] ${failure.path}: ${failure.message}`,
        );
      }
      const suffix = failures.length > 10
        ? ` (+${failures.length - 10} more)`
        : "";
      return err({
        code: "meta_check_failed",
        message: `${failures.length} file(s) failed meta check${suffix}`,
      });
    }

    context.presenter.showSuccess(
      `[meta check] OK (${markdownPaths.length} file(s))`,
    );
    return ok(undefined);
  }
}

function parseOptions(
  context: CommandContext,
): MetaCheckOptions | CommandExecutionError {
  const args = context.args ?? {};

  const dir = typeof args.dir === "string" && args.dir.trim().length > 0
    ? args.dir
    : undefined;
  const markdownInputs = extractMarkdownInputs(args.extra);

  if (!dir && markdownInputs.length === 0) {
    return {
      code: "invalid_arguments",
      message:
        "Markdown path is required (e.g. storyteller meta check manuscripts/chapter01.md), or use --dir <dir>",
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
      ? args.preset
      : undefined;

  return {
    markdownInputs,
    dir,
    batch: args.batch === true,
    recursive: args.recursive === true || args.r === true,
    characters,
    settings,
    preset,
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
  options: MetaCheckOptions,
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

export const metaCheckCommandHandler = new MetaCheckCommand();

const META_CHECK_OPTIONS: readonly CommandOptionDescriptor[] = [
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
    name: "--batch",
    summary:
      "Treat the markdown input as a glob pattern and check all matches.",
    type: "boolean",
  },
  {
    name: "--dir",
    summary: "Check all .md files inside a directory.",
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
] as const;

function renderMetaCheckHelp(): string {
  const lines: string[] = [];
  lines.push(
    "meta check — Validate that Markdown manuscripts can generate .meta.ts successfully.",
  );
  lines.push("");
  lines.push("Usage:");
  lines.push("  storyteller meta check <markdown-path> [options]");
  lines.push("");
  lines.push("Options:");

  const optionLabels = META_CHECK_OPTIONS.map((option) => {
    const parts = [option.name, ...(option.aliases ?? [])];
    return parts.join(", ");
  });
  const width = optionLabels.reduce(
    (max, label) => Math.max(max, label.length),
    0,
  );
  META_CHECK_OPTIONS.forEach((option, index) => {
    const label = optionLabels[index].padEnd(width);
    lines.push(`  ${label}  ${option.summary}`.trimEnd());
  });

  lines.push("");
  lines.push("Examples:");
  lines.push("  storyteller meta check manuscripts/chapter01.md");
  lines.push("  storyteller meta check --dir manuscripts --recursive");
  lines.push("  storyteller meta check manuscripts/*.md --batch");
  return lines.join("\n");
}

export const metaCheckCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(metaCheckCommandHandler, {
    summary: "Validate that Markdown manuscripts can generate .meta.ts.",
    usage: "storyteller meta check <markdown-path> [options]",
    options: META_CHECK_OPTIONS,
    examples: [
      {
        summary: "Check all manuscripts recursively",
        command: "storyteller meta check --dir manuscripts --recursive",
      },
    ],
  });
