/**
 * LSP Start コマンド
 * LSPサーバーをCLIから起動する
 */
import { err, ok } from "@storyteller/shared/result.ts";
import type {
  CommandContext,
  CommandDescriptor,
  CommandOptionDescriptor,
} from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import { createLegacyCommandDescriptor } from "@storyteller/cli/legacy_adapter.ts";
import type { DetectableEntity } from "@storyteller/lsp/detection/positioned_detector.ts";

export type LspStartStarterInput = {
  readonly projectRoot: string;
  readonly entities: readonly DetectableEntity[];
};

export type LspStartStarter = (input: LspStartStarterInput) => Promise<void>;

export type LspStartReader = {
  read(p: Uint8Array): Promise<number | null>;
};

export type LspStartWriter = {
  write(p: Uint8Array): Promise<number>;
};

export type LspStartDependencies = {
  readonly loadEntities?: (projectRoot: string) => Promise<DetectableEntity[]>;
  readonly starter?: LspStartStarter;
  readonly stdinReader?: LspStartReader;
  readonly stdoutWriter?: LspStartWriter;
};

function createDefaultStarter(
  stdinReader: LspStartReader,
  stdoutWriter: LspStartWriter,
): LspStartStarter {
  return async (input: LspStartStarterInput): Promise<void> => {
    const { LspServer } = await import("../../../lsp/server/server.ts");
    const { LspTransport } = await import("../../../lsp/protocol/transport.ts");

    const transport = new LspTransport(stdinReader, stdoutWriter);

    const server = new LspServer(
      transport,
      input.projectRoot,
      { entities: [...input.entities] },
    );
    await server.start();
  };
}

/**
 * LspStartCommandクラス
 * `storyteller lsp start --stdio` コマンドを実装
 */
export class LspStartCommand extends BaseCliCommand {
  override readonly name = "start" as const;
  override readonly path = ["lsp", "start"] as const;

  private readonly loadEntitiesFn: (
    projectRoot: string,
  ) => Promise<DetectableEntity[]>;
  private readonly starterFn: LspStartStarter;

  constructor(deps: LspStartDependencies = {}) {
    super([]);
    this.loadEntitiesFn = deps.loadEntities ?? loadEntities;
    const stdinReader = deps.stdinReader ?? createStdinReader();
    const stdoutWriter = deps.stdoutWriter ?? createStdoutWriter();
    this.starterFn = deps.starter ??
      createDefaultStarter(stdinReader, stdoutWriter);
  }

  protected async handle(context: CommandContext) {
    const args = context.args ?? {};

    // ヘルプ表示
    if (args.help === true || args.h === true) {
      context.presenter.showInfo(renderLspStartHelp());
      return ok(undefined);
    }

    // --stdio オプションが必須
    if (!args.stdio) {
      return err({
        code: "invalid_arguments",
        message: "LSP server requires --stdio option to specify transport mode",
      });
    }

    // プロジェクトパスの解決
    const projectRoot =
      typeof args.path === "string" && args.path.trim().length > 0
        ? args.path
        : Deno.cwd();

    // dry-runモードの場合はサーバーを起動せずに成功を返す
    if (args["dry-run"] === true) {
      context.presenter.showInfo(
        `[dry-run] LSP server would start with project root: ${projectRoot}`,
      );
      return ok({ projectRoot, mode: "stdio" });
    }

    // LSPサーバーを起動
    try {
      // エンティティをロード
      const entities = await this.loadEntitiesFn(projectRoot);
      await this.starterFn({ projectRoot, entities });

      return ok(undefined);
    } catch (error) {
      return err({
        code: "lsp_start_failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * stdin用のReaderアダプタを作成
 */
function createStdinReader(): { read(p: Uint8Array): Promise<number | null> } {
  return {
    read: async (p: Uint8Array): Promise<number | null> => {
      return await Deno.stdin.read(p);
    },
  };
}

/**
 * stdout用のWriterアダプタを作成
 */
function createStdoutWriter(): { write(p: Uint8Array): Promise<number> } {
  return {
    write: async (p: Uint8Array): Promise<number> => {
      return await Deno.stdout.write(p);
    },
  };
}

/**
 * プロジェクトからエンティティをロード
 */
export async function loadEntities(
  projectRoot: string,
): Promise<DetectableEntity[]> {
  const { join, toFileUrl, relative, resolve } = await import("@std/path");
  const entities: DetectableEntity[] = [];

  // 相対パスを絶対パスに解決
  const absoluteProjectRoot = resolve(projectRoot);

  // キャラクターをロード
  try {
    const charactersDir = join(absoluteProjectRoot, "src/characters");
    for await (const entry of Deno.readDir(charactersDir)) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const absPath = join(charactersDir, entry.name);
      try {
        const mod = await import(toFileUrl(absPath).href);
        for (const [, value] of Object.entries(mod)) {
          const parsed = parseEntity(value);
          if (parsed) {
            const relPath = relative(absoluteProjectRoot, absPath).replaceAll(
              "\\",
              "/",
            );
            entities.push({
              kind: "character",
              id: parsed.id,
              name: parsed.name,
              displayNames: parsed.displayNames,
              aliases: parsed.aliases,
              filePath: relPath,
            });
          }
        }
      } catch {
        // スキップ
      }
    }
  } catch {
    // ディレクトリが存在しない場合はスキップ
  }

  // 設定をロード
  try {
    const settingsDir = join(absoluteProjectRoot, "src/settings");
    for await (const entry of Deno.readDir(settingsDir)) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const absPath = join(settingsDir, entry.name);
      try {
        const mod = await import(toFileUrl(absPath).href);
        for (const [, value] of Object.entries(mod)) {
          const parsed = parseEntity(value);
          if (parsed) {
            const relPath = relative(absoluteProjectRoot, absPath).replaceAll(
              "\\",
              "/",
            );
            entities.push({
              kind: "setting",
              id: parsed.id,
              name: parsed.name,
              displayNames: parsed.displayNames,
              aliases: parsed.aliases,
              filePath: relPath,
            });
          }
        }
      } catch {
        // スキップ
      }
    }
  } catch {
    // ディレクトリが存在しない場合はスキップ
  }

  // 伏線をロード
  try {
    const foreshadowingsDir = join(absoluteProjectRoot, "src/foreshadowings");
    for await (const entry of Deno.readDir(foreshadowingsDir)) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const absPath = join(foreshadowingsDir, entry.name);
      try {
        const mod = await import(toFileUrl(absPath).href);
        for (const [, value] of Object.entries(mod)) {
          const parsed = parseForeshadowingEntity(value);
          if (parsed) {
            const relPath = relative(absoluteProjectRoot, absPath).replaceAll(
              "\\",
              "/",
            );
            entities.push({
              kind: "foreshadowing",
              id: parsed.id,
              name: parsed.name,
              displayNames: parsed.displayNames,
              filePath: relPath,
              status: parsed.status,
            });
          }
        }
      } catch {
        // スキップ
      }
    }
  } catch {
    // ディレクトリが存在しない場合はスキップ
  }

  return entities;
}

/**
 * 伏線エンティティをパース
 */
export function parseForeshadowingEntity(value: unknown): {
  id: string;
  name: string;
  displayNames?: string[];
  status?: "planted" | "partially_resolved" | "resolved" | "abandoned";
} | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = record.id;
  const name = record.name;
  if (typeof id !== "string" || typeof name !== "string") return null;

  const displayNames = Array.isArray(record.displayNames)
    ? record.displayNames.filter((v): v is string => typeof v === "string")
    : undefined;

  const status = typeof record.status === "string" &&
      ["planted", "partially_resolved", "resolved", "abandoned"].includes(
        record.status,
      )
    ? (record.status as
      | "planted"
      | "partially_resolved"
      | "resolved"
      | "abandoned")
    : undefined;

  return { id, name, displayNames, status };
}

/**
 * エンティティをパース
 */
export function parseEntity(value: unknown): {
  id: string;
  name: string;
  displayNames?: string[];
  aliases?: string[];
} | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = record.id;
  const name = record.name;
  if (typeof id !== "string" || typeof name !== "string") return null;

