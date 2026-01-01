/**
 * meta sync コマンド
 *
 * 原稿ファイルのFrontMatterを検出されたエンティティと自動同期する
 */
import { walk } from "@std/fs";
import { isAbsolute, join, relative } from "@std/path";
import { err, ok } from "@storyteller/shared/result.ts";
import type {
  CommandContext,
  CommandDescriptor,
} from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import { createLegacyCommandDescriptor } from "@storyteller/cli/legacy_adapter.ts";
import {
  type BindableEntityType,
} from "@storyteller/application/meta/frontmatter_editor.ts";
import {
  FrontmatterSyncService,
  type SyncOptions,
  type SyncResult,
} from "@storyteller/application/meta/frontmatter_sync_service.ts";
import { loadEntities } from "@storyteller/cli/modules/lsp/start.ts";

/**
 * meta sync コマンドオプション
 */
interface MetaSyncOptions {
  readonly targetPath?: string;
  readonly dir?: string;
  readonly recursive?: boolean;
  readonly preview?: boolean;
  readonly force?: boolean;
  readonly types?: string[];
  readonly confidence?: number;
  readonly json?: boolean;
}

/**
 * ヘルプテキストを生成
 */
function renderMetaSyncHelp(): string {
  return `
storyteller meta sync - Sync frontmatter with detected entities

USAGE:
  storyteller meta sync [FILE|DIR] [OPTIONS]

ARGUMENTS:
  FILE|DIR    Target markdown file or directory (default: manuscripts/)

OPTIONS:
  -h, --help           Show this help message
  --dir <path>         Process all markdown files in directory
  -r, --recursive      Recursively process subdirectories
  --preview            Show changes without modifying files
  --force              Replace existing entities (sync mode)
  --types <list>       Entity types to sync (comma-separated)
                       Available: characters,settings,foreshadowings,
                                 timelines,timeline_events,phases
  --confidence <num>   Confidence threshold (default: 0.85)
  --json               Output results in JSON format

EXAMPLES:
  # Sync single file
  storyteller meta sync manuscripts/chapter01.md

  # Preview changes
  storyteller meta sync manuscripts/chapter01.md --preview

  # Sync all files in directory
  storyteller meta sync --dir manuscripts/ -r

  # Force sync (replace existing entities)
  storyteller meta sync manuscripts/chapter01.md --force

  # Only sync characters
  storyteller meta sync manuscripts/chapter01.md --types characters
`.trim();
}

/**
 * コマンドオプションをパース
 */
function parseMetaSyncOptions(
  context: CommandContext,
): MetaSyncOptions | { code: string; message: string } {
  const args = context.args ?? {};
  const positionals = args._ as string[] | undefined;

  return {
    targetPath: positionals?.[0],
    dir: args.dir as string | undefined,
    recursive: (args.recursive ?? args.r) as boolean | undefined,
    preview: args.preview as boolean | undefined,
    force: args.force as boolean | undefined,
    types: args.types
      ? (args.types as string).split(",").map((t) => t.trim())
      : undefined,
    confidence: args.confidence as number | undefined,
    json: args.json as boolean | undefined,
  };
}

/**
 * 対象ファイル一覧を解決
 */
async function resolveTargets(
  projectRoot: string,
  options: MetaSyncOptions,
): Promise<string[]> {
  const targets: string[] = [];

  if (options.targetPath) {
    // 単一ファイルまたはディレクトリ
    const fullPath = isAbsolute(options.targetPath)
      ? options.targetPath
      : join(projectRoot, options.targetPath);

    const stat = await Deno.stat(fullPath).catch(() => null);
    if (stat?.isDirectory) {
      return await collectMarkdownFiles(fullPath, options.recursive ?? false);
    } else if (stat?.isFile && fullPath.endsWith(".md")) {
      return [relative(projectRoot, fullPath)];
    }
  }

  if (options.dir) {
    const fullPath = isAbsolute(options.dir)
      ? options.dir
      : join(projectRoot, options.dir);
    return await collectMarkdownFiles(fullPath, options.recursive ?? false);
  }

  // デフォルト: manuscripts/ ディレクトリ
  const manuscriptsDir = join(projectRoot, "manuscripts");
  const stat = await Deno.stat(manuscriptsDir).catch(() => null);
  if (stat?.isDirectory) {
    return await collectMarkdownFiles(manuscriptsDir, true);
  }

  return targets;
}

