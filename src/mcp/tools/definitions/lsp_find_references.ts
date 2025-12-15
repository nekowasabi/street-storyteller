/**
 * lsp_find_referencesツール定義
 * 原稿内の参照箇所（キャラクター/設定）を位置情報付きで検索するMCPツール
 */

import type {
  McpToolDefinition,
  ToolExecutionContext,
} from "../tool_registry.ts";
import { PositionedDetector } from "../../../lsp/detection/positioned_detector.ts";
import {
  listMarkdownFiles,
  loadDetectableEntities,
  toProjectRelative,
} from "../lsp_shared.ts";

export type ReferenceLocation = {
  readonly kind: "character" | "setting";
  readonly id: string;
  readonly matchedPattern: string;
  readonly confidence: number;
  readonly filePath: string;
  readonly line: number;
  readonly character: number;
  readonly length: number;
};

export const lspFindReferencesTool: McpToolDefinition = {
  name: "lsp_find_references",
  description:
    "指定エンティティ（キャラクター/設定）への参照箇所を位置情報付きで検索します。",
  inputSchema: {
    type: "object",
    properties: {
      projectRoot: {
        type: "string",
        description: "プロジェクトルート（未指定の場合はカレントディレクトリ）",
      },
      path: {
        type: "string",
        description: "検索対象のMarkdownファイルパス",
      },
      dir: {
        type: "string",
        description: "検索対象のディレクトリパス（.mdを対象）",
      },
      recursive: {
        type: "boolean",
        description:
          "--dirと組み合わせて使用。サブディレクトリを再帰的に検索する場合はtrue",
      },
      characterName: {
        type: "string",
        description: "検索するキャラクターID（例: hero）",
      },
      settingName: {
        type: "string",
        description: "検索する設定ID（例: royal_capital）",
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

    const characterId = typeof args.characterName === "string"
      ? args.characterName
      : undefined;
    const settingId = typeof args.settingName === "string"
      ? args.settingName
      : undefined;

    if (!path && !dir) {
      return {
        content: [{
          type: "text" as const,
          text: "Error: Either 'path' or 'dir' parameter is required.",
        }],
        isError: true,
      };
    }
    if (!characterId && !settingId) {
      return {
        content: [{
          type: "text" as const,
          text:
            "Error: Either 'characterName' or 'settingName' parameter is required.",
        }],
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

    const entities = await loadDetectableEntities(projectRoot);
    const detector = new PositionedDetector(entities);

    const locations: ReferenceLocation[] = [];
    for (const absPath of files) {
      const content = await Deno.readTextFile(absPath);
      const matches = detector.detectWithPositions(content);

      for (const match of matches) {
        if (
          characterId && match.kind === "character" && match.id !== characterId
        ) continue;
        if (settingId && match.kind === "setting" && match.id !== settingId) {
          continue;
        }
        if (!characterId && match.kind === "character") continue;
        if (!settingId && match.kind === "setting") continue;

        for (const pos of match.positions) {
          locations.push({
            kind: match.kind,
            id: match.id,
            matchedPattern: match.matchedPattern,
            confidence: match.confidence,
            filePath: toProjectRelative(projectRoot, absPath),
            line: pos.line,
            character: pos.character,
            length: pos.length,
          });
        }
      }
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(locations) }],
      isError: false,
    };
  },
};