  // 基本のdisplayNames
  const baseDisplayNames = Array.isArray(record.displayNames)
    ? record.displayNames.filter((v): v is string => typeof v === "string")
    : [];

  // フェーズ固有のdisplayNamesを収集
  const phaseDisplayNames: string[] = [];
  if (Array.isArray(record.phases)) {
    for (const phase of record.phases) {
      if (phase && typeof phase === "object") {
        const phaseRecord = phase as Record<string, unknown>;
        if (Array.isArray(phaseRecord.displayNames)) {
          for (const displayName of phaseRecord.displayNames) {
            if (
              typeof displayName === "string" &&
              !phaseDisplayNames.includes(displayName)
            ) {
              phaseDisplayNames.push(displayName);
            }
          }
        }
      }
    }
  }

  // 基本とフェーズのdisplayNamesをマージ
  const allDisplayNames = [...baseDisplayNames, ...phaseDisplayNames];
  const displayNames = allDisplayNames.length > 0 ? allDisplayNames : undefined;

  const aliases = Array.isArray(record.aliases)
    ? record.aliases.filter((v): v is string => typeof v === "string")
    : undefined;

  return { id, name, displayNames, aliases };
}

/**
 * ヘルプを生成
 */
function renderLspStartHelp(): string {
  const lines: string[] = [];
  lines.push("lsp start — Start the LSP server for story validation.");
  lines.push("");
  lines.push("Usage:");
  lines.push("  storyteller lsp start --stdio [options]");
  lines.push("");
  lines.push("Options:");
  lines.push(
    "  --stdio       Start LSP server with stdio transport (required)",
  );
  lines.push(
    "  --path <dir>  Project root directory (default: current directory)",
  );
  lines.push("  --dry-run     Validate options without starting server");
  lines.push("  --help, -h    Show this help message");
  lines.push("");
  lines.push("Examples:");
  lines.push("  storyteller lsp start --stdio");
  lines.push("  storyteller lsp start --stdio --path /path/to/project");
  return lines.join("\n");
}

export const lspStartCommandHandler = new LspStartCommand();

const LSP_START_OPTIONS: readonly CommandOptionDescriptor[] = [
  {
    name: "--stdio",
    summary: "Start LSP server with stdio transport (required).",
    type: "boolean",
  },
  {
    name: "--path",
    summary: "Project root directory (default: current directory).",
    type: "string",
  },
  {
    name: "--dry-run",
    summary: "Validate options without starting server.",
    type: "boolean",
  },
  {
    name: "--help",
    aliases: ["-h"],
    summary: "Show help for this command.",
    type: "boolean",
  },
] as const;

export const lspStartCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(
    lspStartCommandHandler,
    {
      summary: "Start the LSP server for story validation.",
      usage: "storyteller lsp start --stdio [options]",
      options: LSP_START_OPTIONS,
      examples: [
        {
          summary: "Start LSP server with stdio",
          command: "storyteller lsp start --stdio",
        },
        {
          summary: "Start LSP server with custom project path",
          command: "storyteller lsp start --stdio --path /path/to/project",
        },
      ],
    },
  );