/**
 * ディレクトリ内のMarkdownファイルを収集
 */
async function collectMarkdownFiles(
  dir: string,
  recursive: boolean,
): Promise<string[]> {
  const files: string[] = [];
  const maxDepth = recursive ? Infinity : 1;

  for await (
    const entry of walk(dir, {
      includeDirs: false,
      exts: [".md"],
      maxDepth,
    })
  ) {
    files.push(entry.path);
  }

  return files;
}

/**
 * プレビュー結果を表示
 */
function renderPreview(
  presenter: CommandContext["presenter"],
  path: string,
  result: SyncResult,
): void {
  presenter.showInfo(`\n--- Preview: ${path} ---`);
  if (result.added.length > 0) {
    presenter.showInfo("Added:");
    for (const change of result.added) {
      presenter.showInfo(`  ${change.type}: ${change.ids.join(", ")}`);
    }
  }
  if (result.removed.length > 0) {
    presenter.showInfo("Removed:");
    for (const change of result.removed) {
      presenter.showInfo(`  ${change.type}: ${change.ids.join(", ")}`);
    }
  }
  if (!result.changed) {
    presenter.showInfo("  (no changes)");
  }
}

/**
 * meta sync コマンド
 */
export class MetaSyncCommand extends BaseCliCommand {
  override readonly name = "sync" as const;
  override readonly path = ["meta", "sync"] as const;

  protected async handle(context: CommandContext) {
    const args = context.args ?? {};
    if (args.help === true || args.h === true) {
      context.presenter.showInfo(renderMetaSyncHelp());
      return ok(undefined);
    }

    const parsed = parseMetaSyncOptions(context);
    if ("code" in parsed) return err(parsed);

    const projectRoot = Deno.cwd();
    const entities = await loadEntities(projectRoot);
    const service = new FrontmatterSyncService(projectRoot, entities);

    const syncOptions: Partial<SyncOptions> = {
      mode: parsed.force ? "sync" : "add",
      dryRun: parsed.preview ?? false,
      confidenceThreshold: parsed.confidence ?? 0.85,
      ...(parsed.types
        ? { entityTypes: parsed.types as BindableEntityType[] }
        : {}),
    };

    const targets = await resolveTargets(projectRoot, parsed);
    if (targets.length === 0) {
      return err({
        code: "no_targets",
        message: "No markdown files found to process",
      });
    }

    const results: SyncResult[] = [];

    for (const target of targets) {
      const result = await service.sync(target, syncOptions);
      if (!result.ok) {
        context.presenter.showError(`${target}: ${result.error.message}`);
        continue;
      }

      results.push(result.value);

      if (parsed.preview) {
        renderPreview(context.presenter, target, result.value);
      } else if (parsed.json) {
        // JSON mode: collect results
      } else if (result.value.changed) {
        context.presenter.showSuccess(`[sync] ${target}: updated`);
      } else {
        context.presenter.showInfo(`[sync] ${target}: no changes`);
      }
    }

    if (parsed.json) {
      context.presenter.showInfo(JSON.stringify(results, null, 2));
    }

    return ok(results);
  }
}

/**
 * コマンドインスタンス
 */
export const metaSyncCommand = new MetaSyncCommand();

/**
 * コマンドDescriptor
 */
export const metaSyncCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(metaSyncCommand, {
    summary: "Sync frontmatter with detected entities",
    usage: "storyteller meta sync [FILE|DIR] [OPTIONS]",
    examples: [
      {
        summary: "Sync single file",
        command: "storyteller meta sync manuscripts/chapter01.md",
      },
      {
        summary: "Preview changes",
        command: "storyteller meta sync manuscripts/chapter01.md --preview",
      },
    ],
  });
