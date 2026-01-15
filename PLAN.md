---
mission_id: subplot-feature-implementation
title: "Subplot（サブプロット）機能の実装"
status: planning
progress: 0
phase: planning
tdd_mode: true
blockers: 0
created_at: "2026-01-15"
updated_at: "2026-01-15"
---

# Commander's Intent

## Purpose

- street-storytellerにSubplot（サブプロット）機能を追加し、メインプロットとサブプロットを明確に区別して物語の構造を表現できるようにする
- 複数のストーリーラインを管理し、それらの交差や影響関係を可視化できるようにする

## End State

- Subplot型、PlotBeat型、PlotIntersection型が定義されている
- CLI経由でsubplot/beat/intersectionの作成・表示ができる
- MCP経由でsubplot関連のツール・リソース・プロンプトが利用できる
- LSPでsubplot/beatのホバー・セマンティックトークンが動作する
- HTML可視化でsubplot間の関係がグラフ表示される
- cinderellaサンプルにsubplotデータが追加されている
- ドキュメント（docs/subplot.md）が整備されている

## Key Tasks

- 型定義の作成（Process 1-10）
- CLI基本機能の実装（Process 51-80）
- FrontMatter連携・manuscript_binding拡張（Process 101-120）
- MCP統合（Process 151-180）
- LSP拡張（Process 201-230）
- 可視化・サンプル・ドキュメント（Process 251-300）

## Constraints

- 既存の型定義パターン（Timeline, Foreshadowing）に従う
- `preconditionBeatIds` のみ使用し、逆方向は保持しない（循環参照防止）
- Character.roleとの競合を避ける（スコープの違いを明確にする）

## Restraints

- TDD（テスト駆動開発）を厳守する
- コードスタイル・規約（code_style memory）に従う
- 既存のCLI/MCP/LSPパターンを踏襲する

---

# Context

## 概要

- Subplot機能により、メインプロットとサブプロットを明確に区別して管理できる
- 各プロットはビート（起承転結のポイント）で構成され、ビート間の因果関係を追跡できる
- 異なるプロット間の交差点（Intersection）を定義し、影響関係を可視化できる

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red -> Green -> Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテスト、フォーマッタ、Linterが通過していること
  - プロセス完了後、チェックボックスを更新すること
- **各Process開始時のブリーフィング実行**
  - 各Processの「Briefing」セクションは自動生成される

## 開発のゴール

- cinderellaサンプルプロジェクトで以下が動作すること：
  - `storyteller element subplot --name "王子の花嫁探し" --type subplot --focus-character prince:primary`
  - `storyteller view subplot --list`
  - `storyteller view subplot --id prince_story --format mermaid`
  - LSPでビート名のホバーが動作
  - HTML可視化でsubplotグラフが表示

## 要件定義書

- `/home/takets/repos/street-storyteller/docs/specs/subplot-requirements.md`

## マルチLLM合議結果（Arbiter判断）

- 因果関係: `preconditionBeatIds`（一方向のみ）
- キャラクター参照: `focusCharacterIds: string[]`（複数対応）
- 影響度: `influenceLevel: 'major' | 'medium' | 'minor' | 'thematic'`（定性的）
- ビートタイプ: `beatType: string`（柔軟なタグ付け）

---

# References

| @ref                                           | @target                                       | @test                                        |
| ---------------------------------------------- | --------------------------------------------- | -------------------------------------------- |
| `docs/specs/subplot-requirements.md`           | `src/type/v2/subplot.ts`                      | `tests/type/subplot_test.ts`                 |
| `src/type/v2/timeline.ts`                      | `src/cli/modules/element/subplot.ts`          | `tests/cli/element/subplot_test.ts`          |
| `src/cli/modules/element/timeline.ts`          | `src/cli/modules/element/beat.ts`             | `tests/cli/element/beat_test.ts`             |
| `src/mcp/tools/definitions/timeline_create.ts` | `src/mcp/tools/definitions/subplot_create.ts` | `tests/mcp/tools/subplot_create_test.ts`     |
| `src/lsp/providers/hover_provider.ts`          | `src/lsp/providers/hover_provider.ts` (修正)  | `tests/lsp/providers/hover_provider_test.ts` |

---

# Progress Map

| Process         | Status       | Progress | Phase        | Notes                                           |
| --------------- | ------------ | -------- | ------------ | ----------------------------------------------- |
| Process 1-10    | planning     | 0%       | Red          | 型定義（Subplot, PlotBeat, PlotIntersection）   |
| Process 51-80   | planning     | 0%       | Red          | CLI基本機能（element/view）                     |
| Process 101-120 | planning     | 0%       | Red          | FrontMatter連携・manuscript_binding拡張         |
| Process 151-180 | planning     | 0%       | Red          | MCP統合（ツール・リソース・プロンプト）         |
| Process 201-230 | planning     | 0%       | Red          | LSP拡張（ホバー・診断・セマンティックトークン） |
| Process 251-300 | planning     | 0%       | Red          | 可視化・サンプル・ドキュメント                  |
|                 |              |          |              |                                                 |
| **Overall**     | **planning** | **0%**   | **planning** | **Blockers: 0**                                 |

---

# Processes

## Process 1: Subplot基本型の定義

<!--@process-briefing
category: implementation
tags: [type-definition, subplot]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
Timeline型、Foreshadowing型のパターンを参照 **Watch Points**:
TypeScriptの型エイリアス、JSDocコメント

---

### 対象ファイル

- **新規作成**: `src/type/v2/subplot.ts`
- **参照**: `src/type/v2/timeline.ts`, `src/type/v2/foreshadowing.ts`

### Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング
- [ ] テストファイル作成: `tests/type/subplot_test.ts`
  ```typescript
  import { assertEquals, assertExists } from "@std/assert";
  import type {
    FocusCharacter,
    InfluenceDirection,
    InfluenceLevel,
    PlotBeat,
    PlotImportance,
    PlotIntersection,
    PlotType,
    Subplot,
    SubplotDetails,
    SubplotDetectionHints,
  } from "@storyteller/types/v2/subplot.ts";

  Deno.test("PlotType should have valid values", () => {
    const plotType: PlotType = "main";
    assertEquals(plotType, "main");
    // "main" | "subplot" | "parallel" | "background"
  });

  Deno.test("Subplot should have required fields", () => {
    const subplot: Subplot = {
      id: "prince_story",
      name: "王子の花嫁探し",
      type: "subplot",
      summary: "王子が運命の人を探す物語",
      beats: [],
      focusCharacters: [{ characterId: "prince", weight: "primary" }],
    };
    assertExists(subplot.id);
    assertExists(subplot.name);
    assertExists(subplot.type);
    assertExists(subplot.summary);
    assertExists(subplot.beats);
    assertExists(subplot.focusCharacters);
  });

  Deno.test("PlotBeat should have required fields", () => {
    const beat: PlotBeat = {
      id: "ball_announcement",
      title: "舞踏会の告知",
      summary: "王子の舞踏会が発表される",
      chapter: "chapter_01",
      characters: ["prince", "king"],
      settings: ["castle"],
    };
    assertExists(beat.id);
    assertExists(beat.title);
  });

  Deno.test("PlotIntersection should define cross-plot relationships", () => {
    const intersection: PlotIntersection = {
      sourcePlotId: "main_story",
      sourceBeatId: "cinderella_at_ball",
      targetPlotId: "prince_story",
      targetBeatId: "meets_mysterious_lady",
      description: "シンデレラと王子が出会う",
      influenceDirection: "mutual",
      influenceLevel: "high",
    };
    assertExists(intersection.sourcePlotId);
    assertExists(intersection.targetPlotId);
  });
  ```
