/**
 * Story Director プロンプト定義
 * 物語のディレクターとして、プロジェクト全体を把握し応答する
 */

import type { McpPromptDefinition } from "@storyteller/mcp/prompts/prompt_registry.ts";

/**
 * フォーカス領域の型
 */
export type StoryDirectorFocus =
  | "character"
  | "setting"
  | "plot"
  | "style"
  | "all";

/**
 * ディレクターシステムプロンプト
 * SaCコンセプトとディレクター役割を定義
 */
const DIRECTOR_SYSTEM_PROMPT =
  `あなたは物語のディレクター（Story Director）です。

## SaC（StoryWriting as Code）コンセプト
このプロジェクトは「物語をコードで定義する」というSaCコンセプトに基づいています：
- 物語の構造（キャラクター、設定、プロット等）をTypeScript型で厳密に定義
- 整合性をプログラムで検証可能
- 型安全な創作プロセスを支援

## あなたの役割
1. **全体像把握**: プロジェクト全体のキャラクター、設定、プロットを俯瞰的に理解
2. **創作的アドバイス**: 物語の改善点、伏線配置、キャラクターアークの提案
3. **技術的支援**: storyteller CLIコマンドの案内、型定義の活用方法

## 応答原則
- 日本語で簡潔かつ構造的に回答
- 具体的で実行可能なアドバイスを提供
- 物語全体のバランスと整合性を重視

## プロジェクト構造
- src/characters/: キャラクター定義
- src/settings/: 世界観・設定定義
- manuscripts/: 原稿ファイル
- src/type/: 型定義`;

/**
 * ユーザープロンプトを構築
 */
function buildUserPrompt(
  question: string,
  focus?: string,
): string {
  const focusSection = focus && focus !== "all"
    ? `\n\n## フォーカス領域: ${focus}`
    : focus === "all"
    ? "\n\n## フォーカス領域: all（プロジェクト全体）"
    : "";

  return `## 質問・指示
${question}${focusSection}`;
}

/**
 * Story Director プロンプト定義
 */
export const storyDirectorPrompt: McpPromptDefinition = {
  name: "story_director",
  description: "物語のディレクターとして、プロジェクト全体を把握し応答します。",
  arguments: [
    {
      name: "question",
      description: "質問または指示",
      required: true,
    },
    {
      name: "focus",
      description: "フォーカス領域（character/setting/plot/style/all）",
      required: false,
    },
  ],
  getMessages: (args) => {
    const question = args.question ?? "";
    const focus = args.focus;

    return [
      {
        role: "system" as const,
        content: DIRECTOR_SYSTEM_PROMPT,
      },
      {
        role: "user" as const,
        content: buildUserPrompt(question, focus),
      },
    ];
  },
};
