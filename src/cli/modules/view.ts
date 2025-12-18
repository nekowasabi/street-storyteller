/**
 * View コマンド
 * プロジェクトの物語要素をHTML形式で可視化する
 */
import { err, ok } from "../../shared/result.ts";
import type {
  CommandContext,
  CommandDescriptor,
  CommandOptionDescriptor,
} from "../types.ts";
import { BaseCliCommand } from "../base_command.ts";
import { createLegacyCommandDescriptor } from "../legacy_adapter.ts";
import { ProjectAnalyzer } from "../../application/view/project_analyzer.ts";
import { HtmlGenerator } from "../../application/view/html_generator.ts";
import { LocalViewServer } from "../../application/view/local_server.ts";
import { FileWatcher } from "../../application/view/file_watcher.ts";
import { ViewForeshadowingCommand } from "./view/foreshadowing.ts";
import { viewSettingCommandDescriptor } from "./view/setting.ts";

/**
 * ViewCommandクラス
 * `storyteller view` コマンドを実装
 */
export class ViewCommand extends BaseCliCommand {
  override readonly name = "view" as const;
  override readonly path = ["view"] as const;

  constructor(
    private readonly analyzer: ProjectAnalyzer = new ProjectAnalyzer(),
    private readonly generator: HtmlGenerator = new HtmlGenerator(),
  ) {
    super([]);
  }

  protected async handle(context: CommandContext) {
    const args = context.args ?? {};

    // ヘルプ表示
    if (args.help === true || args.h === true) {
      context.presenter.showInfo(renderViewHelp());
      return ok(undefined);
    }

    // プロジェクトパスの解決
    const projectRoot =
      typeof args.path === "string" && args.path.trim().length > 0
        ? args.path
        : Deno.cwd();

    // --serve モードの場合
    if (args.serve === true) {
      return await this.handleServeMode(context, args, projectRoot);
    }

    // 出力先の解決
    const outputPath =
      typeof args.output === "string" && args.output.trim().length > 0
        ? args.output
        : `${projectRoot}/index.html`;

    // プロジェクトを解析
    const analysisResult = await this.analyzer.analyzeProject(projectRoot);
    if (!analysisResult.ok) {
      return err({
        code: "analysis_failed",
        message: analysisResult.error.message,
      });
    }

    // HTMLを生成
    const html = this.generator.generate(analysisResult.value);

    // ファイルに書き込み
    await Deno.writeTextFile(outputPath, html);

    context.presenter.showSuccess?.(`HTML generated: ${outputPath}`);
    return ok({ outputPath, projectRoot });
  }

  /**
   * サーバーモードを処理
   */
  private async handleServeMode(
    context: CommandContext,
    args: Record<string, unknown>,
    projectRoot: string,
  ) {
    const port = typeof args.port === "number" ? args.port : 8080;
    const watchEnabled = args.watch === true;
    const timeout = typeof args.timeout === "number" ? args.timeout : 0;
    const dryRun = args["dry-run"] === true;

    // dry-runモードの場合はサーバーを起動せずに情報を表示
    if (dryRun) {
      const info = [
        `[dry-run] Server mode configuration:`,
        `  Project: ${projectRoot}`,
        `  Port: ${port} (serve on http://localhost:${port})`,
        `  Watch: ${
          watchEnabled ? "enabled (watch for file changes)" : "disabled"
        }`,
      ];
      context.presenter.showInfo(info.join("\n"));
      return ok({ mode: "serve", port, watch: watchEnabled, projectRoot });
    }

    // プロジェクトを解析してHTMLを生成
    const generateHtml = async (): Promise<string> => {
      const analysisResult = await this.analyzer.analyzeProject(projectRoot);
      if (!analysisResult.ok) {
        return `<html><body><h1>Error</h1><p>${analysisResult.error.message}</p></body></html>`;
      }
      return this.generator.generate(analysisResult.value);
    };

    // サーバーを作成
    const server = new LocalViewServer();
    const html = await generateHtml();
    server.setContent(this.injectLiveReloadScript(html, port));

    // ファイル監視を設定
    let watcher: FileWatcher | null = null;
    if (watchEnabled) {
      watcher = new FileWatcher(projectRoot, {
        onChange: async () => {
          const newHtml = await generateHtml();
          server.setContent(this.injectLiveReloadScript(newHtml, port));
          server.notify("reload");
          context.presenter.showInfo("Content updated, reloading...");
        },
        debounceMs: 300,
      });
      await watcher.start();
    }

    // サーバーを起動
    await server.start(port);
    context.presenter.showInfo(`Server running at http://localhost:${port}`);
    if (watchEnabled) {
      context.presenter.showInfo("Watching for file changes...");
    }

    // タイムアウトが設定されている場合は指定時間後に停止
    if (timeout > 0) {
      await new Promise((resolve) => setTimeout(resolve, timeout));
      watcher?.stop();
      await server.stop();
      return ok({ mode: "serve", port, watch: watchEnabled, projectRoot });
    }

    // シグナルを待機（Ctrl+Cで停止）
    const abortController = new AbortController();
    Deno.addSignalListener("SIGINT", () => {
      context.presenter.showInfo("\nShutting down...");
      watcher?.stop();
      server.stop();
      abortController.abort();
    });

    // 無限に待機
    await new Promise<void>((resolve) => {
      abortController.signal.addEventListener("abort", () => resolve());
    });

    return ok({ mode: "serve", port, watch: watchEnabled, projectRoot });
  }