- [ ] テスト実行: `deno test tests/type/subplot_test.ts` （失敗確認）

### Green Phase: 最小実装と成功確認

- [ ] ブリーフィング
- [ ] `src/type/v2/subplot.ts` を作成（下記コード参照）
- [ ] テスト実行: `deno test tests/type/subplot_test.ts` （成功確認）

### 実装コード: `src/type/v2/subplot.ts`

```typescript
/**
 * Subplot（サブプロット）型定義
 *
 * メインプロットとサブプロットを管理し、物語の構造を表現する。
 *
 * @module
 */

// ========================================
// 基本型
// ========================================

/**
 * プロットタイプ
 * - main: メインプロット（物語の中心）
 * - subplot: サブプロット（メインを補完）
 * - parallel: 並行プロット（メインと独立して進行）
 * - background: 背景プロット（世界観を補強）
 */
export type PlotType = "main" | "subplot" | "parallel" | "background";

/**
 * プロットの重要度
 */
export type PlotImportance = "major" | "minor" | "supporting";

/**
 * 影響レベル
 */
export type InfluenceLevel = "low" | "medium" | "high";

/**
 * 影響方向
 * - forward: 元プロットから対象プロットへ影響
 * - backward: 対象プロットから元プロットへ影響
 * - mutual: 双方向の影響
 */
export type InfluenceDirection = "forward" | "backward" | "mutual";

// ========================================
// フォーカスキャラクター
// ========================================

/**
 * フォーカスキャラクター
 * プロット内でのキャラクターの役割を定義
 */
export type FocusCharacter = {
  /** キャラクターID */
  characterId: string;
  /** 重み（primary: 主役、secondary: 副次的） */
  weight: "primary" | "secondary";
};

// ========================================
// プロットビート
// ========================================

/**
 * プロットビート（起承転結の各ポイント）
 */
export type PlotBeat = {
  // 必須フィールド
  /** 一意なID */
  id: string;
  /** ビートタイトル */
  title: string;
  /** 短い概要 */
  summary: string;
  /** 関連チャプター */
  chapter: string;

  // 関連エンティティ
  /** 関連キャラクターIDリスト */
  characters: string[];
  /** 関連設定IDリスト */
  settings: string[];

  // オプション: 構造情報
  /** 構造位置（"setup", "rising", "climax", "falling", "resolution" など） */
  structurePosition?: string;
  /** カスタムステータス */
  customStatus?: string;

  // オプション: 因果関係（片方向のみ）
  /** このビートの原因となるビートID（前提条件） */
  preconditionBeatIds?: string[];

  // オプション: TimelineEventとのリンク
  /** 関連するTimelineEventのID */
  timelineEventId?: string;

  // オプション: 表示名
  /** 表示名のバリエーション */
  displayNames?: string[];
};

// ========================================
// プロット交差
// ========================================

/**
 * プロット交差
 * 異なるプロット間でビート同士がどのように影響し合うかを定義
 */
export type PlotIntersection = {
  // 必須: 交差元
  /** 交差元プロットID */
  sourcePlotId: string;
  /** 交差元ビートID */
  sourceBeatId: string;

  // 必須: 交差先
  /** 交差先プロットID */
  targetPlotId: string;
  /** 交差先ビートID */
  targetBeatId: string;

  // 交差の性質
  /** 交差の説明 */
  description: string;
  /** 影響方向 */
  influenceDirection: InfluenceDirection;
  /** 影響レベル */
  influenceLevel: InfluenceLevel;

  // オプション: 関連チャプター
  /** 交差が発生するチャプター */
  chapter?: string;
};

// ========================================
// 構造テンプレート
// ========================================

/**
 * 構造テンプレート参照
 */
export type StructureTemplate = {
  /** テンプレートID */
  id: string;
  /** テンプレート名 */
  name: string;
  /** 構造位置リスト */
  positions: string[];
};

// ========================================
// サブプロット詳細情報
// ========================================

/**
 * サブプロット詳細情報
 */
export type SubplotDetails = {
  /** 詳細説明 */
  description?: string | { file: string };
  /** このプロットの動機 */
  motivation?: string | { file: string };
  /** 結末の詳細 */
  resolution?: string | { file: string };
};

/**
 * LSP用検出ヒント
 */
export type SubplotDetectionHints = {
  /** よく使われるパターン */
  commonPatterns?: string[];
  /** 除外パターン */
  excludePatterns?: string[];
  /** 信頼度 */
  confidence?: number;
};

// ========================================
// サブプロット型（メイン）
// ========================================

/**
 * サブプロット型
 */
export type Subplot = {
  // ========================================
  // 必須メタデータ
  // ========================================

  /** 一意なID */
  id: string;

  /** プロット名 */
  name: string;

  /** プロットタイプ */
  type: PlotType;

  /** 短い概要 */
  summary: string;

  /** プロットのビート構成 */
  beats: PlotBeat[];

  // ========================================
  // キャラクター関連
  // ========================================

  /** このプロットのフォーカスキャラクター */
  focusCharacters: FocusCharacter[];

  /** 関連キャラクター（フォーカス以外） */
  relatedCharacters?: string[];

  // ========================================
  // 構造・関係性
  // ========================================

  /** 構造テンプレートID（外部定義） */
  structureTemplateId?: string;

  /** 親プロットID（サブプロットの場合） */
  parentPlotId?: string;

  /** 子プロットIDリスト */
  childPlotIds?: string[];

  /** このプロットが扱うテーマ */
  themes?: string[];

  // ========================================
  // メタ情報
  // ========================================

  /** 重要度 */
  importance?: PlotImportance;

  /** 表示名のバリエーション */
  displayNames?: string[];

  /** 詳細情報 */
  details?: SubplotDetails;

  /** LSP用の検出ヒント */
  detectionHints?: SubplotDetectionHints;
};
```

### Refactor Phase: 品質改善と継続成功確認

- [ ] ブリーフィング
- [ ] JSDocコメントの整合性確認
- [ ] 型エクスポートの確認
- [ ] `deno fmt` / `deno lint` 実行
- [ ] テスト継続実行確認

---

## Process 2: PlotBeat型の拡張テスト

<!--@process-briefing
category: implementation
tags: [type-definition, plot-beat]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
TimelineEvent型のパターン **Watch Points**: preconditionBeatIdsは片方向のみ

---

### 対象ファイル

- **修正**: `tests/type/subplot_test.ts`
- **参照**: `src/type/v2/subplot.ts`

### Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング
- [ ] PlotBeatの因果関係テストを追加
  ```typescript
  Deno.test("PlotBeat should support preconditionBeatIds", () => {
    const beat: PlotBeat = {
      id: "meets_mysterious_lady",
      title: "謎の女性との出会い",
      summary: "王子が舞踏会で謎の美しい女性と出会う",
      chapter: "chapter_02",
      characters: ["prince", "cinderella"],
      settings: ["castle_ballroom"],
      structurePosition: "rising",
      preconditionBeatIds: ["ball_announcement"],
      timelineEventId: "event_ball_dance",
    };
    assertEquals(beat.preconditionBeatIds, ["ball_announcement"]);
    assertEquals(beat.timelineEventId, "event_ball_dance");
  });

  Deno.test("PlotBeat should support multiple characters and settings", () => {
    const beat: PlotBeat = {
      id: "midnight_flight",
      title: "真夜中の逃走",
      summary: "シンデレラが時計の鐘と共に逃げ出す",
      chapter: "chapter_02",
      characters: ["cinderella", "prince", "fairy_godmother"],
      settings: ["castle_ballroom", "castle_stairs"],
      structurePosition: "climax",
    };
    assertEquals(beat.characters.length, 3);
    assertEquals(beat.settings.length, 2);
  });
  ```
