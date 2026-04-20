/**
 * LSP Validate コマンド
 * 原稿ファイルの検証をワンショットで実行する
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
import { loadEntities } from "@storyteller/cli/modules/lsp/start.ts";

/**
 * 検証結果の型
 */
export type ValidationResult = {
  readonly filePath: string;
  readonly diagnostics: readonly DiagnosticOutput[];
};

/**
 * 診断出力の型
 */
export type DiagnosticOutput = {
  readonly line: number;
  readonly character: number;
  readonly endCharacter: number;
  readonly severity: "error" | "warning" | "hint" | "info";
  readonly message: string;
  readonly source: string;
  readonly code?: string;
  readonly confidence?: number;
  readonly entityId?: string;
};

/**
 * 依存性注入用の型
 */
export type LspValidateDependencies = {
  readonly loadEntities?: (projectRoot: string) => Promise<DetectableEntity[]>;
  readonly listMarkdownFiles?: (
    projectRoot: string,
    dirOrFile: { path?: string; dir?: string; recursive?: boolean },
  ) => Promise<string[]>;
};

/**
 * LspValidateCommandクラス
 * `storyteller lsp validate <file>` コマンドを実装
 */
export class LspValidateCommand extends BaseCliCommand {
  override readonly name = "validate" as const;
  override readonly path = ["lsp", "validate"] as const;

  private readonly loadEntitiesFn: (
    projectRoot: string,
  ) => Promise<DetectableEntity[]>;

  private readonly listMarkdownFilesFn: (
    projectRoot: string,
    dirOrFile: { path?: string; dir?: string; recursive?: boolean },
  ) => Promise<string[]>;

  constructor(deps: LspValidateDependencies = {}) {
    super([]);
    this.loadEntitiesFn = deps.loadEntities ?? loadEntities;
    this.listMarkdownFilesFn = deps.listMarkdownFiles ??
      this.defaultListMarkdownFiles.bind(this);
  }

