/**
 * lsp_validateツール定義
 * 原稿（Markdown）の整合性診断を実行するMCPツール
 */

import type {
  McpToolDefinition,
  ToolExecutionContext,
} from "../tool_registry.ts";
import { toFileUrl } from "@std/path";
import { PositionedDetector } from "../../../lsp/detection/positioned_detector.ts";
import { DiagnosticsGenerator } from "../../../lsp/diagnostics/diagnostics_generator.ts";
import {
  listMarkdownFiles,
  loadDetectableEntities,
  resolvePath,
  toProjectRelative,
} from "../lsp_shared.ts";

export const lspValidateTool: McpToolDefinition = {
  name: "lsp_validate",
  description:
    "原稿ファイル（Markdown）の整合性診断（LSP診断生成）を実行します。",
  inputSchema: {
    type: "object",
    properties: {
      projectRoot: {
        type: "string",
        description: "プロジェクトルート（未指定の場合はカレントディレクトリ）",
      },
      path: {
        type: "string",
        description: "診断するMarkdownファイルパス",
      },
      dir: {
        type: "string",
        description: "診断するディレクトリパス（.mdを対象）",
      },
      recursive: {
        type: "boolean",
        description:
          "--dirと組み合わせて使用。サブディレクトリを再帰的に検索する場合はtrue",
      },
    },
  },
  execute: async (
    args: Record<string, unknown>,
    context?: ToolExecutionContext,
  ) => {
    // コンテキストからのprojectRootを優先、なければargsから、それもなければDeno.cwd()
    const projectRoot = context?.projectRoot ??
      (typeof args.projectRoot === "string" &&
          args.projectRoot.trim().length > 0
        ? args.projectRoot
        : Deno.cwd());

    const path = typeof args.path === "string" ? args.path : undefined;
    const dir = typeof args.dir === "string" ? args.dir : undefined;
    const recursive = args.recursive === true;

    if (!path && !dir) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: Either 'path' or 'dir' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    let files: string[];
    try {
      files = await listMarkdownFiles(projectRoot, { path, dir, recursive });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }

    if (files.length === 0) {
      return {
        content: [
          { type: "text" as const, text: "Error: No markdown files found." },
        ],
        isError: true,
      };
    }

    // ファイル存在チェック（単体pathは明示的に）
    if (path) {
      try {
        await Deno.stat(resolvePath(projectRoot, path));
      } catch {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: File not found: ${path}`,
            },
          ],
          isError: true,
        };
      }
    }

    const entities = await loadDetectableEntities(projectRoot);
    const detector = new PositionedDetector(entities);
    const generator = new DiagnosticsGenerator(detector);

    // 単一ファイルは diagnostics[] を返す
    if (files.length === 1 && path) {
      const absPath = files[0];
      const content = await Deno.readTextFile(absPath);
      const uri = toFileUrl(absPath).href;
      const diagnostics = await generator.generate(uri, content, projectRoot);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(diagnostics) }],
        isError: false,
      };
    }

    // 複数ファイルは per-file で返す
    const results: Array<{ path: string; diagnostics: unknown[] }> = [];
    for (const absPath of files) {
      const content = await Deno.readTextFile(absPath);
      const uri = toFileUrl(absPath).href;
      const diagnostics = await generator.generate(uri, content, projectRoot);
      results.push({
        path: toProjectRelative(projectRoot, absPath),
        diagnostics,
      });
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(results) }],
      isError: false,
    };
  },
};