- [ ] テスト実行（成功確認 - 型定義は既に完了しているため）

### Green Phase: 最小実装と成功確認

- [ ] ブリーフィング
- [ ] 型定義はProcess 1で完了済み
- [ ] テスト実行確認

### Refactor Phase: 品質改善と継続成功確認

- [ ] ブリーフィング
- [ ] テスト継続実行確認

---

## Process 3: PlotIntersection型の拡張テスト

<!--@process-briefing
category: implementation
tags: [type-definition, intersection]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
Foreshadowing関連パターン **Watch Points**:
影響方向（forward/backward/mutual）の明確化

---

### 対象ファイル

- **修正**: `tests/type/subplot_test.ts`

### Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング
- [ ] PlotIntersectionの詳細テストを追加
  ```typescript
  Deno.test("PlotIntersection should support all influence directions", () => {
    const intersections: PlotIntersection[] = [
      {
        sourcePlotId: "main_story",
        sourceBeatId: "cinderella_at_ball",
        targetPlotId: "prince_story",
        targetBeatId: "meets_mysterious_lady",
        description: "双方向の運命的出会い",
        influenceDirection: "mutual",
        influenceLevel: "high",
      },
      {
        sourcePlotId: "fairy_plot",
        sourceBeatId: "grants_wish",
        targetPlotId: "main_story",
        targetBeatId: "cinderella_transformed",
        description: "妖精の魔法がシンデレラに影響",
        influenceDirection: "forward",
        influenceLevel: "high",
      },
      {
        sourcePlotId: "stepmother_plot",
        sourceBeatId: "discovers_truth",
        targetPlotId: "main_story",
        targetBeatId: "glass_slipper_test",
        description: "継母の発見がメインプロットに影響",
        influenceDirection: "backward",
        influenceLevel: "medium",
        chapter: "chapter_04",
      },
    ];
    assertEquals(intersections.length, 3);
  });
  ```

### Green Phase: 最小実装と成功確認

- [ ] ブリーフィング
- [ ] 型定義はProcess 1で完了済み
- [ ] テスト実行確認

### Refactor Phase: 品質改善と継続成功確認

- [ ] ブリーフィング
- [ ] テスト継続実行確認

---

## Process 4: Subplot型の完全テスト

<!--@process-briefing
category: implementation
tags: [type-definition, subplot]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
Timeline型、Character型のパターン **Watch Points**:
focusCharactersとCharacter.roleの違い

---

### 対象ファイル

- **修正**: `tests/type/subplot_test.ts`

### Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング
- [ ] Subplotの完全なテストを追加
  ```typescript
  Deno.test("Subplot should support full structure", () => {
    const subplot: Subplot = {
      id: "stepmother_plot",
      name: "継母の野望",
      type: "subplot",
      summary: "娘を王妃にしようとする継母の計画",
      beats: [
        {
          id: "stepmother_plan",
          title: "野望の始まり",
          summary: "継母が娘を王妃にする計画を立てる",
          chapter: "chapter_01",
          characters: ["stepmother"],
          settings: ["mansion"],
          structurePosition: "setup",
        },
      ],
      focusCharacters: [
        { characterId: "stepmother", weight: "primary" },
        { characterId: "stepsister_elder", weight: "secondary" },
        { characterId: "stepsister_younger", weight: "secondary" },
      ],
      relatedCharacters: ["cinderella"],
      parentPlotId: "main_story",
      themes: ["ambition", "jealousy"],
      importance: "minor",
      displayNames: ["継母の計画", "義母の野望"],
      details: {
        motivation: "社会的地位の向上と娘たちの幸福",
      },
      detectionHints: {
        commonPatterns: ["継母", "義母", "野望"],
        confidence: 0.8,
      },
    };
    assertEquals(subplot.focusCharacters.length, 3);
    assertEquals(subplot.beats.length, 1);
    assertEquals(subplot.themes?.length, 2);
  });
  ```

### Green Phase: 最小実装と成功確認

- [ ] ブリーフィング
- [ ] 型定義はProcess 1で完了済み
- [ ] テスト実行確認

### Refactor Phase: 品質改善と継続成功確認

- [ ] ブリーフィング
- [ ] テスト継続実行確認

---

## Process 5: 型エクスポートの設定

<!--@process-briefing
category: implementation
tags: [type-definition, export]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
src/type/v2/のエクスポートパターン **Watch Points**: import mapエイリアスの使用

---

### 対象ファイル

- **確認/修正**: `src/type/v2/` のindex.tsまたは直接インポート

### Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング
- [ ] エクスポート確認テスト
  ```typescript
  // tests/type/subplot_export_test.ts
  import type {
    FocusCharacter,
    InfluenceDirection,
    InfluenceLevel,
    PlotBeat,
    PlotImportance,
    PlotIntersection,
    PlotType,
    StructureTemplate,
    Subplot,
    SubplotDetails,
    SubplotDetectionHints,
  } from "@storyteller/types/v2/subplot.ts";

  Deno.test("All subplot types should be importable", () => {
    // 型のみのテスト - コンパイルが通ればOK
    const _plotType: PlotType = "main";
    const _importance: PlotImportance = "major";
    const _level: InfluenceLevel = "high";
    const _direction: InfluenceDirection = "mutual";
  });
  ```

### Green Phase: 最小実装と成功確認

- [ ] ブリーフィング
- [ ] deno.jsonのimport mapを確認
- [ ] テスト実行確認

### Refactor Phase: 品質改善と継続成功確認

- [ ] ブリーフィング
- [ ] 型定義の整合性確認
- [ ] テスト継続実行確認

---

## Process 10: 型定義統合テスト

<!--@process-briefing
category: testing
tags: [integration-test, type-definition]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
既存の統合テストパターン **Watch Points**: Timeline, Foreshadowingとの連携

---

### 対象ファイル

- **新規作成**: `tests/type/subplot_integration_test.ts`

### Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング
- [ ] 統合テスト作成
  ```typescript
  import { assertEquals } from "@std/assert";
  import type {
    PlotBeat,
    PlotIntersection,
    Subplot,
  } from "@storyteller/types/v2/subplot.ts";
  import type { TimelineEvent } from "@storyteller/types/v2/timeline.ts";
  import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

  Deno.test("PlotBeat should link to TimelineEvent", () => {
    const event: TimelineEvent = {
      id: "event_ball_dance",
      title: "舞踏会のダンス",
      category: "plot_point",
      time: { order: 5 },
      summary: "王子とシンデレラが踊る",
      characters: ["prince", "cinderella"],
      settings: ["castle_ballroom"],
      chapters: ["chapter_02"],
    };

    const beat: PlotBeat = {
      id: "meets_mysterious_lady",
      title: "謎の女性との出会い",
      summary: "王子が舞踏会で謎の美しい女性と出会う",
      chapter: "chapter_02",
      characters: ["prince", "cinderella"],
      settings: ["castle_ballroom"],
      timelineEventId: event.id,
    };

    assertEquals(beat.timelineEventId, event.id);
  });

  Deno.test("Subplot themes should be strings", () => {
    const subplot: Subplot = {
      id: "love_story",
      name: "愛の物語",
      type: "main",
      summary: "シンデレラと王子の愛",
      beats: [],
      focusCharacters: [
        { characterId: "cinderella", weight: "primary" },
        { characterId: "prince", weight: "primary" },
      ],
      themes: ["love", "destiny", "transformation"],
    };

    assertEquals(subplot.themes?.length, 3);
  });
  ```

### Green Phase: 最小実装と成功確認

- [ ] ブリーフィング
- [ ] テスト実行確認

### Refactor Phase: 品質改善と継続成功確認

