/**
 * timeline_consistency_check プロンプト定義
 * タイムラインの整合性をチェックする
 */

import type { McpPromptDefinition } from "../prompt_registry.ts";

export const timelineConsistencyCheckPrompt: McpPromptDefinition = {
  name: "timeline_consistency_check",
  description: "タイムラインの整合性（時系列順序、因果関係、キャラクター配置など）をチェックします。",
  arguments: [
    {
      name: "timeline",
      description: "チェック対象のタイムライン（JSON形式）",
      required: true,
    },
    {
      name: "characters",
      description: "プロジェクトのキャラクター一覧（JSON形式、任意）",
      required: false,
    },
    {
      name: "settings",
      description: "プロジェクトの設定一覧（JSON形式、任意）",
      required: false,
    },
    {
      name: "other_timelines",
      description: "関連する他のタイムライン（JSON形式、任意）",
      required: false,
    },
  ],
  getMessages: (args) => {
    const timeline = args.timeline ?? "{}";
    const characters = args.characters ?? "";
    const settings = args.settings ?? "";
    const otherTimelines = args.other_timelines ?? "";

    const charactersLine = characters.trim().length > 0
      ? `\nキャラクター一覧:\n${characters}`
      : "";
    const settingsLine = settings.trim().length > 0
      ? `\n設定一覧:\n${settings}`
      : "";
    const otherTimelinesLine = otherTimelines.trim().length > 0
      ? `\n関連タイムライン:\n${otherTimelines}`
      : "";

    return [
      {
        role: "system" as const,
        content: `あなたは物語の整合性チェックの専門家です。タイムラインを詳細に分析し、問題点と改善案を提示してください。
チェック観点：
- 時系列の論理性
- 因果関係の整合性
- キャラクターの配置と行動の一貫性
- 設定の使用の適切性
- 物語としての自然さ`,
      },
      {
        role: "user" as const,
        content: `以下のタイムラインの整合性をチェックしてください。

タイムライン:
${timeline}
${charactersLine}
${settingsLine}
${otherTimelinesLine}

以下の形式でレポートを作成してください：

## 整合性チェック結果

### 1. 時系列順序
- [ ] イベントの順序は論理的か
- [ ] 各イベントのタイミングは適切か
- 問題点があれば詳細を記載

### 2. 因果関係
- [ ] causedBy/causes が正しく設定されているか
- [ ] 因果の方向と時系列が一致しているか
- 孤立したイベントはないか

### 3. キャラクター配置
- [ ] 各イベントに適切なキャラクターが配置されているか
- [ ] キャラクターの行動に矛盾はないか
- [ ] 同時に複数の場所にいるような矛盾はないか

### 4. 設定の使用
- [ ] イベントの舞台設定は適切か
- [ ] 設定間の移動は自然か

### 5. 物語としての評価
- 構成のバランス
- テンポの良さ
- 伏線と回収

### 6. 改善提案
優先度順に改善すべき点を列挙`,
      },
    ];
  },
};
