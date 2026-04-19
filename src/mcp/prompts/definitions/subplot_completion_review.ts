/**
 * subplot_completion_review プロンプト定義
 * サブプロットの構造的完全性をレビューする
 */

import type { McpPromptDefinition } from "@storyteller/mcp/prompts/prompt_registry.ts";

export const subplotCompletionReviewPrompt: McpPromptDefinition = {
  name: "subplot_completion_review",
  description:
    "サブプロットの構造的完全性を分析します。セットアップ・クライマックス・解決の有無や、メインプロットとの整合性を評価します。",
  arguments: [
    {
      name: "subplotId",
      description: "レビュー対象のサブプロットID",
      required: true,
    },
  ],
  getMessages: (args) => {
    const subplotId = args.subplotId ?? "";

    return [
      {
        role: "user" as const,
        content:
          `以下のサブプロットの構造的完全性を分析し、改善点があれば提案してください。

サブプロットID: ${subplotId}

以下の観点で分析してください：

## 1. 構造要素の確認

各要素の有無と品質を評価してください：

| 要素 | 状態 | 評価 |
|------|------|------|
| セットアップ（導入） | あり/なし | 十分/不十分 |
| 発展（展開） | あり/なし | 十分/不十分 |
| クライマックス（転換点） | あり/なし | 十分/不十分 |
| 解決（収束） | あり/なし | 十分/不十分 |

## 2. メインプロットとの整合性

- メインプロットのテーマを補強できているか
- メインプロットの進行を妨げていないか
- サブプロット単独でも意味のある物語になっているか

## 3. キャラクターの一貫性

- 関与キャラクターの行動はキャラクター設定と整合しているか
- サブプロットを通じたキャラクターの変化は自然か

## 4. ペースとタイミング

- サブプロットの開始タイミングは適切か
- メインプロットとの並行進行のバランスは取れているか
- 解決のタイミングは適切か

## 5. 改善提案

不足している要素や改善すべき点について、具体的な提案を行ってください。
各提案には優先度（高/中/低）をつけてください。`,
      },
    ];
  },
};