- [ ] ブリーフィング
- [ ] テスト継続実行確認

---

## Process 51: subplot作成CLIコマンドの実装

<!--@process-briefing
category: implementation
tags: [cli, subplot, element]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
ElementTimelineCommand, ElementForeshadowingCommandのパターン **Watch Points**:
parseOptionsのパターン、エラーハンドリング

---

### 対象ファイル

- **新規作成**: `src/cli/modules/element/subplot.ts`
- **新規作成**: `tests/cli/element/subplot_test.ts`
- **修正**: `src/cli/modules/element/index.ts`
- **参照**: `src/cli/modules/element/timeline.ts`

### Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング
- [ ] テストファイル作成
  ```typescript
  // tests/cli/element/subplot_test.ts
  import { assertEquals, assertExists } from "@std/assert";
  import { ElementSubplotCommand } from "@storyteller/cli/modules/element/subplot.ts";

  Deno.test("ElementSubplotCommand should parse basic options", async () => {
    const command = new ElementSubplotCommand();
    assertEquals(command.name, "subplot");
    assertEquals(command.path, ["element", "subplot"]);
  });

  Deno.test("ElementSubplotCommand should require name", async () => {
    // テスト実装
  });

  Deno.test("ElementSubplotCommand should parse focus-character", async () => {
    // focus-character オプションのパースをテスト
    // --focus-character prince:primary 形式
  });
  ```
- [ ] テスト実行（失敗確認）

### Green Phase: 最小実装と成功確認

- [ ] ブリーフィング
- [ ] `src/cli/modules/element/subplot.ts` を作成（実装コードは下記参照）
- [ ] テスト実行（成功確認）

### 実装コード: `src/cli/modules/element/subplot.ts`

```typescript
/**
 * Subplot要素作成CLIコマンド
 * @module
 */

import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import type {
  CommandContext,
  CommandExecutionError,
} from "@storyteller/cli/types.ts";
import { err, ok } from "@storyteller/shared/result.ts";
import type {
  FocusCharacter,
  PlotType,
  Subplot,
} from "@storyteller/types/v2/subplot.ts";
import { ElementService } from "@storyteller/application/element/element_service.ts";
import { createPluginRegistry } from "@storyteller/application/element/plugin_registry.ts";
import { SubplotPlugin } from "@storyteller/application/element/plugins/subplot_plugin.ts";

interface ElementSubplotOptions {
  id: string;
  name: string;
  type: PlotType;
  summary?: string;
  "focus-character"?: string[];
  "parent-plot"?: string;
  themes?: string;
  displayNames?: string;
  force: boolean;
}

export class ElementSubplotCommand extends BaseCliCommand {
  override readonly name = "subplot" as const;
  override readonly path = ["element", "subplot"] as const;

  constructor() {
    super([]);
  }

  protected async handle(context: CommandContext) {
    const parsed = this.parseOptions(context);
    if ("code" in parsed) {
      return err(parsed);
    }

    try {
      const registry = createPluginRegistry();
      registry.register(new SubplotPlugin());
      const service = new ElementService(registry);

      const focusCharacters = this.parseFocusCharacters(
        parsed["focus-character"] || [],
      );

      const subplot: Subplot = {
        id: parsed.id,
        name: parsed.name,
        type: parsed.type,
        summary: parsed.summary ?? `${parsed.name}の概要（要追加）`,
        beats: [],
        focusCharacters,
        ...(parsed["parent-plot"] && { parentPlotId: parsed["parent-plot"] }),
        ...(parsed.themes && {
          themes: parsed.themes.split(",").map((t) => t.trim()),
        }),
        ...(parsed.displayNames && {
          displayNames: parsed.displayNames.split(",").map((n) => n.trim()),
        }),
      };

      const result = await service.createElement("subplot", subplot);

      if (result.ok) {
        const config = await context.config.resolve();
        const projectRoot = (context.args?.projectRoot as string) ||
          config.runtime.projectRoot || Deno.cwd();

        const fullPath = `${projectRoot}/${result.value.filePath}`;
        const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));

        await Deno.mkdir(dir, { recursive: true });
        await Deno.writeTextFile(fullPath, result.value.content);

        context.logger.info("Subplot element created", {
          filePath: result.value.filePath,
        });

        return ok(result.value);
      } else {
        return err({
          code: "element_creation_failed",
          message: result.error.message,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err({
        code: "element_creation_failed",
        message,
      });
    }
  }

  private parseOptions(
    context: CommandContext,
  ): ElementSubplotOptions | CommandExecutionError {
    const args = context.args ?? {};

    if (
      !args.name || typeof args.name !== "string" || args.name.trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Subplot name is required (--name)",
      };
    }

    if (!args.type || typeof args.type !== "string") {
      return {
        code: "invalid_arguments",
        message: "Subplot type is required (--type)",
      };
    }

    const validTypes: PlotType[] = [
      "main",
      "subplot",
      "parallel",
      "background",
    ];
    if (!validTypes.includes(args.type as PlotType)) {
      return {
        code: "invalid_arguments",
        message: `Invalid type: ${args.type}. Must be one of: ${
          validTypes.join(", ")
        }`,
      };
    }

    const id = args.id && typeof args.id === "string"
      ? args.id
      : this.generateIdFromName(args.name);

    return {
      id,
      name: args.name,
      type: args.type as PlotType,
      summary: typeof args.summary === "string" ? args.summary : undefined,
      "focus-character": this.parseArrayOption(args["focus-character"]),
      "parent-plot": typeof args["parent-plot"] === "string"
        ? args["parent-plot"]
        : undefined,
      themes: typeof args.themes === "string" ? args.themes : undefined,
      displayNames: typeof args.displayNames === "string"
        ? args.displayNames
        : undefined,
      force: args.force === true,
    };
  }

  private parseArrayOption(value: unknown): string[] | undefined {
    if (Array.isArray(value)) {
      return value.map(String);
    }
    if (typeof value === "string") {
      return [value];
    }
    return undefined;
  }

  private parseFocusCharacters(focusChars: string[]): FocusCharacter[] {
    return focusChars.map((fc) => {
      const [characterId, weight] = fc.split(":");
      return {
        characterId,
        weight: (weight === "secondary" ? "secondary" : "primary") as
          | "primary"
          | "secondary",
      };
    });
  }

  private generateIdFromName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, "_")
      .replace(/^_|_$/g, "");
  }
}
```

### Refactor Phase: 品質改善と継続成功確認

- [ ] ブリーフィング
- [ ] `deno fmt` / `deno lint` 実行
- [ ] テスト継続実行確認

---

## Process 52: SubplotPlugin の実装

<!--@process-briefing
category: implementation
tags: [plugin, subplot]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
TimelinePlugin, ForeshadowingPluginのパターン **Watch Points**: ElementPlugin
インターフェースの実装

---

### 対象ファイル

- **新規作成**: `src/application/element/plugins/subplot_plugin.ts`
- **新規作成**: `tests/application/element/plugins/subplot_plugin_test.ts`
- **参照**: `src/application/element/plugins/timeline_plugin.ts`

### Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング
- [ ] テストファイル作成
  ```typescript
  // tests/application/element/plugins/subplot_plugin_test.ts
  import { assertEquals, assertExists } from "@std/assert";
  import { SubplotPlugin } from "@storyteller/application/element/plugins/subplot_plugin.ts";

  Deno.test("SubplotPlugin should have correct type", () => {
    const plugin = new SubplotPlugin();
    assertEquals(plugin.type, "subplot");
  });

  Deno.test("SubplotPlugin should generate valid TypeScript code", () => {
    const plugin = new SubplotPlugin();
    const subplot = {
      id: "prince_story",
      name: "王子の花嫁探し",
      type: "subplot" as const,
      summary: "王子が運命の人を探す物語",
      beats: [],
      focusCharacters: [{ characterId: "prince", weight: "primary" as const }],
    };

    const result = plugin.generate(subplot);
    assertExists(result.content);
    assertExists(result.filePath);
  });
  ```