  /**
   * HTMLにライブリロードスクリプトを注入
   */
  private injectLiveReloadScript(html: string, port: number): string {
    const script = `
<script>
(function() {
  var ws = new WebSocket('ws://localhost:${port}/ws');
  ws.onmessage = function(event) {
    if (event.data === 'reload') {
      location.reload();
    }
  };
  ws.onclose = function() {
    setTimeout(function() { location.reload(); }, 1000);
  };
})();
</script>
`;
    // </body>の前にスクリプトを挿入
    return html.replace("</body>", `${script}</body>`);
  }
}

/**
 * ヘルプを生成
 */
function renderViewHelp(): string {
  const lines: string[] = [];
  lines.push("view - Generate HTML visualization of the story project.");
  lines.push("");
  lines.push("Usage:");
  lines.push("  storyteller view [options]");
  lines.push("");
  lines.push("Options:");
  lines.push(
    "  --path <dir>     Project root directory (default: current directory)",
  );
  lines.push("  --output <file>  Output HTML file (default: index.html)");
  lines.push("  --serve          Start local server instead of writing file");
  lines.push(
    "  --port <number>  Server port (default: 8080, requires --serve)",
  );
  lines.push(
    "  --watch          Watch for file changes and live reload (requires --serve)",
  );
  lines.push("  --help, -h       Show this help message");
  lines.push("");
  lines.push("Examples:");
  lines.push("  storyteller view");
  lines.push("  storyteller view --path /path/to/project");
  lines.push("  storyteller view --output my-story.html");
  lines.push("  storyteller view --serve");
  lines.push("  storyteller view --serve --port 3000 --watch");
  return lines.join("\n");
}

export const viewCommandHandler = new ViewCommand();

/**
 * view foreshadowing サブコマンドの Descriptor
 */
const viewForeshadowingHandler = new ViewForeshadowingCommand();
export const viewForeshadowingCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(viewForeshadowingHandler, {
    summary: "Display foreshadowing information.",
    usage: "storyteller view foreshadowing [--list | --id <id>] [options]",
    path: ["view", "foreshadowing"],
    options: [
      {
        name: "--list",
        summary: "List all foreshadowings",
        type: "boolean",
      },
      {
        name: "--id",
        summary: "Foreshadowing ID to display",
        type: "string",
      },
      {
        name: "--status",
        summary:
          "Filter by status: planted, partially_resolved, resolved, abandoned",
        type: "string",
      },
      {
        name: "--json",
        summary: "Output in JSON format",
        type: "boolean",
      },
      {
        name: "--path",
        summary: "Project root directory (default: current directory)",
        type: "string",
      },
    ],
    examples: [
      {
        summary: "List all foreshadowings",
        command: "storyteller view foreshadowing --list",
      },
      {
        summary: "Show specific foreshadowing",
        command: 'storyteller view foreshadowing --id "ancient_sword"',
      },
      {
        summary: "List planted foreshadowings in JSON",
        command:
          "storyteller view foreshadowing --list --status planted --json",
      },
    ],
  });

const VIEW_OPTIONS: readonly CommandOptionDescriptor[] = [
  {
    name: "--path",
    summary: "Project root directory (default: current directory).",
    type: "string",
  },
  {
    name: "--output",
    summary: "Output HTML file (default: index.html).",
    type: "string",
  },
  {
    name: "--serve",
    summary: "Start local server instead of writing file.",
    type: "boolean",
  },
  {
    name: "--port",
    summary: "Server port (default: 8080, requires --serve).",
    type: "number",
  },
  {
    name: "--watch",
    summary: "Watch for file changes and live reload (requires --serve).",
    type: "boolean",
  },
  {
    name: "--help",
    aliases: ["-h"],
    summary: "Show help for this command.",
    type: "boolean",
  },
] as const;

export const viewCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(
    viewCommandHandler,
    {
      summary: "Generate HTML visualization of the story project.",
      usage: "storyteller view [options]",
      options: VIEW_OPTIONS,
      children: [
        viewForeshadowingCommandDescriptor,
        viewSettingCommandDescriptor,
      ],
      examples: [
        {
          summary: "Generate HTML in current directory",
          command: "storyteller view",
        },
        {
          summary: "Generate HTML for specific project",
          command: "storyteller view --path /path/to/project",
        },
        {
          summary: "Specify output file",
          command: "storyteller view --output my-story.html",
        },
        {
          summary: "List all foreshadowings",
          command: "storyteller view foreshadowing --list",
        },
        {
          summary: "List all settings",
          command: "storyteller view setting --list",
        },
      ],
    },
  );
