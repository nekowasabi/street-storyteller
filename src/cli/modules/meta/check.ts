import { expandGlob } from "@std/fs";
import { join } from "@std/path";
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
import type { BeatStructurePosition, Subplot } from "@storyteller/types/v2/subplot.ts";
import { validateSubplot } from "@storyteller/plugins/core/subplot/validator.ts";

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

    // Why: subplot検証はmeta checkの一部として統合。src/subplots/が存在しない場合はgraceful skip。
    const subplotErrors = await validateSubplots(context);
    if (subplotErrors.length > 0) {
      for (const error of subplotErrors) {
        context.presenter.showError(`[meta check] subplot: ${error}`);
      }
      return err({
        code: "meta_check_failed",
        message: `${subplotErrors.length} subplot validation error(s)`,
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

// ========================================
// Subplot validation helpers
// ========================================

/**
 * プロジェクト内のサブプロットを読み込み、構造と参照の整合性を検証する。
 * src/subplots/ が存在しない場合は info ログのみ出力しエラーは返さない。
 */
async function validateSubplots(
  context: CommandContext,
): Promise<string[]> {
  const errors: string[] = [];
  const projectRoot = await resolveProjectRoot(context);
  if (!projectRoot) return errors;

  const subplotsDir = join(projectRoot, "src/subplots");
  const subplots = await loadSubplotsFromDirectory(subplotsDir);

  if (subplots.length === 0) {
    context.presenter.showInfo(
      "[meta check] No subplots found (src/subplots/ is empty or missing) — skipping subplot validation",
    );
    return errors;
  }

  // Collect known IDs for cross-reference checks
  const characterIds = await collectIdsFromDir(
    join(projectRoot, "src/characters"),
  );
  const settingIds = await collectIdsFromDir(join(projectRoot, "src/settings"));
  const timelineEventIds = await collectTimelineEventIds(
    join(projectRoot, "src/timelines"),
  );

  const subplotIds = new Set(subplots.map((s) => s.id));

  for (const subplot of subplots) {
    // Basic structure validation via plugin validator
    const result = validateSubplot(subplot);
    if (!result.valid) {
      for (const ve of result.errors ?? []) {
        errors.push(`${subplot.id}: ${ve.field} — ${ve.message}`);
      }
    }

    // Reference validation
    const refErrors = validateSubplotReferences(
      subplot,
      subplotIds,
      characterIds,
      settingIds,
      timelineEventIds,
    );
    errors.push(...refErrors);

    // Structural completeness validation
    const structErrors = validateSubplotStructure(subplot, subplotIds);
    errors.push(...structErrors);
  }

  return errors;
}

/**
 * Load Subplot objects from all .ts files in the given directory.
 * Returns an empty array if the directory does not exist.
 */
async function loadSubplotsFromDirectory(
  dir: string,
): Promise<Subplot[]> {
  const subplots: Subplot[] = [];
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const filePath = join(dir, entry.name);
      try {
        const content = await Deno.readTextFile(filePath);
        const subplot = parseSubplotFromFile(content);
        if (subplot) subplots.push(subplot);
      } catch {
        // skip unreadable files
      }
    }
  } catch {
    // directory does not exist — return empty
  }
  return subplots;
}

/**
 * Parse a Subplot object from TypeScript file content.
 * Extracts the first exported const typed as Subplot.
 */
function parseSubplotFromFile(content: string): Subplot | null {
  try {
    const match = content.match(
      /export\s+const\s+\w+\s*:\s*Subplot\s*=\s*(\{[\s\S]*?\});?\s*$/,
    );
    if (!match) return null;
    return JSON.parse(match[1]) as Subplot;
  } catch {
    return null;
  }
}

/**
 * Validate that all cross-references in a subplot point to existing entities.
 */
function validateSubplotReferences(
  subplot: Subplot,
  subplotIds: Set<string>,
  characterIds: Set<string>,
  settingIds: Set<string>,
  timelineEventIds: Set<string>,
): string[] {
  const errors: string[] = [];
  const prefix = subplot.id;

  for (const beat of subplot.beats) {
    // timelineEventId reference check
    if (
      beat.timelineEventId &&
      timelineEventIds.size > 0 &&
      !timelineEventIds.has(beat.timelineEventId)
    ) {
      errors.push(
        `${prefix}: beat "${beat.id}" references unknown timelineEventId "${beat.timelineEventId}"`,
      );
    }

    // character references
    for (const charId of beat.characters ?? []) {
      if (characterIds.size > 0 && !characterIds.has(charId)) {
        errors.push(
          `${prefix}: beat "${beat.id}" references unknown character "${charId}"`,
        );
      }
    }

    // setting references
    for (const setId of beat.settings ?? []) {
      if (settingIds.size > 0 && !settingIds.has(setId)) {
        errors.push(
          `${prefix}: beat "${beat.id}" references unknown setting "${setId}"`,
        );
      }
    }
  }

  // Intersection references
  for (const intersection of subplot.intersections ?? []) {
    if (!subplotIds.has(intersection.targetSubplotId)) {
      errors.push(
        `${prefix}: intersection references unknown targetSubplotId "${intersection.targetSubplotId}"`,
      );
    }

    // sourceBeatId must exist in the source subplot
    const sourceSubplot = intersection.sourceSubplotId === subplot.id
      ? subplot
      : null;
    if (sourceSubplot) {
      const beatIds = new Set(sourceSubplot.beats.map((b) => b.id));
      if (!beatIds.has(intersection.sourceBeatId)) {
        errors.push(
          `${prefix}: intersection references unknown sourceBeatId "${intersection.sourceBeatId}" in "${intersection.sourceSubplotId}"`,
        );
      }
    }
  }

  return errors;
}

/**
 * Validate structural completeness of a subplot.
 * - Requires at least one beat with structurePosition="climax"
 * - Requires at least one beat with structurePosition="setup"
 * - Warn (as error) if non-main subplot has zero intersections
 */
function validateSubplotStructure(
  subplot: Subplot,
  subplotIds: Set<string>,
): string[] {
  const errors: string[] = [];
  const prefix = subplot.id;

  const positions = new Set(
    subplot.beats
      .map((b) => b.structurePosition)
      .filter((p): p is BeatStructurePosition => typeof p === "string"),
  );

  if (!positions.has("climax")) {
    errors.push(
      `${prefix}: no beat with structurePosition="climax" found (required)`,
    );
  }

  if (!positions.has("setup")) {
    errors.push(
      `${prefix}: no beat with structurePosition="setup" found (required)`,
    );
  }

  // Warn about orphan subplots (non-main with zero intersections)
  if (
    subplot.type !== "main" &&
    (!subplot.intersections || subplot.intersections.length === 0)
  ) {
    // Why: info-level warning rather than error; orphan subplots are valid but unusual.
    // Returned as a warning-prefixed message so the caller can distinguish if needed.
    errors.push(
      `${prefix} [warn]: non-main subplot has no intersections (orphan)`,
    );
  }

  // parentSubplotId reference check
  if (
    subplot.parentSubplotId &&
    subplotIds.size > 0 &&
    !subplotIds.has(subplot.parentSubplotId)
  ) {
    errors.push(
      `${prefix}: references unknown parentSubplotId "${subplot.parentSubplotId}"`,
    );
  }

  return errors;
}

/**
 * Collect all entity IDs exported from .ts files in a directory.
 * Used for cross-reference validation.
 */
async function collectIdsFromDir(
  dir: string,
): Promise<Set<string>> {
  const ids = new Set<string>();
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const filePath = join(dir, entry.name);
      try {
        const content = await Deno.readTextFile(filePath);
        // Match exported id field: id: "some_id" or id: 'some_id'
        const idPattern =
          /(?:export\s+const\s+\w+[^=]*=\s*\{[^}]*?\bid\s*:\s*["']([^"']+)["'])/gs;
        let match: RegExpExecArray | null;
        while ((match = idPattern.exec(content)) !== null) {
          ids.add(match[1]);
        }
      } catch {
        // skip
      }
    }
  } catch {
    // directory does not exist
  }
  return ids;
}

/**
 * Collect all timeline event IDs from timeline .ts files.
 */
async function collectTimelineEventIds(
  dir: string,
): Promise<Set<string>> {
  const ids = new Set<string>();
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const filePath = join(dir, entry.name);
      try {
        const content = await Deno.readTextFile(filePath);
        // Match event id fields inside events array
        const eventIdPattern = /\bid\s*:\s*["']([^"']+)["']/g;
        let match: RegExpExecArray | null;
        while ((match = eventIdPattern.exec(content)) !== null) {
          ids.add(match[1]);
        }
      } catch {
        // skip
      }
    }
  } catch {
    // directory does not exist
  }
  return ids;
}

/**
 * Resolve project root from context, falling back to cwd.
 */
async function resolveProjectRoot(
  context: CommandContext,
): Promise<string | null> {
  const config = await context.config.resolve();
  return (context.args?.projectRoot as string) ??
    config.runtime.projectRoot ??
    Deno.cwd();
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