### Green Phase: 最小実装と成功確認

- [ ] ブリーフィング
- [ ] `src/application/element/plugins/subplot_plugin.ts`
      を作成（TimelinePluginを参考に）
- [ ] テスト実行（成功確認）

### Refactor Phase: 品質改善と継続成功確認

- [ ] ブリーフィング
- [ ] コード品質改善
- [ ] テスト継続実行確認

---

## Process 53: beat作成CLIコマンドの実装

<!--@process-briefing
category: implementation
tags: [cli, beat, element]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
ElementEventCommandのパターン **Watch Points**:
subplotへの参照、preconditionBeatIdsの処理

---

### 対象ファイル

- **新規作成**: `src/cli/modules/element/beat.ts`
- **新規作成**: `tests/cli/element/beat_test.ts`
- **修正**: `src/cli/modules/element/index.ts`
- **参照**: `src/cli/modules/element/event.ts`

### オプション

- `--subplot`: 親サブプロットID（必須）
- `--title`: ビートタイトル（必須）
- `--summary`: 概要
- `--chapter`: 関連チャプター（必須）
- `--characters`: キャラクターID（カンマ区切り）
- `--settings`: 設定ID（カンマ区切り）
- `--structure-position`: 構造位置
- `--precondition-beats`: 前提ビートID（カンマ区切り）
- `--timeline-event`: 関連タイムラインイベントID

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 54: intersection作成CLIコマンドの実装

<!--@process-briefing
category: implementation
tags: [cli, intersection, element]
-->

### 対象ファイル

- **新規作成**: `src/cli/modules/element/intersection.ts`
- **新規作成**: `tests/cli/element/intersection_test.ts`
- **修正**: `src/cli/modules/element/index.ts`

### オプション

- `--source-plot`: 交差元プロットID（必須）
- `--source-beat`: 交差元ビートID（必須）
- `--target-plot`: 交差先プロットID（必須）
- `--target-beat`: 交差先ビートID（必須）
- `--direction`: 影響方向（forward|backward|mutual）（必須）
- `--level`: 影響レベル（low|medium|high）（必須）
- `--description`: 交差の説明（必須）
- `--chapter`: 関連チャプター

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 55: element/index.ts へのコマンド登録

<!--@process-briefing
category: implementation
tags: [cli, registration]
-->

### 対象ファイル

- **修正**: `src/cli/modules/element/index.ts`

### 追加コード

```typescript
// インポート追加
import { ElementSubplotCommand } from "./subplot.ts";
import { ElementBeatCommand } from "./beat.ts";
import { ElementIntersectionCommand } from "./intersection.ts";

// ディスクリプタ追加
export const elementSubplotCommandDescriptor = {
  path: ["element", "subplot"] as const,
  summary: "Create a new subplot element",
  usage: "storyteller element subplot --name <name> --type <type> [options]",
  options: [
    { name: "--name", description: "Subplot name (required)", required: true },
    {
      name: "--type",
      description: "Plot type: main|subplot|parallel|background (required)",
      required: true,
    },
    {
      name: "--id",
      description: "Subplot ID (auto-generated from name if not provided)",
    },
    { name: "--summary", description: "Short summary" },
    {
      name: "--focus-character",
      description:
        "Focus character (format: characterId:weight, can be repeated)",
    },
    { name: "--parent-plot", description: "Parent plot ID" },
    { name: "--themes", description: "Themes (comma-separated)" },
  ],
  examples: [
    'storyteller element subplot --name "王子の花嫁探し" --type subplot --focus-character prince:primary',
  ],
};

export const elementSubplotHandler = (context: CommandContext) =>
  new ElementSubplotCommand().execute(context);

export const elementBeatCommandDescriptor = {
  path: ["element", "beat"] as const,
  summary: "Create a new plot beat element",
  usage:
    "storyteller element beat --subplot <id> --title <title> --chapter <chapter> [options]",
  options: [
    {
      name: "--subplot",
      description: "Parent subplot ID (required)",
      required: true,
    },
    { name: "--title", description: "Beat title (required)", required: true },
    {
      name: "--chapter",
      description: "Related chapter (required)",
      required: true,
    },
    { name: "--summary", description: "Short summary" },
    { name: "--characters", description: "Character IDs (comma-separated)" },
    { name: "--settings", description: "Setting IDs (comma-separated)" },
    {
      name: "--structure-position",
      description:
        "Structure position (setup/rising/climax/falling/resolution)",
    },
    {
      name: "--precondition-beats",
      description: "Precondition beat IDs (comma-separated)",
    },
    { name: "--timeline-event", description: "Related timeline event ID" },
  ],
  examples: [
    'storyteller element beat --subplot prince_story --title "花嫁探しの決意" --chapter chapter_01',
  ],
};

export const elementBeatHandler = (context: CommandContext) =>
  new ElementBeatCommand().execute(context);

export const elementIntersectionCommandDescriptor = {
  path: ["element", "intersection"] as const,
  summary: "Create a plot intersection (cross-plot relationship)",
  usage:
    "storyteller element intersection --source-plot <id> --source-beat <id> --target-plot <id> --target-beat <id> [options]",
  options: [
    {
      name: "--source-plot",
      description: "Source plot ID (required)",
      required: true,
    },
    {
      name: "--source-beat",
      description: "Source beat ID (required)",
      required: true,
    },
    {
      name: "--target-plot",
      description: "Target plot ID (required)",
      required: true,
    },
    {
      name: "--target-beat",
      description: "Target beat ID (required)",
      required: true,
    },
    {
      name: "--direction",
      description: "Influence direction: forward|backward|mutual (required)",
      required: true,
    },
    {
      name: "--level",
      description: "Influence level: low|medium|high (required)",
      required: true,
    },
    {
      name: "--description",
      description: "Description of the intersection (required)",
      required: true,
    },
    { name: "--chapter", description: "Related chapter" },
  ],
  examples: [
    'storyteller element intersection --source-plot main_story --source-beat ball_dance --target-plot prince_story --target-beat meets_lady --direction mutual --level high --description "運命的な出会い"',
  ],
};

export const elementIntersectionHandler = (context: CommandContext) =>
  new ElementIntersectionCommand().execute(context);
```

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 60: subplot表示CLIコマンドの実装

<!--@process-briefing
category: implementation
tags: [cli, view, subplot]
-->

### 対象ファイル

- **新規作成**: `src/cli/modules/view/subplot.ts`
- **新規作成**: `tests/cli/view/subplot_test.ts`
- **修正**: `src/cli/modules/view.ts`
- **参照**: `src/cli/modules/view/timeline.ts`

### オプション

- `--list`: サブプロット一覧表示
- `--id <id>`: 特定サブプロット表示
- `--type <type>`: タイプでフィルタ
- `--character <id>`: キャラクターでフィルタ
- `--format mermaid`: Mermaid形式出力
- `--intersections`: 交差ダイアグラム表示
- `--json`: JSON形式出力

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 61: Mermaidダイアグラム生成

<!--@process-briefing
category: implementation
tags: [visualization, mermaid]
-->

### 対象ファイル

- **修正**: `src/cli/modules/view/subplot.ts`

### 実装コード

