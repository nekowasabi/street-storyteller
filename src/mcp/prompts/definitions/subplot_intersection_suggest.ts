/**
 * subplot_intersection_suggest プロンプト定義
 * 2つのサブプロットの交差点を提案する
 */

import type { McpPromptDefinition } from "@storyteller/mcp/prompts/prompt_registry.ts";

export const subplotIntersectionSuggestPrompt: McpPromptDefinition = {
  name: "subplot_intersection_suggest",
  description:
    "2つのサブプロットの交差点（収束ポイント）を提案します。サブプロット同士が自然に絡み合う場面を設計します。",
  arguments: [
    {
      name: "subplotId1",
      description: "サブプロット1のID",
      required: true,
    },
    {
      name: "subplotId2",
      description: "サブプロット2のID",
      required: true,
    },
  ],
  getMessages: (args) => {
    const subplotId1 = args.subplotId1 ?? "";
    const subplotId2 = args.subplotId2 ?? "";

    return [
      {
        role: "user" as const,
        content:
          `以下の2つのサブプロットが交差・収束するポイントを3〜4箇所提案してください。

サブプロット1: ${subplotId1}
サブプロット2: ${subplotId2}

各交差点について以下の情報を提供してください：

1. **交差点の名前と概要**
   - どのような場面で2つのサブプロットが交わるか

2. **交差のタイプ**
   - 共有キャラクターによる交差（同一キャラクターが両方のサブプロットに関与）
   - 共有設定による交差（同一の場所や状況で展開）
   - 因果関係による交差（一方の出来事が他方に影響）
   - テーマ的共鳴（両方が同じテーマを異なる角度から描く）

3. **物語への効果**
   - この交差点が読者にもたらす体験
   - メインプロットとの関係性

4. **実装の提案**
   - 該当するチャプターまたはシーンの目安
   - 必要なキャラクターと設定
   - 伏線として活用できる要素

交差点は物語全体のペースを考慮し、序盤・中盤・終盤にバランスよく配置されることを目指してください。`,
      },
    ];
  },
};
