/**
 * causality_analysis プロンプト定義
 * イベント間の因果関係を分析・提案する
 */

import type { McpPromptDefinition } from "@storyteller/mcp/prompts/prompt_registry.ts";

export const causalityAnalysisPrompt: McpPromptDefinition = {
  name: "causality_analysis",
  description: "タイムラインイベント間の因果関係を分析し、改善案を提案します。",
  arguments: [
    {
      name: "events",
      description: "分析対象のイベント一覧（JSON形式）",
      required: true,
    },
    {
      name: "timeline_context",
      description: "タイムラインのコンテキスト情報",
      required: false,
    },
  ],
  getMessages: (args) => {
    const events = args.events ?? "[]";
    const timelineContext = args.timeline_context ?? "";

    const contextLine = timelineContext.trim().length > 0
      ? `\nタイムラインコンテキスト: ${timelineContext}`
      : "";

    return [
      {
        role: "system" as const,
        content:
          `あなたは物語構造の専門家です。イベント間の因果関係を分析し、物語の整合性と説得力を高める提案を行ってください。
以下の観点で分析してください：
- 論理的な因果の連鎖
- 不足している因果関係
- 矛盾や不整合
- より強い因果関係の構築方法`,
      },
      {
        role: "user" as const,
        content: `以下のイベント一覧の因果関係を分析してください。
${contextLine}

イベント一覧:
${events}

分析結果を以下の形式で提供してください：

## 1. 現状の因果関係図
現在定義されているcausedBy/causes関係を可視化

## 2. 因果関係の強度評価
各因果関係が物語として説得力があるか評価（強/中/弱）

## 3. 問題点の指摘
- 孤立したイベント（因果関係がないもの）
- 論理的矛盾
- 不自然な因果の飛躍

## 4. 改善提案
- 追加すべき因果関係
- 修正すべき因果関係
- 新たに必要なイベント（因果を補強するため）

## 5. 因果関係の強化案
物語をより compelling にするための提案`,
      },
    ];
  },
};