```typescript
private generateMermaid(subplots: Subplot[], intersections: PlotIntersection[]): string {
  const lines: string[] = ["flowchart TD"];

  // サブプロット毎にサブグラフ
  for (const subplot of subplots) {
    lines.push(`  subgraph ${subplot.id}["${subplot.name}"]`);
    for (const beat of subplot.beats) {
      lines.push(`    ${beat.id}["${beat.title}"]`);
    }
    // ビート間の因果関係
    for (const beat of subplot.beats) {
      for (const precondition of beat.preconditionBeatIds || []) {
        lines.push(`    ${precondition} --> ${beat.id}`);
      }
    }
    lines.push(`  end`);
  }

  // 交差点
  for (const intersection of intersections) {
    const arrow = intersection.influenceDirection === "mutual" ? "<-->"
      : intersection.influenceDirection === "backward" ? "<--" : "-->";
    lines.push(`  ${intersection.sourceBeatId} ${arrow}|"${intersection.description}"| ${intersection.targetBeatId}`);
  }

  return lines.join("\n");
}
```

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 70: CLI統合テスト

<!--@process-briefing
category: testing
tags: [integration-test, cli]
-->

### 対象ファイル

- **新規作成**: `tests/cli/subplot_integration_test.ts`

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 101: manuscript_binding への subplot/beat 追加

<!--@process-briefing
category: implementation
tags: [frontmatter, manuscript-binding]
-->

### 対象ファイル

- **修正**: `src/mcp/tools/definitions/manuscript_binding.ts`
- **新規作成**: `tests/mcp/tools/manuscript_binding_subplot_test.ts`

### 修正内容

```typescript
// VALID_ENTITY_TYPES に追加（27行目付近）
export const VALID_ENTITY_TYPES = [
  "characters",
  "settings",
  "foreshadowings",
  "timeline_events",
  "phases",
  "timelines",
  "subplots", // 追加
  "beats", // 追加
  "intersections", // 追加
] as const;
```

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 102: FrontmatterEditor への subplot 対応

<!--@process-briefing
category: implementation
tags: [frontmatter, editor]
-->

### 対象ファイル

- **確認/修正**: `src/application/frontmatter/frontmatter_editor.ts`
- **新規作成**: `tests/application/frontmatter/frontmatter_subplot_test.ts`

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 103: EntityValidator への subplot 対応

<!--@process-briefing
category: implementation
tags: [validation, entity]
-->

### 対象ファイル

- **修正**: `src/application/validation/entity_validator.ts`
- **新規作成**: `tests/application/validation/entity_validator_subplot_test.ts`

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 110: FrontMatter統合テスト

<!--@process-briefing
category: testing
tags: [integration-test, frontmatter]
-->

### 対象ファイル

- **新規作成**: `tests/application/frontmatter/subplot_integration_test.ts`

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 151: subplot_create MCPツールの実装

<!--@process-briefing
category: implementation
tags: [mcp, tool, subplot]
-->

### 対象ファイル

- **新規作成**: `src/mcp/tools/definitions/subplot_create.ts`
- **新規作成**: `tests/mcp/tools/subplot_create_test.ts`
- **修正**: `src/mcp/tools/tool_registry.ts`
- **参照**: `src/mcp/tools/definitions/timeline_create.ts`

### inputSchema

```typescript
inputSchema: {
  type: "object",
  properties: {
    name: { type: "string", description: "サブプロット名" },
    type: { type: "string", enum: ["main", "subplot", "parallel", "background"], description: "プロットタイプ" },
    summary: { type: "string", description: "短い概要" },
    focusCharacters: {
      type: "array",
      items: {
        type: "object",
        properties: {
          characterId: { type: "string" },
          weight: { type: "string", enum: ["primary", "secondary"] },
        },
        required: ["characterId", "weight"],
      },
      description: "フォーカスキャラクター",
    },
    parentPlotId: { type: "string", description: "親プロットID" },
    themes: { type: "array", items: { type: "string" }, description: "テーマリスト" },
  },
  required: ["name", "type", "focusCharacters"],
}
```

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 152: beat_create MCPツールの実装

<!--@process-briefing
category: implementation
tags: [mcp, tool, beat]
-->

### 対象ファイル

- **新規作成**: `src/mcp/tools/definitions/beat_create.ts`
- **新規作成**: `tests/mcp/tools/beat_create_test.ts`
- **修正**: `src/mcp/tools/tool_registry.ts`

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 153: beat_update MCPツールの実装

<!--@process-briefing
category: implementation
tags: [mcp, tool, beat]
-->

### 対象ファイル

- **新規作成**: `src/mcp/tools/definitions/beat_update.ts`
- **新規作成**: `tests/mcp/tools/beat_update_test.ts`
- **修正**: `src/mcp/tools/tool_registry.ts`

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 154: intersection_create MCPツールの実装

<!--@process-briefing
category: implementation
tags: [mcp, tool, intersection]
-->

### 対象ファイル

- **新規作成**: `src/mcp/tools/definitions/intersection_create.ts`
- **新規作成**: `tests/mcp/tools/intersection_create_test.ts`
- **修正**: `src/mcp/tools/tool_registry.ts`

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 155: subplot_view MCPツールの実装

<!--@process-briefing
category: implementation
tags: [mcp, tool, view]
-->

### 対象ファイル

- **新規作成**: `src/mcp/tools/definitions/subplot_view.ts`
- **新規作成**: `tests/mcp/tools/subplot_view_test.ts`
- **修正**: `src/mcp/tools/tool_registry.ts`
- **参照**: `src/mcp/tools/definitions/timeline_view.ts`

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 156: subplot_analyze MCPツールの実装

<!--@process-briefing
category: implementation
tags: [mcp, tool, analyze]
-->

### 対象ファイル

- **新規作成**: `src/mcp/tools/definitions/subplot_analyze.ts`
- **新規作成**: `tests/mcp/tools/subplot_analyze_test.ts`
- **修正**: `src/mcp/tools/tool_registry.ts`
- **参照**: `src/mcp/tools/definitions/timeline_analyze.ts`

### 機能

- 孤立ビートの検出
- 循環参照の検出
- TimelineEventとの整合性検証
- Foreshadowingとの関連検証

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 160: MCPリソースの実装

<!--@process-briefing
category: implementation
tags: [mcp, resource, subplot]
-->

### 対象ファイル

- **修正**: `src/mcp/resources/project_resource_provider.ts`
- **新規作成**: `tests/mcp/resources/subplot_resource_test.ts`

### 追加リソース

- `storyteller://subplots` - サブプロット一覧
- `storyteller://subplot/{id}` - 特定のサブプロット
- `storyteller://subplot/{id}/beats` - プロットのビート一覧
- `storyteller://intersections` - 交差一覧

### 修正箇所: `listResources` メソッドに追加

```typescript
// subplots リソースを追加
resources.push({
  uri: "storyteller://subplots",
  name: "Subplots",
  description: "プロジェクトのサブプロット一覧",
  mimeType: "application/json",
});

// 個別subplotリソースを追加
for (const subplot of analysis.subplots || []) {
  resources.push({
    uri: `storyteller://subplot/${subplot.id}`,
    name: subplot.name,
    description: subplot.summary,
    mimeType: "application/json",
  });
}