  protected async handle(context: CommandContext) {
    const args = context.args ?? {};

    // ヘルプ表示
    if (args.help === true || args.h === true) {
      context.presenter.showInfo(renderLspValidateHelp());
      return ok(undefined);
    }

    // プロジェクトルートを推測（現在のディレクトリ）
    const projectRoot = typeof args.path === "string" ? args.path : Deno.cwd();

    // --dir モードの判定（--dir と --file 両方指定時は --dir を優先）
    const dirPath = args.dir as string | undefined;
    const filePath = args.file as string | undefined;

    if (dirPath && typeof dirPath === "string" && dirPath.trim() !== "") {
      return this.handleDirMode(context, dirPath, projectRoot, args);
    }

    // 従来の --file 単一ファイルモード
    if (!filePath || typeof filePath !== "string" || filePath.trim() === "") {
      return err({
        code: "invalid_arguments",
        message:
          "A file path is required. Usage: storyteller lsp validate --file <path>",
      });
    }

    // ファイルの存在確認
    try {
      await Deno.stat(filePath);
    } catch {
      return err({
        code: "file_not_found",
        message: `File not found: ${filePath}`,
      });
    }

    // ファイル内容を読み取り
    const content = await Deno.readTextFile(filePath);

    try {
      // エンティティをロード
      const entities = await this.loadEntitiesFn(projectRoot);

      // 診断を生成
      const diagnostics = await this.generateDiagnostics(
        content,
        entities,
        filePath,
        projectRoot,
      );

      const result: ValidationResult = {
        filePath,
        diagnostics,
      };

      // JSON出力モード
      if (args.json === true) {
        context.presenter.showInfo(JSON.stringify(result, null, 2));
      } else {
        // 人間向け出力
        this.displayHumanReadable(context, result);
      }

      return ok(result);
    } catch (error) {
      return err({
        code: "validation_failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * --dir モードの処理
   * ディレクトリ内の .md ファイルを一括検証する
   */
  private async handleDirMode(
    context: CommandContext,
    dirPath: string,
    projectRoot: string,
    args: Record<string, unknown>,
  ) {
    // ディレクトリの存在確認
    try {
      const stat = await Deno.stat(dirPath);
      if (!stat.isDirectory) {
        return err({
          code: "dir_not_found",
          message: `Not a directory: ${dirPath}`,
        });
      }
    } catch {
      return err({
        code: "dir_not_found",
        message: `Directory not found: ${dirPath}`,
      });
    }

    const recursive = args.recursive === true;

    try {
      const files = await this.listMarkdownFilesFn(projectRoot, {
        dir: dirPath,
        recursive,
      });

      if (files.length === 0) {
        context.presenter.showInfo(`No .md files found in: ${dirPath}`);
        return ok({ results: [] });
      }

      // エンティティをロード（全ファイル共通）
      const entities = await this.loadEntitiesFn(projectRoot);

      // 各ファイルを検証
      const results: ValidationResult[] = [];
      for (const file of files) {
        const content = await Deno.readTextFile(file);
        const diagnostics = await this.generateDiagnostics(
          content,
          entities,
          file,
          projectRoot,
        );
        results.push({ filePath: file, diagnostics });
      }

      // JSON出力モード
      if (args.json === true) {
        context.presenter.showInfo(JSON.stringify({ results }, null, 2));
      } else {
        this.displayDirHumanReadable(context, results);
      }

      return ok({ results });
    } catch (error) {
      return err({
        code: "validation_failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * デフォルトの listMarkdownFiles 実装
   * lsp_shared から listMarkdownFiles を遅延インポートする
   */
  private async defaultListMarkdownFiles(
    projectRoot: string,
    dirOrFile: { path?: string; dir?: string; recursive?: boolean },
  ): Promise<string[]> {
    const { listMarkdownFiles: sharedListMarkdownFiles } = await import(
      "@storyteller/mcp/tools/lsp_shared.ts"
    );
    return sharedListMarkdownFiles(projectRoot, dirOrFile);
  }

  /**
   * 診断を生成
   * Why: DiagnosticsGenerator経由だとPositionedMatchのconfidence/idが失われるため、
   * detectWithPositionsを直接呼び出してDiagnosticOutputにマッピングする
   */
  private async generateDiagnostics(
    content: string,
    entities: DetectableEntity[],
    _filePath: string,
    _projectRoot: string,
  ): Promise<DiagnosticOutput[]> {
    const { PositionedDetector } = await import(
      "../../../lsp/detection/positioned_detector.ts"
    );

    const detector = new PositionedDetector(entities);
    const matches = detector.detectWithPositions(content);

    const outputs: DiagnosticOutput[] = [];

    for (const match of matches) {
      // 高信頼度（>= 0.9）は診断不要（DiagnosticsGeneratorと同じ閾値ロジック）
      if (match.confidence >= 0.9) continue;

      const severity = match.confidence < 0.7 ? "warning" : "hint";
      const kindLabel = match.kind === "character" ? "キャラクター" : "設定";
      const confidencePercent = Math.round(match.confidence * 100);
      const message =
        `${kindLabel}「${match.matchedPattern}」への参照（信頼度: ${confidencePercent}%）。` +
        `定義: ${match.filePath}`;

      for (const pos of match.positions) {
        outputs.push({
          line: pos.line + 1, // 1-based for human readability
          character: pos.character + 1,
          endCharacter: pos.character + pos.length + 1,
          severity,
          message,
          source: "storyteller",
          code: `low-confidence-${match.kind}`,
          confidence: match.confidence,
          entityId: match.id,
        });
      }
    }

    return outputs;
  }

  /**
   * 人間向け出力を表示
   */
  private displayHumanReadable(
    context: CommandContext,
    result: ValidationResult,
  ): void {
    context.presenter.showInfo(`Validating: ${result.filePath}`);
    context.presenter.showInfo("");

    if (result.diagnostics.length === 0) {
      context.presenter.showSuccess("No issues found.");
      return;
    }

    context.presenter.showInfo(
      `Found ${result.diagnostics.length} issue(s):`,
    );
    context.presenter.showInfo("");

    for (const d of result.diagnostics) {
      const severity = d.severity.toUpperCase().padEnd(7);
      const location = `${d.line}:${d.character}`;
      context.presenter.showInfo(
        `  [${severity}] ${location}: ${d.message}`,
      );
    }
  }

  /**
   * --dir モードの人間向け出力を表示
   */
  private displayDirHumanReadable(
    context: CommandContext,
    results: readonly ValidationResult[],
  ): void {
    let totalIssues = 0;
    for (const result of results) {
      totalIssues += result.diagnostics.length;
    }

    context.presenter.showInfo(
      `Validated ${results.length} file(s), ${totalIssues} issue(s) found.`,
    );
    context.presenter.showInfo("");

    for (const result of results) {
      if (result.diagnostics.length === 0) {
        context.presenter.showSuccess(`  ${result.filePath}: OK`);
      } else {
        context.presenter.showInfo(
          `  ${result.filePath}: ${result.diagnostics.length} issue(s)`,
        );
        for (const d of result.diagnostics) {
          const severity = d.severity.toUpperCase().padEnd(7);
          const location = `${d.line}:${d.character}`;
          context.presenter.showInfo(
            `    [${severity}] ${location}: ${d.message}`,
          );
        }
      }
    }
  }
}

/**
 * ヘルプを生成
 */
function renderLspValidateHelp(): string {
  const lines: string[] = [];
  lines.push(
    "lsp validate — Validate a manuscript file for entity references.",
  );
  lines.push("");
  lines.push("Usage:");
  lines.push("  storyteller lsp validate --file <path> [options]");
  lines.push(
    "  storyteller lsp validate --dir <directory> [--recursive] [options]",
  );
  lines.push("");
  lines.push("Options:");
  lines.push(
    "  --file <path>  Path to the manuscript file to validate",
  );
  lines.push(
    "  --dir <dir>    Directory to scan for .md files (overrides --file)",
  );
  lines.push(
    "  --recursive    Scan subdirectories recursively (use with --dir)",
  );
  lines.push(
    "  --path <dir>   Project root directory (default: current directory)",
  );
  lines.push("  --json         Output results as JSON");
  lines.push("  --help, -h     Show this help message");
  lines.push("");
  lines.push("Examples:");
  lines.push("  storyteller lsp validate --file manuscripts/chapter01.md");
  lines.push("  storyteller lsp validate --file chapter.md --json");
  lines.push(
    "  storyteller lsp validate --file chapter.md --path /path/to/project",
  );
  lines.push(
    "  storyteller lsp validate --dir manuscripts",
  );
  lines.push(
    "  storyteller lsp validate --dir manuscripts --recursive --json",
  );
  return lines.join("\n");
}

export const lspValidateCommandHandler = new LspValidateCommand();

const LSP_VALIDATE_OPTIONS: readonly CommandOptionDescriptor[] = [
  {
    name: "--file",
    summary: "Path to the manuscript file to validate.",
    type: "string",
  },
  {
    name: "--dir",
    summary: "Directory to scan for .md files (overrides --file).",
    type: "string",
  },
  {
    name: "--recursive",
    summary: "Scan subdirectories recursively (use with --dir).",
    type: "boolean",
  },
  {
    name: "--path",
    summary: "Project root directory (default: current directory).",
    type: "string",
  },
  {
    name: "--json",
    summary: "Output results as JSON.",
    type: "boolean",
  },
  {
    name: "--help",
    aliases: ["-h"],
    summary: "Show help for this command.",
    type: "boolean",
  },
] as const;

export const lspValidateCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(
    lspValidateCommandHandler,
    {
      summary: "Validate a manuscript file for entity references.",
      usage: "storyteller lsp validate --file <path> [options]",
      options: LSP_VALIDATE_OPTIONS,
      examples: [
        {
          summary: "Validate a manuscript file",
          command: "storyteller lsp validate --file manuscripts/chapter01.md",
        },
        {
          summary: "Validate with JSON output",
          command: "storyteller lsp validate --file chapter.md --json",
        },
        {
          summary: "Validate all .md files in a directory",
          command: "storyteller lsp validate --dir manuscripts",
        },
        {
          summary: "Validate recursively with JSON output",
          command:
            "storyteller lsp validate --dir manuscripts --recursive --json",
        },
      ],
    },
  );