// intersections リソースを追加
resources.push({
  uri: "storyteller://intersections",
  name: "Plot Intersections",
  description: "プロット間の交差一覧",
  mimeType: "application/json",
});
```

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 165: MCPプロンプトの実装（subplot_brainstorm）

<!--@process-briefing
category: implementation
tags: [mcp, prompt, brainstorm]
-->

### 対象ファイル

- **新規作成**: `src/mcp/prompts/definitions/subplot_brainstorm.ts`
- **修正**: `src/mcp/prompts/prompt_registry.ts`
- **参照**: `src/mcp/prompts/definitions/timeline_brainstorm.ts`

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 166: MCPプロンプトの実装（beat_suggest）

<!--@process-briefing
category: implementation
tags: [mcp, prompt, suggest]
-->

### 対象ファイル

- **新規作成**: `src/mcp/prompts/definitions/beat_suggest.ts`
- **修正**: `src/mcp/prompts/prompt_registry.ts`
- **参照**: `src/mcp/prompts/definitions/event_detail_suggest.ts`

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 167: MCPプロンプトの実装（intersection_analysis）

<!--@process-briefing
category: implementation
tags: [mcp, prompt, analysis]
-->

### 対象ファイル

- **新規作成**: `src/mcp/prompts/definitions/intersection_analysis.ts`
- **修正**: `src/mcp/prompts/prompt_registry.ts`
- **参照**: `src/mcp/prompts/definitions/causality_analysis.ts`

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 168: MCPプロンプトの実装（subplot_consistency_check）

<!--@process-briefing
category: implementation
tags: [mcp, prompt, consistency]
-->

### 対象ファイル

- **新規作成**: `src/mcp/prompts/definitions/subplot_consistency_check.ts`
- **修正**: `src/mcp/prompts/prompt_registry.ts`
- **参照**: `src/mcp/prompts/definitions/timeline_consistency_check.ts`

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 170: ToolRegistry / PromptRegistry への登録

<!--@process-briefing
category: implementation
tags: [mcp, registration]
-->

### 対象ファイル

- **修正**: `src/mcp/tools/tool_registry.ts`
- **修正**: `src/mcp/prompts/prompt_registry.ts`

### 追加内容（tool_registry.ts）

```typescript
// インポート追加
import { subplotCreateTool } from "./definitions/subplot_create.ts";
import { beatCreateTool } from "./definitions/beat_create.ts";
import { beatUpdateTool } from "./definitions/beat_update.ts";
import { intersectionCreateTool } from "./definitions/intersection_create.ts";
import { subplotViewTool } from "./definitions/subplot_view.ts";
import { subplotAnalyzeTool } from "./definitions/subplot_analyze.ts";

// defaultTools配列に追加
const defaultTools = [
  // ... 既存のツール ...
  subplotCreateTool,
  beatCreateTool,
  beatUpdateTool,
  intersectionCreateTool,
  subplotViewTool,
  subplotAnalyzeTool,
];
```

### 追加内容（prompt_registry.ts）

```typescript
// インポート追加
import { subplotBrainstormPrompt } from "./definitions/subplot_brainstorm.ts";
import { beatSuggestPrompt } from "./definitions/beat_suggest.ts";
import { intersectionAnalysisPrompt } from "./definitions/intersection_analysis.ts";
import { subplotConsistencyCheckPrompt } from "./definitions/subplot_consistency_check.ts";

// defaultPrompts配列に追加
const defaultPrompts = [
  // ... 既存のプロンプト ...
  subplotBrainstormPrompt,
  beatSuggestPrompt,
  intersectionAnalysisPrompt,
  subplotConsistencyCheckPrompt,
];
```

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 180: MCP統合テスト

<!--@process-briefing
category: testing
tags: [integration-test, mcp]
-->

### 対象ファイル

- **新規作成**: `tests/mcp/subplot_integration_test.ts`

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 201: HoverProvider への subplot/beat 対応

<!--@process-briefing
category: implementation
tags: [lsp, hover, subplot]
-->

### 対象ファイル

- **修正**: `src/lsp/providers/hover_provider.ts`
- **新規作成**: `tests/lsp/providers/hover_subplot_test.ts`

### 修正箇所

```typescript
// getKindLabel メソッドに追加（既存のswitch文内）
case "subplot":
  return "Subplot";
case "beat":
  return "Plot Beat";

// generateMarkdown メソッドでsubplot/beat情報を表示
// appendSubplotInfo メソッドを追加
private appendSubplotInfo(lines: string[], subplot: Subplot): void {
  lines.push("");
  lines.push("---");
  lines.push(`**Type**: ${subplot.type}`);
  lines.push(`**Focus Characters**: ${subplot.focusCharacters.map(fc => fc.characterId).join(", ")}`);
  if (subplot.beats.length > 0) {
    lines.push(`**Beats**: ${subplot.beats.length}`);
  }
  if (subplot.themes && subplot.themes.length > 0) {
    lines.push(`**Themes**: ${subplot.themes.join(", ")}`);
  }
}
```

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 202: SemanticTokensProvider への subplot/beat 対応

<!--@process-briefing
category: implementation
tags: [lsp, semantic-tokens, subplot]
-->

### 対象ファイル

- **修正**: `src/lsp/providers/semantic_tokens_provider.ts`
- **新規作成**: `tests/lsp/providers/semantic_tokens_subplot_test.ts`

### 追加トークンタイプ

- `subplot`: サブプロット名
- `beat`: ビート名

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 203: PositionedDetector への subplot/beat 対応

<!--@process-briefing
category: implementation
tags: [lsp, detection, subplot]
-->

### 対象ファイル

- **修正**: `src/lsp/detection/positioned_detector.ts`
- **新規作成**: `tests/lsp/detection/positioned_detector_subplot_test.ts`

### 修正箇所

```typescript
// DetectableEntity 型に追加
export type DetectableEntity = {
  kind:
    | "character"
    | "setting"
    | "foreshadowing"
    | "timeline_event"
    | "subplot"
    | "beat";
  // ...
};

// updateEntities メソッドでsubplot/beatを処理
if (entities.subplots) {
  for (const subplot of entities.subplots) {
    this.updateSingleEntity(subplot, "subplot");
    for (const beat of subplot.beats) {
      this.updateSingleEntity({ ...beat, parentId: subplot.id }, "beat");
    }
  }
}
```

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 210: 診断機能への subplot 対応

<!--@process-briefing
category: implementation
tags: [lsp, diagnostics, subplot]
-->

### 対象ファイル

- **修正**: `src/lsp/diagnostics/diagnostics_generator.ts`
- **新規作成**: `tests/lsp/diagnostics/subplot_diagnostics_test.ts`

### 追加診断

- 未定義のsubplot/beat参照の警告
- 孤立ビートの警告

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 220: LSP統合テスト

<!--@process-briefing
category: testing
tags: [integration-test, lsp]
-->

### 対象ファイル

- **新規作成**: `tests/lsp/subplot_integration_test.ts`

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 251: SubplotGraphBuilder の実装

<!--@process-briefing
category: implementation
tags: [visualization, graph, subplot]
-->

### 対象ファイル

- **新規作成**: `src/application/view/graph/subplot_graph_builder.ts`
- **新規作成**: `tests/application/view/graph/subplot_graph_builder_test.ts`
- **参照**: `src/application/view/graph/foreshadowing_graph_builder.ts`

### 実装詳細は Process 251 のコードセクションを参照

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 252: HtmlGenerator への subplot 統合

<!--@process-briefing
category: implementation
tags: [visualization, html, subplot]
-->

### 対象ファイル

- **修正**: `src/application/view/html_generator.ts`
- **新規作成**: `tests/application/view/html_generator_subplot_test.ts`

### 追加内容

- SubplotGraphBuilder を使用したグラフセクションの追加
- サブプロット統計情報の表示

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 253: 整合性チェックルールの実装（orphan_beat_rule）

<!--@process-briefing
category: implementation
tags: [consistency, rule, beat]
-->

### 対象ファイル

- **新規作成**: `src/application/view/consistency/rules/orphan_beat_rule.ts`
- **新規作成**:
  `tests/application/view/consistency/rules/orphan_beat_rule_test.ts`
- **修正**: `src/application/view/consistency/consistency_checker.ts`
- **参照**: `src/application/view/consistency/rules/orphan_character_rule.ts`

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 254: 整合性チェックルールの実装（circular_causality_rule）

<!--@process-briefing
category: implementation
tags: [consistency, rule, causality]
-->

### 対象ファイル

- **新規作成**:
  `src/application/view/consistency/rules/circular_causality_rule.ts`
- **新規作成**:
  `tests/application/view/consistency/rules/circular_causality_rule_test.ts`
- **修正**: `src/application/view/consistency/consistency_checker.ts`

### 機能

- ビート間の循環参照を検出（グラフアルゴリズム使用）

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 260: cinderella サンプルへの subplot 追加

<!--@process-briefing
category: implementation
tags: [sample, cinderella, subplot]
-->

### 対象ファイル

- **新規作成**: `samples/cinderella/src/subplots/main_story.ts`
- **新規作成**: `samples/cinderella/src/subplots/prince_story.ts`
- **新規作成**: `samples/cinderella/src/subplots/stepmother_plot.ts`
- **新規作成**: `samples/cinderella/src/subplots/fairy_plot.ts`
- **新規作成**: `samples/cinderella/src/subplots/intersections.ts`

### サンプルデータ構造

**main_story.ts**:

- id: "main_story"
- type: "main"
- focusCharacters: [{ characterId: "cinderella", weight: "primary" }]
- beats: humble_beginnings, ball_invitation, fairy_transformation, ball_dance,
  midnight_flight, slipper_search, slipper_test, happy_ending

**prince_story.ts**:

- id: "prince_story"
- type: "subplot"
- focusCharacters: [{ characterId: "prince", weight: "primary" }]
- beats: ball_announcement, meets_mysterious_lady, pursuit, search_kingdom,
  finds_love

**stepmother_plot.ts**:

- id: "stepmother_plot"
- type: "subplot"
- focusCharacters: [{ characterId: "stepmother", weight: "primary" }]
- beats: ambitious_plan, prepares_daughters, discovers_slipper,
  hides_cinderella, defeat

**fairy_plot.ts**:

- id: "fairy_plot"
- type: "background"
- focusCharacters: [{ characterId: "fairy_godmother", weight: "primary" }]
- beats: watches_over, grants_wish, sets_condition

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 261: cinderella サンプルの交差定義

<!--@process-briefing
category: implementation
tags: [sample, cinderella, intersection]
-->

### 対象ファイル

- **新規作成**: `samples/cinderella/src/subplots/intersections.ts`

### 交差定義

```typescript
export const plotIntersections: PlotIntersection[] = [
  {
    sourcePlotId: "main_story",
    sourceBeatId: "ball_dance",
    targetPlotId: "prince_story",
    targetBeatId: "meets_mysterious_lady",
    description: "シンデレラと王子の運命的な出会い",
    influenceDirection: "mutual",
    influenceLevel: "high",
    chapter: "chapter_02",
  },
  {
    sourcePlotId: "fairy_plot",
    sourceBeatId: "grants_wish",
    targetPlotId: "main_story",
    targetBeatId: "fairy_transformation",
    description: "妖精の魔法がシンデレラの変身を可能にする",
    influenceDirection: "forward",
    influenceLevel: "high",
    chapter: "chapter_02",
  },
  {
    sourcePlotId: "stepmother_plot",
    sourceBeatId: "hides_cinderella",
    targetPlotId: "main_story",
    targetBeatId: "slipper_test",
    description: "継母の妨害がクライマックスの緊張を高める",
    influenceDirection: "forward",
    influenceLevel: "medium",
    chapter: "chapter_04",
  },
];
```

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 270: 可視化統合テスト

<!--@process-briefing
category: testing
tags: [integration-test, visualization]
-->

### 対象ファイル

- **新規作成**: `tests/application/view/subplot_visualization_test.ts`

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 280: ドキュメンテーション（docs/subplot.md）

<!--@process-briefing
category: documentation
tags: [docs, subplot]
-->

### 対象ファイル

- **新規作成**: `docs/subplot.md`

### ドキュメント構成

1. 概要
2. 型定義の説明
3. CLIコマンドリファレンス
4. MCPツール/リソース/プロンプトリファレンス
5. LSP機能の説明
6. 可視化の説明
7. 使用例（cinderellaサンプル）

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 281: CLAUDE.md の更新

<!--@process-briefing
category: documentation
tags: [docs, claude-md]
-->

### 対象ファイル

- **修正**: `CLAUDE.md`

### 追加内容

- 「進行中の機能開発」セクションにSubplot機能を追加
- CLIコマンドリファレンスを追加
- MCPツール/リソース/プロンプトリファレンスを追加

### Red Phase, Green Phase, Refactor Phase

- [ ] 同様の手順で実装

---

## Process 300: OODAフィードバックループ（教訓・知見の保存）

<!--@process-briefing
category: ooda_feedback
tags: [ooda, feedback, lessons]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
(auto-populated from patterns) **Watch Points**: (auto-populated from
failure_cases)

---

### Red Phase: フィードバック収集設計

**Observe（観察）**

- [ ] ブリーフィング
- [ ] 実装過程で発生した問題・課題を収集
- [ ] テスト結果から得られた知見を記録
- [ ] コードレビューのフィードバックを整理

**Orient（方向付け）**

- [ ] ブリーフィング
- [ ] 収集した情報をカテゴリ別に分類
  - Technical: 技術的な知見・パターン
  - Process: プロセス改善に関する教訓
  - Antipattern: 避けるべきパターン
  - Best Practice: 推奨パターン
- [ ] 重要度（Critical/High/Medium/Low）を設定

### Green Phase: 教訓・知見の永続化

**Decide（決心）**

- [ ] ブリーフィング
- [ ] 保存すべき教訓・知見を選定
- [ ] 各項目の保存先を決定

**Act（行動）**

- [ ] ブリーフィング
- [ ] serena-v4のmcp__serena__write_memoryで教訓を永続化
- [ ] コードに関する知見をMarkdownで記録

### Refactor Phase: フィードバック品質改善

**Feedback Loop**

- [ ] ブリーフィング
- [ ] 保存した教訓の品質を検証
- [ ] 重複・矛盾する教訓を統合・整理
- [ ] メタ学習: OODAプロセス自体の改善点を記録

**Cross-Feedback**

- [ ] ブリーフィング
- [ ] 他のProcess（100, 200）との連携を確認
- [ ] 将来のミッションへの引き継ぎ事項を整理

---

# Management

## Blockers

| ID | Description | Status | Resolution |
| -- | ----------- | ------ | ---------- |
| -  | なし        | -      | -          |

## Lessons

| ID | Insight                                         | Severity | Applied |
| -- | ----------------------------------------------- | -------- | ------- |
| L1 | preconditionBeatIdsは片方向のみ（循環参照防止） | high     | -       |
| L2 | focusCharactersとCharacter.roleは異なるスコープ | medium   | -       |
| L3 | PlotBeatはシーンではなくプロットポイントを表す  | medium   | -       |

## Feedback Log

| Date       | Type   | Content                                          | Status   |
| ---------- | ------ | ------------------------------------------------ | -------- |
| 2026-01-15 | design | マルチLLM合議によりpreconditionBeatIds方式を採用 | resolved |

## Completion Checklist

- [ ] すべてのProcess完了
- [ ] すべてのテスト合格
- [ ] コードレビュー完了
- [ ] ドキュメント更新完了
- [ ] マージ可能な状態

---

<!--
Process番号規則
- 1-10: 型定義
- 51-80: CLI基本機能
- 101-120: FrontMatter連携
- 151-180: MCP統合
- 201-230: LSP拡張
- 251-270: 可視化
- 280-281: ドキュメンテーション
- 300: OODAフィードバックループ
-->
