---
mission_id: html-visualization-enhancement
title: "HTML可視化機能拡張 - グラフ可視化と整合性チェック"
status: planning
progress: 0
phase: planning
tdd_mode: true
blockers: 0
created_at: "2026-01-09"
updated_at: "2026-01-09"
---

# Commander's Intent

## Purpose

- storyteller view
  browserコマンドのHTML出力を強化し、物語要素間の関係性をビジュアル化する
- 作者が物語構造を俯瞰的に把握できるようにする
- 整合性チェック機能により、構造的な問題を早期に発見できるようにする

## End State

- vis.jsを使用したインタラクティブなグラフ表示が動作している
- キャラクター関係図、タイムライン因果図、伏線フロー図が表示される
- 整合性チェック結果がHTML内に表示される
- 既存のHTMLセクションと統合されている

## Key Tasks

- vis.js CDN統合とグラフ描画基盤の構築
- キャラクター関係グラフの実装
- タイムライン因果関係グラフの実装
- 伏線設置・回収フローグラフの実装
- 整合性チェックエンジンの実装
- HTML統合とUI/UX改善

## Constraints

- 外部ライブラリはCDNから読み込む（ビルド複雑化を避ける）
- スタンドアロンHTML（インターネット接続時のみグラフ表示）
- 既存のHtmlGenerator APIを破壊しない

## Restraints

- TDD（テスト駆動開発）を厳守すること
- vis.jsを使用すること
- 既存テストが全て通過すること

---

# Context

## 概要

- storyteller view
  browserコマンドが生成するHTMLに、グラフ可視化と整合性チェック機能を追加
- 作者は物語の構造（キャラクター関係、イベント因果、伏線フロー）を視覚的に確認可能
- 不整合（孤立キャラクター、循環因果、未回収伏線など）を自動検出

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテスト、フォーマッタ、Linterが通過していること
  - プロセス完了後、チェックボックスを更新すること
- **各Process開始時のブリーフィング実行**
  - 各Processの「Briefing」セクションは自動生成される
  - `@process-briefing`
    コメントを含むセクションは、エージェントが実行時に以下を自動取得する：
    - **Related Lessons**: stigmergy/doctrine-memoriesから関連教訓を取得
    - **Known Patterns**: プロジェクト固有パターン・テンプレートから自動取得
    - **Watch Points**: 過去の失敗事例・注意点から自動取得
  - ブリーフィング情報は `/x` や `/d`
    コマンド実行時に動的に埋め込まれ、実行戦況を反映する

## 開発のゴール

- インタラクティブなグラフ表示により、物語構造の視覚的理解を実現
- 自動整合性チェックにより、構造的問題の早期発見を実現

---

# References

| @ref                                     | @target                                                   | @test                                                            |
| ---------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| src/type/v2/character.ts                 | src/application/view/graph/character_graph_builder.ts     | tests/application/view/graph/character_graph_builder_test.ts     |
| src/type/v2/timeline.ts                  | src/application/view/graph/timeline_graph_builder.ts      | tests/application/view/graph/timeline_graph_builder_test.ts      |
| src/type/v2/foreshadowing.ts             | src/application/view/graph/foreshadowing_graph_builder.ts | tests/application/view/graph/foreshadowing_graph_builder_test.ts |
| src/application/view/html_generator.ts   | src/application/view/html_generator.ts (拡張)             | tests/application/view/html_generator_graph_test.ts              |
| src/application/meta/entity_validator.ts | src/application/view/consistency/consistency_checker.ts   | tests/application/view/consistency/consistency_checker_test.ts   |

---

# Progress Map

| Process     | Status       | Progress | Phase        | Notes                                 |
| ----------- | ------------ | -------- | ------------ | ------------------------------------- |
| Process 1   | planning     | 0%       | Red          | vis.js統合基盤（CDN・型定義）         |
| Process 2   | planning     | 0%       | Red          | GraphDataBuilder抽象インターフェース  |
| Process 3   | planning     | 0%       | Red          | CharacterGraphBuilder実装             |
| Process 4   | planning     | 0%       | Red          | TimelineGraphBuilder実装              |
| Process 5   | planning     | 0%       | Red          | ForeshadowingGraphBuilder実装         |
| Process 6   | planning     | 0%       | Red          | HtmlGenerator拡張（グラフセクション） |
| Process 7   | planning     | 0%       | Red          | ConsistencyChecker基盤                |
| Process 8   | planning     | 0%       | Red          | 各種整合性ルール実装                  |
| Process 9   | planning     | 0%       | Red          | HTML整合性表示統合                    |
| Process 10  | planning     | 0%       | Red          | 統合テスト                            |
| Process 50  | planning     | 0%       | Red          | フォローアップ（未定義）              |
| Process 100 | planning     | 0%       | Red          | リファクタリング・品質向上            |
| Process 200 | planning     | 0%       | Red          | ドキュメンテーション                  |
| Process 300 | planning     | 0%       | Red          | OODAフィードバックループ              |
|             |              |          |              |                                       |
| **Overall** | **planning** | **0%**   | **planning** | **Blockers: 0**                       |

---

# Processes

## Process 1: vis.js統合基盤（CDN・型定義）

<!--@process-briefing
category: implementation
tags: [vis.js, cdn, types, foundation]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
(auto-populated from patterns) **Watch Points**: (auto-populated from
failure_cases)

---

### Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング
- [ ] テストケースを作成（この時点で実装がないため失敗する）
  - `tests/application/view/graph/vis_types_test.ts` を作成
  - vis.js向けデータ構造（Node, Edge, Options）の型定義テスト
  - CDNリンク定数のテスト
- [ ] テストを実行して失敗することを確認

**テストコード例**:

```typescript
// tests/application/view/graph/vis_types_test.ts
import { assertEquals, assertExists } from "@std/assert";
import {
  VIS_CDN_LINKS,
  type VisEdge,
  type VisNode,
} from "@storyteller/application/view/graph/vis_types.ts";

Deno.test("vis_types - CDN links", async (t) => {
  await t.step("VIS_CDN_LINKSが定義されている", () => {
    assertExists(VIS_CDN_LINKS);
    assertExists(VIS_CDN_LINKS.network);
    assertExists(VIS_CDN_LINKS.css);
  });
});

Deno.test("vis_types - Node型", async (t) => {
  await t.step("VisNode型が正しく構成できる", () => {
    const node: VisNode = {
      id: "hero",
      label: "勇者",
      group: "protagonist",
    };
    assertEquals(node.id, "hero");
  });
});
```

**成功条件**:

- テストファイルが作成され、実行時にモジュール未発見エラーで失敗する

---

### Green Phase: 最小実装と成功確認

- [ ] ブリーフィング
- [ ] `src/application/view/graph/vis_types.ts` を作成
  - vis.js CDNリンク定数を定義
  - VisNode, VisEdge, VisOptions型を定義
  - グラフデータ構造（VisGraphData）を定義

**実装コード例**:

```typescript
// src/application/view/graph/vis_types.ts

/** vis.js CDNリンク */
export const VIS_CDN_LINKS = {
  network: "https://unpkg.com/vis-network@9.1.9/dist/vis-network.min.js",
  css: "https://unpkg.com/vis-network@9.1.9/dist/vis-network.min.css",
} as const;

/** vis.jsノード型 */
export type VisNode = {
  readonly id: string;
  readonly label: string;
  readonly group?: string;
  readonly title?: string; // ホバー時のツールチップ
  readonly color?: {
    readonly background?: string;
    readonly border?: string;
  };
  readonly shape?:
    | "dot"
    | "box"
    | "ellipse"
    | "circle"
    | "diamond"
    | "star"
    | "triangle";
};

/** vis.jsエッジ型 */
export type VisEdge = {
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly arrows?: "to" | "from" | "to, from";
  readonly dashes?: boolean;
  readonly color?: {
    readonly color?: string;
    readonly highlight?: string;
  };
  readonly width?: number;
};

/** vis.jsグラフオプション型 */
export type VisOptions = {
  readonly nodes?: {
    readonly shape?: string;
    readonly font?: { readonly size?: number };
  };
  readonly edges?: {
    readonly smooth?: boolean | { readonly type?: string };
  };
  readonly physics?: {
    readonly enabled?: boolean;
    readonly stabilization?: { readonly iterations?: number };
  };
  readonly interaction?: {
    readonly hover?: boolean;
    readonly tooltipDelay?: number;
  };
};

/** グラフデータ */
export type VisGraphData = {
  readonly nodes: readonly VisNode[];
  readonly edges: readonly VisEdge[];
  readonly options?: VisOptions;
};
```

- [ ] テストを実行して成功することを確認

**成功条件**:

- `deno test tests/application/view/graph/vis_types_test.ts` が通過する

---

### Refactor Phase: 品質改善と継続成功確認

- [ ] ブリーフィング
- [ ] 型定義のJSDocコメント追加
- [ ] deno lintとdeno fmtの実行
- [ ] テストを実行し、継続して成功することを確認

**成功条件**:

- `deno lint` と `deno fmt --check` が通過する

---

## Process 2: GraphDataBuilder抽象インターフェース

<!--@process-briefing
category: implementation
tags: [interface, abstraction, graph]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
(auto-populated from patterns) **Watch Points**: (auto-populated from
failure_cases)

---

### Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング
- [ ] テストケースを作成
  - `tests/application/view/graph/graph_data_builder_test.ts` を作成
  - GraphDataBuilder型のインターフェース準拠テスト

**テストコード例**:

```typescript
// tests/application/view/graph/graph_data_builder_test.ts
import { assertExists } from "@std/assert";
import type { GraphDataBuilder } from "@storyteller/application/view/graph/graph_data_builder.ts";
import type { VisGraphData } from "@storyteller/application/view/graph/vis_types.ts";

Deno.test("GraphDataBuilder - インターフェース定義", async (t) => {
  await t.step("GraphDataBuilder型が存在する", () => {
    // 型チェックのみ - コンパイル通過で成功
    const _builder: GraphDataBuilder<unknown> = {
      build: (_data: unknown): VisGraphData => ({
        nodes: [],
        edges: [],
      }),
    };
    assertExists(_builder);
  });
});
```

- [ ] テストを実行して失敗することを確認

---

### Green Phase: 最小実装と成功確認

- [ ] ブリーフィング
- [ ] `src/application/view/graph/graph_data_builder.ts` を作成
  - GraphDataBuilder<T>インターフェースを定義
  - build(data: T): VisGraphData メソッドを定義

**実装コード例**:

```typescript
// src/application/view/graph/graph_data_builder.ts
import type { VisGraphData } from "./vis_types.ts";

/**
 * グラフデータビルダーのインターフェース
 *
 * 各エンティティ型（Character, Timeline, Foreshadowing）に対して
 * vis.js用のグラフデータを構築する
 */
export interface GraphDataBuilder<T> {
  /**
   * データからvis.jsグラフデータを構築する
   * @param data 入力データ
   * @returns vis.js互換のグラフデータ
   */
  build(data: T): VisGraphData;
}
```

- [ ] テストを実行して成功することを確認

---

### Refactor Phase: 品質改善と継続成功確認

- [ ] ブリーフィング
- [ ] コードの品質を改善
- [ ] テストを実行し、継続して成功することを確認

---

## Process 3: CharacterGraphBuilder実装

<!--@process-briefing
category: implementation
tags: [character, graph, relationship]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
(auto-populated from patterns) **Watch Points**: (auto-populated from
failure_cases)

---

### Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング
- [ ] テストケースを作成
  - `tests/application/view/graph/character_graph_builder_test.ts` を作成
  - キャラクター関係グラフ生成のテスト
  - RelationType別のエッジスタイルテスト

**テストコード例**:

```typescript
// tests/application/view/graph/character_graph_builder_test.ts
import { assertEquals, assertExists } from "@std/assert";
import { CharacterGraphBuilder } from "@storyteller/application/view/graph/character_graph_builder.ts";
import type { Character } from "@storyteller/types/v2/character.ts";

const mockCharacters: readonly Character[] = [
  {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["勇敢"],
    relationships: { villain: "enemy", mentor: "respect" },
    appearingChapters: ["chapter_01"],
    summary: "主人公",
  },
  {
    id: "villain",
    name: "魔王",
    role: "antagonist",
    traits: ["邪悪"],
    relationships: { hero: "enemy" },
    appearingChapters: ["chapter_01"],
    summary: "敵役",
  },
  {
    id: "mentor",
    name: "師匠",
    role: "supporting",
    traits: ["賢明"],
    relationships: { hero: "mentor" },
    appearingChapters: ["chapter_01"],
    summary: "指導者",
  },
];

Deno.test("CharacterGraphBuilder - グラフ生成", async (t) => {
  const builder = new CharacterGraphBuilder();

  await t.step("ノードが全キャラクター分生成される", () => {
    const result = builder.build(mockCharacters);
    assertEquals(result.nodes.length, 3);
  });

  await t.step("関係性からエッジが生成される", () => {
    const result = builder.build(mockCharacters);
    // hero->villain(enemy), hero->mentor(respect), villain->hero(enemy), mentor->hero(mentor)
    // 双方向の関係は1つのエッジにまとめる
    assertExists(
      result.edges.find((e) =>
        (e.from === "hero" && e.to === "villain") ||
        (e.from === "villain" && e.to === "hero")
      ),
    );
  });

  await t.step("役割別にグループが設定される", () => {
    const result = builder.build(mockCharacters);
    const heroNode = result.nodes.find((n) => n.id === "hero");
    assertEquals(heroNode?.group, "protagonist");
  });

  await t.step("敵対関係は赤色エッジ", () => {
    const result = builder.build(mockCharacters);
    const enemyEdge = result.edges.find((e) => e.label === "enemy");
    assertEquals(enemyEdge?.color?.color, "#e74c3c");
  });

  await t.step("空配列の場合は空グラフを返す", () => {
    const result = builder.build([]);
    assertEquals(result.nodes.length, 0);
    assertEquals(result.edges.length, 0);
  });
});
```

- [ ] テストを実行して失敗することを確認

---

### Green Phase: 最小実装と成功確認

- [ ] ブリーフィング
- [ ] `src/application/view/graph/character_graph_builder.ts` を作成
  - CharacterGraphBuilderクラスを実装
  - RelationType別のエッジ色マッピングを定義
  - CharacterRole別のノードグループ設定

**実装コード例**:

```typescript
// src/application/view/graph/character_graph_builder.ts
import type { GraphDataBuilder } from "./graph_data_builder.ts";
import type { VisEdge, VisGraphData, VisNode } from "./vis_types.ts";
import type {
  Character,
  RelationType,
} from "@storyteller/types/v2/character.ts";

/** 関係タイプ別のエッジ色 */
const RELATION_COLORS: Record<RelationType, string> = {
  ally: "#27ae60", // 緑
  enemy: "#e74c3c", // 赤
  neutral: "#95a5a6", // グレー
  romantic: "#e91e63", // ピンク
  respect: "#3498db", // 青
  competitive: "#f39c12", // オレンジ
  mentor: "#9b59b6", // 紫
};

/**
 * キャラクター関係グラフビルダー
 */
export class CharacterGraphBuilder
  implements GraphDataBuilder<readonly Character[]> {
  build(characters: readonly Character[]): VisGraphData {
    if (characters.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodes = this.buildNodes(characters);
    const edges = this.buildEdges(characters);

    return {
      nodes,
      edges,
      options: {
        nodes: { shape: "dot", font: { size: 14 } },
        edges: { smooth: { type: "curvedCW" } },
        physics: { stabilization: { iterations: 100 } },
        interaction: { hover: true, tooltipDelay: 200 },
      },
    };
  }

  private buildNodes(characters: readonly Character[]): readonly VisNode[] {
    return characters.map((char) => ({
      id: char.id,
      label: char.name,
      group: char.role,
      title: `${char.name}\n${char.summary}`,
    }));
  }

  private buildEdges(characters: readonly Character[]): readonly VisEdge[] {
    const edgeMap = new Map<string, VisEdge>();

    for (const char of characters) {
      for (
        const [targetId, relationType] of Object.entries(char.relationships)
      ) {
        // 双方向エッジを1つにまとめる（辞書順でキーを作成）
        const key = [char.id, targetId].sort().join("-");

        if (!edgeMap.has(key)) {
          edgeMap.set(key, {
            from: char.id,
            to: targetId,
            label: relationType,
            color: {
              color: RELATION_COLORS[relationType as RelationType] || "#95a5a6",
            },
            width: 2,
          });
        }
      }
    }

    return [...edgeMap.values()];
  }
}
```

- [ ] テストを実行して成功することを確認

---

### Refactor Phase: 品質改善と継続成功確認

- [ ] ブリーフィング
- [ ] 重複エッジのマージロジック改善
- [ ] テストを実行し、継続して成功することを確認

---

## Process 4: TimelineGraphBuilder実装

<!--@process-briefing
category: implementation
tags: [timeline, graph, causality]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
(auto-populated from patterns) **Watch Points**: (auto-populated from
failure_cases)

---

### Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング
- [ ] テストケースを作成
  - `tests/application/view/graph/timeline_graph_builder_test.ts` を作成
  - タイムラインイベント因果関係グラフのテスト
  - causedBy/causesからのエッジ生成テスト

**テストコード例**:

```typescript
// tests/application/view/graph/timeline_graph_builder_test.ts
import { assertEquals, assertExists } from "@std/assert";
import { TimelineGraphBuilder } from "@storyteller/application/view/graph/timeline_graph_builder.ts";
import type {
  Timeline,
  TimelineEvent,
} from "@storyteller/types/v2/timeline.ts";

const mockTimeline: Timeline = {
  id: "main",
  name: "メインストーリー",
  scope: "story",
  summary: "物語の主軸",
  events: [
    {
      id: "event_01",
      title: "王国の滅亡",
      category: "plot_point",
      time: { order: 1 },
      summary: "始まりの事件",
      characters: ["hero"],
      settings: ["kingdom"],
      chapters: ["chapter_01"],
      causes: ["event_02"],
    },
    {
      id: "event_02",
      title: "勇者の旅立ち",
      category: "character_action",
      time: { order: 2 },
      summary: "冒険の開始",
      characters: ["hero"],
      settings: ["village"],
      chapters: ["chapter_02"],
      causedBy: ["event_01"],
      causes: ["event_03"],
    },
    {
      id: "event_03",
      title: "魔王との対決",
      category: "climax",
      time: { order: 3 },
      summary: "最終決戦",
      characters: ["hero", "villain"],
      settings: ["castle"],
      chapters: ["chapter_10"],
      causedBy: ["event_02"],
    },
  ],
};

Deno.test("TimelineGraphBuilder - 因果関係グラフ生成", async (t) => {
  const builder = new TimelineGraphBuilder();

  await t.step("イベントがノードに変換される", () => {
    const result = builder.build([mockTimeline]);
    assertEquals(result.nodes.length, 3);
  });

  await t.step("causes関係から矢印エッジが生成される", () => {
    const result = builder.build([mockTimeline]);
    const edge = result.edges.find((e) =>
      e.from === "event_01" && e.to === "event_02"
    );
    assertExists(edge);
    assertEquals(edge?.arrows, "to");
  });

  await t.step("カテゴリ別にノードの色が設定される", () => {
    const result = builder.build([mockTimeline]);
    const climaxNode = result.nodes.find((n) => n.id === "event_03");
    assertExists(climaxNode?.color?.background);
  });

  await t.step("時系列順にノードが並ぶ（オプション設定）", () => {
    const result = builder.build([mockTimeline]);
    assertExists(result.options);
  });
});
```

- [ ] テストを実行して失敗することを確認

---

### Green Phase: 最小実装と成功確認

- [ ] ブリーフィング
- [ ] `src/application/view/graph/timeline_graph_builder.ts` を作成
  - TimelineGraphBuilderクラスを実装
  - causes/causedByからエッジを生成
  - EventCategory別のノード色マッピング

**実装コード例**:

```typescript
// src/application/view/graph/timeline_graph_builder.ts
import type { GraphDataBuilder } from "./graph_data_builder.ts";
import type { VisEdge, VisGraphData, VisNode } from "./vis_types.ts";
import type {
  EventCategory,
  Timeline,
  TimelineEvent,
} from "@storyteller/types/v2/timeline.ts";

/** イベントカテゴリ別の色 */
const CATEGORY_COLORS: Record<EventCategory, string> = {
  plot_point: "#3498db",
  character_action: "#27ae60",
  world_event: "#9b59b6",
  flashback: "#95a5a6",
  foreshadowing: "#f39c12",
  climax: "#e74c3c",
  resolution: "#1abc9c",
};

/**
 * タイムライン因果関係グラフビルダー
 */
export class TimelineGraphBuilder
  implements GraphDataBuilder<readonly Timeline[]> {
  build(timelines: readonly Timeline[]): VisGraphData {
    const allEvents = timelines.flatMap((t) => t.events);

    if (allEvents.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodes = this.buildNodes(allEvents);
    const edges = this.buildEdges(allEvents);

    return {
      nodes,
      edges,
      options: {
        nodes: { shape: "box", font: { size: 12 } },
        edges: { smooth: { type: "cubicBezier" } },
        physics: { enabled: true },
        interaction: { hover: true },
      },
    };
  }

  private buildNodes(events: readonly TimelineEvent[]): readonly VisNode[] {
    return events.map((event) => ({
      id: event.id,
      label: event.title,
      title: `${event.title}\n${event.summary}\nTime: ${event.time.order}`,
      group: event.category,
      color: {
        background: CATEGORY_COLORS[event.category] || "#95a5a6",
        border: "#2c3e50",
      },
    }));
  }

  private buildEdges(events: readonly TimelineEvent[]): readonly VisEdge[] {
    const edges: VisEdge[] = [];
    const eventIds = new Set(events.map((e) => e.id));

    for (const event of events) {
      // causesから順方向エッジを生成
      if (event.causes) {
        for (const targetId of event.causes) {
          if (eventIds.has(targetId)) {
            edges.push({
              from: event.id,
              to: targetId,
              arrows: "to",
              color: { color: "#34495e" },
              width: 2,
            });
          }
        }
      }
    }

    return edges;
  }
}
```

- [ ] テストを実行して成功することを確認

---

### Refactor Phase: 品質改善と継続成功確認

- [ ] ブリーフィング
- [ ] 循環参照の検出ロジック追加を検討
- [ ] テストを実行し、継続して成功することを確認

---

## Process 5: ForeshadowingGraphBuilder実装

<!--@process-briefing
category: implementation
tags: [foreshadowing, graph, flow]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
(auto-populated from patterns) **Watch Points**: (auto-populated from
failure_cases)

---

### Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング
- [ ] テストケースを作成
  - `tests/application/view/graph/foreshadowing_graph_builder_test.ts` を作成
  - 伏線設置・回収フローグラフのテスト
  - ステータス別のノードスタイルテスト

**テストコード例**:

```typescript
// tests/application/view/graph/foreshadowing_graph_builder_test.ts
import { assertEquals, assertExists } from "@std/assert";
import { ForeshadowingGraphBuilder } from "@storyteller/application/view/graph/foreshadowing_graph_builder.ts";
import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

const mockForeshadowings: readonly Foreshadowing[] = [
  {
    id: "sword",
    name: "古びた剣",
    type: "chekhov",
    summary: "床板の下の剣",
    planting: { chapter: "chapter_01", description: "発見" },
    status: "resolved",
    resolutions: [{
      chapter: "chapter_10",
      description: "使用",
      completeness: 1.0,
    }],
  },
  {
    id: "prophecy",
    name: "予言",
    type: "prophecy",
    summary: "王国の運命",
    planting: { chapter: "chapter_02", description: "告げられる" },
    status: "planted",
    relations: {
      characters: ["hero"],
      settings: [],
      relatedForeshadowings: ["sword"],
    },
  },
];

Deno.test("ForeshadowingGraphBuilder - フローグラフ生成", async (t) => {
  const builder = new ForeshadowingGraphBuilder();

  await t.step("伏線がノードに変換される", () => {
    const result = builder.build(mockForeshadowings);
    assertEquals(result.nodes.length, 2);
  });

  await t.step("ステータス別にノード色が設定される", () => {
    const result = builder.build(mockForeshadowings);
    const resolvedNode = result.nodes.find((n) => n.id === "sword");
    const plantedNode = result.nodes.find((n) => n.id === "prophecy");
    // resolved=緑, planted=オレンジ
    assertEquals(resolvedNode?.color?.background, "#27ae60");
    assertEquals(plantedNode?.color?.background, "#f39c12");
  });

  await t.step("relatedForeshadowingsからエッジが生成される", () => {
    const result = builder.build(mockForeshadowings);
    const edge = result.edges.find((e) =>
      e.from === "prophecy" && e.to === "sword"
    );
    assertExists(edge);
  });

  await t.step("タイプ別にノード形状が設定される", () => {
    const result = builder.build(mockForeshadowings);
    const chekhovNode = result.nodes.find((n) => n.id === "sword");
    const prophecyNode = result.nodes.find((n) => n.id === "prophecy");
    assertEquals(chekhovNode?.shape, "diamond");
    assertEquals(prophecyNode?.shape, "star");
  });
});
```

- [ ] テストを実行して失敗することを確認

---

### Green Phase: 最小実装と成功確認

- [ ] ブリーフィング
- [ ] `src/application/view/graph/foreshadowing_graph_builder.ts` を作成
  - ForeshadowingGraphBuilderクラスを実装
  - ForeshadowingStatus別のノード色マッピング
  - ForeshadowingType別のノード形状マッピング
  - relatedForeshadowingsからエッジを生成

**実装コード例**:

```typescript
// src/application/view/graph/foreshadowing_graph_builder.ts
import type { GraphDataBuilder } from "./graph_data_builder.ts";
import type { VisEdge, VisGraphData, VisNode } from "./vis_types.ts";
import type {
  Foreshadowing,
  ForeshadowingStatus,
  ForeshadowingType,
} from "@storyteller/types/v2/foreshadowing.ts";

/** ステータス別の色 */
const STATUS_COLORS: Record<ForeshadowingStatus, string> = {
  planted: "#f39c12",
  partially_resolved: "#f1c40f",
  resolved: "#27ae60",
  abandoned: "#95a5a6",
};

/** タイプ別の形状 */
const TYPE_SHAPES: Record<ForeshadowingType, VisNode["shape"]> = {
  hint: "dot",
  prophecy: "star",
  mystery: "triangle",
  symbol: "ellipse",
  chekhov: "diamond",
  red_herring: "box",
};

/**
 * 伏線フローグラフビルダー
 */
export class ForeshadowingGraphBuilder
  implements GraphDataBuilder<readonly Foreshadowing[]> {
  build(foreshadowings: readonly Foreshadowing[]): VisGraphData {
    if (foreshadowings.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodes = this.buildNodes(foreshadowings);
    const edges = this.buildEdges(foreshadowings);

    return {
      nodes,
      edges,
      options: {
        nodes: { font: { size: 12 } },
        edges: { smooth: true, dashes: true },
        physics: { enabled: true },
        interaction: { hover: true },
      },
    };
  }

  private buildNodes(
    foreshadowings: readonly Foreshadowing[],
  ): readonly VisNode[] {
    return foreshadowings.map((f) => ({
      id: f.id,
      label: f.name,
      title: `${f.name}\n${f.summary}\nStatus: ${f.status}`,
      shape: TYPE_SHAPES[f.type] || "dot",
      color: {
        background: STATUS_COLORS[f.status],
        border: "#2c3e50",
      },
    }));
  }

  private buildEdges(
    foreshadowings: readonly Foreshadowing[],
  ): readonly VisEdge[] {
    const edges: VisEdge[] = [];
    const fIds = new Set(foreshadowings.map((f) => f.id));

    for (const f of foreshadowings) {
      const related = f.relations?.relatedForeshadowings || [];
      for (const targetId of related) {
        if (fIds.has(targetId)) {
          edges.push({
            from: f.id,
            to: targetId,
            dashes: true,
            color: { color: "#7f8c8d" },
            width: 1,
          });
        }
      }
    }

    return edges;
  }
}
```

- [ ] テストを実行して成功することを確認

---

### Refactor Phase: 品質改善と継続成功確認

- [ ] ブリーフィング
- [ ] コードの品質を改善
- [ ] テストを実行し、継続して成功することを確認

---

## Process 6: HtmlGenerator拡張（グラフセクション）

<!--@process-briefing
category: implementation
tags: [html, integration, vis.js]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
(auto-populated from patterns) **Watch Points**: (auto-populated from
failure_cases)

---

### Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング
- [ ] テストケースを作成
  - `tests/application/view/html_generator_graph_test.ts` を作成
  - グラフセクションがHTMLに含まれることのテスト
  - vis.js CDNリンクが埋め込まれることのテスト

**テストコード例**:

```typescript
// tests/application/view/html_generator_graph_test.ts
import { assertEquals, assertStringIncludes } from "@std/assert";
import { HtmlGenerator } from "@storyteller/application/view/html_generator.ts";
import { VIS_CDN_LINKS } from "@storyteller/application/view/graph/vis_types.ts";
import type { ProjectAnalysis } from "@storyteller/application/types.ts";

const mockAnalysis: ProjectAnalysis = {
  characters: [
    {
      id: "hero",
      name: "勇者",
      role: "protagonist",
      traits: [],
      relationships: { villain: "enemy" },
      appearingChapters: [],
      summary: "主人公",
    },
    {
      id: "villain",
      name: "魔王",
      role: "antagonist",
      traits: [],
      relationships: { hero: "enemy" },
      appearingChapters: [],
      summary: "敵",
    },
  ],
  settings: [],
  timelines: [],
  foreshadowings: [],
  manuscripts: [],
};

Deno.test("HtmlGenerator - グラフ統合", async (t) => {
  const generator = new HtmlGenerator();

  await t.step("vis.js CDNリンクが含まれる", () => {
    const html = generator.generate(mockAnalysis);
    assertStringIncludes(html, VIS_CDN_LINKS.network);
    assertStringIncludes(html, VIS_CDN_LINKS.css);
  });

  await t.step("キャラクター関係グラフセクションが含まれる", () => {
    const html = generator.generate(mockAnalysis);
    assertStringIncludes(html, 'id="character-graph"');
    assertStringIncludes(html, "Character Relationships");
  });

  await t.step("グラフ初期化スクリプトが含まれる", () => {
    const html = generator.generate(mockAnalysis);
    assertStringIncludes(html, "new vis.Network");
  });

  await t.step("グラフデータがJSON形式で埋め込まれる", () => {
    const html = generator.generate(mockAnalysis);
    assertStringIncludes(html, '"nodes"');
    assertStringIncludes(html, '"edges"');
  });
});
```

- [ ] テストを実行して失敗することを確認

---

### Green Phase: 最小実装と成功確認

- [ ] ブリーフィング
- [ ] `src/application/view/html_generator.ts` を拡張
  - VIS_CDN_LINKSをhead内に追加
  - 各グラフビルダーを使用してデータ生成
  - グラフセクションのHTML生成（div + script）
  - vis.Network初期化コードを生成

**修正対象**: `src/application/view/html_generator.ts`

**主な変更点**:

1. import追加:
   - `VIS_CDN_LINKS`
   - `CharacterGraphBuilder`
   - `TimelineGraphBuilder`
   - `ForeshadowingGraphBuilder`

2. `generate`メソッド拡張:
   - グラフセクションを追加
   - vis.js CDNリンクをheadに追加
   - 初期化スクリプトをbody末尾に追加

3. 新規メソッド追加:
   - `renderCharacterGraph(characters): string`
   - `renderTimelineGraph(timelines): string`
   - `renderForeshadowingGraph(foreshadowings): string`
   - `renderGraphScript(): string`

- [ ] テストを実行して成功することを確認

---

### Refactor Phase: 品質改善と継続成功確認

- [ ] ブリーフィング
- [ ] グラフ描画コードの共通化
- [ ] テストを実行し、継続して成功することを確認

---

## Process 7: ConsistencyChecker基盤

<!--@process-briefing
category: implementation
tags: [consistency, validation, foundation]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
(auto-populated from patterns) **Watch Points**: (auto-populated from
failure_cases)

---

### Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング
- [ ] テストケースを作成
  - `tests/application/view/consistency/consistency_checker_test.ts` を作成
  - ConsistencyCheckerインターフェースのテスト
  - ConsistencyIssue型のテスト

**テストコード例**:

```typescript
// tests/application/view/consistency/consistency_checker_test.ts
import { assertEquals, assertExists } from "@std/assert";
import { ConsistencyChecker } from "@storyteller/application/view/consistency/consistency_checker.ts";
import type {
  ConsistencyIssue,
  IssueSeverity,
} from "@storyteller/application/view/consistency/types.ts";
import type { ProjectAnalysis } from "@storyteller/application/types.ts";

const emptyAnalysis: ProjectAnalysis = {
  characters: [],
  settings: [],
  timelines: [],
  foreshadowings: [],
  manuscripts: [],
};

Deno.test("ConsistencyChecker - 基盤", async (t) => {
  await t.step("ConsistencyCheckerクラスが存在する", () => {
    const checker = new ConsistencyChecker();
    assertExists(checker);
  });

  await t.step("checkメソッドがConsistencyIssue配列を返す", () => {
    const checker = new ConsistencyChecker();
    const issues = checker.check(emptyAnalysis);
    assertEquals(Array.isArray(issues), true);
  });

  await t.step("空のデータでは問題が検出されない", () => {
    const checker = new ConsistencyChecker();
    const issues = checker.check(emptyAnalysis);
    assertEquals(issues.length, 0);
  });
});

Deno.test("ConsistencyIssue - 型定義", async (t) => {
  await t.step("ConsistencyIssue型が正しく構成できる", () => {
    const issue: ConsistencyIssue = {
      id: "issue_01",
      type: "orphan_character",
      severity: "warning",
      message: "キャラクター 'hero' は他のキャラクターと関係がありません",
      entityId: "hero",
      entityType: "character",
      suggestion: "関係性を追加してください",
    };
    assertEquals(issue.severity, "warning");
  });
});
```

- [ ] テストを実行して失敗することを確認

---

### Green Phase: 最小実装と成功確認

- [ ] ブリーフィング
- [ ] `src/application/view/consistency/types.ts` を作成
  - ConsistencyIssue型を定義
  - IssueSeverity型（error, warning, info）を定義
  - IssueType型を定義
- [ ] `src/application/view/consistency/consistency_checker.ts` を作成
  - ConsistencyCheckerクラスの基本実装

**実装コード例**:

```typescript
// src/application/view/consistency/types.ts

/** 問題の重大度 */
export type IssueSeverity = "error" | "warning" | "info";

/** 問題の種類 */
export type IssueType =
  | "orphan_character" // 孤立キャラクター
  | "orphan_setting" // 孤立設定
  | "cyclic_causality" // 循環因果
  | "unresolved_foreshadowing" // 未回収伏線
  | "missing_reference" // 参照先不明
  | "timeline_inconsistency" // 時系列矛盾
  | "duplicate_id"; // ID重複

/** 整合性問題 */
export type ConsistencyIssue = {
  readonly id: string;
  readonly type: IssueType;
  readonly severity: IssueSeverity;
  readonly message: string;
  readonly entityId?: string;
  readonly entityType?:
    | "character"
    | "setting"
    | "timeline"
    | "foreshadowing"
    | "event";
  readonly suggestion?: string;
};
```

```typescript
// src/application/view/consistency/consistency_checker.ts
import type { ConsistencyIssue } from "./types.ts";
import type { ProjectAnalysis } from "@storyteller/application/types.ts";

/**
 * 整合性チェッカー
 */
export class ConsistencyChecker {
  private rules: ConsistencyRule[] = [];

  constructor() {
    // ルールは後から追加
  }

  /**
   * ルールを追加する
   */
  addRule(rule: ConsistencyRule): void {
    this.rules.push(rule);
  }

  /**
   * 整合性チェックを実行する
   */
  check(analysis: ProjectAnalysis): readonly ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    for (const rule of this.rules) {
      const ruleIssues = rule.check(analysis);
      issues.push(...ruleIssues);
    }

    return issues;
  }
}

/**
 * 整合性ルールのインターフェース
 */
export interface ConsistencyRule {
  readonly name: string;
  check(analysis: ProjectAnalysis): readonly ConsistencyIssue[];
}
```

- [ ] テストを実行して成功することを確認

---

### Refactor Phase: 品質改善と継続成功確認

- [ ] ブリーフィング
- [ ] コードの品質を改善
- [ ] テストを実行し、継続して成功することを確認

---

## Process 8: 各種整合性ルール実装

<!--@process-briefing
category: implementation
tags: [consistency, rules, validation]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
(auto-populated from patterns) **Watch Points**: (auto-populated from
failure_cases)

---

### Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング
- [ ] テストケースを作成（各ルール別）
  - `tests/application/view/consistency/rules/orphan_character_rule_test.ts`
  - `tests/application/view/consistency/rules/unresolved_foreshadowing_rule_test.ts`
  - `tests/application/view/consistency/rules/cyclic_causality_rule_test.ts`
  - `tests/application/view/consistency/rules/missing_reference_rule_test.ts`

**テストコード例（孤立キャラクター）**:

```typescript
// tests/application/view/consistency/rules/orphan_character_rule_test.ts
import { assertEquals } from "@std/assert";
import { OrphanCharacterRule } from "@storyteller/application/view/consistency/rules/orphan_character_rule.ts";
import type { ProjectAnalysis } from "@storyteller/application/types.ts";

Deno.test("OrphanCharacterRule - 孤立キャラクター検出", async (t) => {
  const rule = new OrphanCharacterRule();

  await t.step("関係のないキャラクターを検出する", () => {
    const analysis: ProjectAnalysis = {
      characters: [
        {
          id: "hero",
          name: "勇者",
          role: "protagonist",
          traits: [],
          relationships: {},
          appearingChapters: [],
          summary: "",
        },
        {
          id: "villain",
          name: "魔王",
          role: "antagonist",
          traits: [],
          relationships: { hero: "enemy" },
          appearingChapters: [],
          summary: "",
        },
      ],
      settings: [],
      timelines: [],
      foreshadowings: [],
      manuscripts: [],
    };
    const issues = rule.check(analysis);
    assertEquals(issues.length, 1);
    assertEquals(issues[0].entityId, "hero");
  });

  await t.step("全員に関係がある場合は問題なし", () => {
    const analysis: ProjectAnalysis = {
      characters: [
        {
          id: "hero",
          name: "勇者",
          role: "protagonist",
          traits: [],
          relationships: { villain: "enemy" },
          appearingChapters: [],
          summary: "",
        },
        {
          id: "villain",
          name: "魔王",
          role: "antagonist",
          traits: [],
          relationships: { hero: "enemy" },
          appearingChapters: [],
          summary: "",
        },
      ],
      settings: [],
      timelines: [],
      foreshadowings: [],
      manuscripts: [],
    };
    const issues = rule.check(analysis);
    assertEquals(issues.length, 0);
  });
});
```

- [ ] テストを実行して失敗することを確認

---

### Green Phase: 最小実装と成功確認

- [ ] ブリーフィング
- [ ] 各ルールを実装
  - `src/application/view/consistency/rules/orphan_character_rule.ts`
  - `src/application/view/consistency/rules/unresolved_foreshadowing_rule.ts`
  - `src/application/view/consistency/rules/cyclic_causality_rule.ts`
  - `src/application/view/consistency/rules/missing_reference_rule.ts`

**各ルールの検出内容**:

| ルール                      | 検出内容                                        | 重大度  |
| --------------------------- | ----------------------------------------------- | ------- |
| OrphanCharacterRule         | 他キャラとの関係がないキャラクター              | warning |
| UnresolvedForeshadowingRule | status=planted で plannedResolutionChapter 超過 | warning |
| CyclicCausalityRule         | causedBy/causes の循環参照                      | error   |
| MissingReferenceRule        | 存在しないID参照                                | error   |

- [ ] テストを実行して成功することを確認

---

### Refactor Phase: 品質改善と継続成功確認

- [ ] ブリーフィング
- [ ] ルール間の共通処理を抽出
- [ ] テストを実行し、継続して成功することを確認

---

## Process 9: HTML整合性表示統合

<!--@process-briefing
category: implementation
tags: [html, consistency, display]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
(auto-populated from patterns) **Watch Points**: (auto-populated from
failure_cases)

---

### Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング
- [ ] テストケースを作成
  - `tests/application/view/html_generator_consistency_test.ts` を作成
  - 整合性チェック結果がHTMLに表示されることのテスト

**テストコード例**:

```typescript
// tests/application/view/html_generator_consistency_test.ts
import { assertNotMatch, assertStringIncludes } from "@std/assert";
import { HtmlGenerator } from "@storyteller/application/view/html_generator.ts";
import type { ProjectAnalysis } from "@storyteller/application/types.ts";

Deno.test("HtmlGenerator - 整合性表示", async (t) => {
  const generator = new HtmlGenerator();

  await t.step("整合性セクションが含まれる", () => {
    const analysis: ProjectAnalysis = {
      characters: [
        {
          id: "hero",
          name: "勇者",
          role: "protagonist",
          traits: [],
          relationships: {},
          appearingChapters: [],
          summary: "",
        },
      ],
      settings: [],
      timelines: [],
      foreshadowings: [],
      manuscripts: [],
    };
    const html = generator.generate(analysis);
    assertStringIncludes(html, "Consistency Check");
  });

  await t.step("警告がある場合は警告アイコンが表示される", () => {
    const analysis: ProjectAnalysis = {
      characters: [
        {
          id: "hero",
          name: "勇者",
          role: "protagonist",
          traits: [],
          relationships: {},
          appearingChapters: [],
          summary: "",
        },
      ],
      settings: [],
      timelines: [],
      foreshadowings: [],
      manuscripts: [],
    };
    const html = generator.generate(analysis);
    assertStringIncludes(html, "warning");
  });

  await t.step("問題がない場合は成功メッセージが表示される", () => {
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [],
      foreshadowings: [],
      manuscripts: [],
    };
    const html = generator.generate(analysis);
    assertStringIncludes(html, "No issues found");
  });
});
```

- [ ] テストを実行して失敗することを確認

---

### Green Phase: 最小実装と成功確認

- [ ] ブリーフィング
- [ ] `src/application/view/html_generator.ts` を拡張
  - ConsistencyCheckerを使用
  - 整合性結果セクションを生成
  - 問題の重大度別にスタイリング

**新規メソッド追加**:

- `renderConsistencySection(analysis: ProjectAnalysis): string`
- `renderIssue(issue: ConsistencyIssue): string`

**表示要素**:

- サマリー（エラー数、警告数、情報数）
- 問題リスト（重大度別アイコン、メッセージ、提案）
- 問題なしの場合のメッセージ

- [ ] テストを実行して成功することを確認

---

### Refactor Phase: 品質改善と継続成功確認

- [ ] ブリーフィング
- [ ] コードの品質を改善
- [ ] テストを実行し、継続して成功することを確認

---

## Process 10: 統合テスト

<!--@process-briefing
category: testing
tags: [integration, e2e]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
(auto-populated from patterns) **Watch Points**: (auto-populated from
failure_cases)

---

### Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング
- [ ] 統合テストケースを作成
  - `tests/application/view/html_generator_integration_test.ts` を作成
  - 全機能を含む完全なHTMLの生成テスト
  - サンプルプロジェクト（cinderella）を使用したE2Eテスト

**テストコード例**:

```typescript
// tests/application/view/html_generator_integration_test.ts
import { assertEquals, assertStringIncludes } from "@std/assert";
import { HtmlGenerator } from "@storyteller/application/view/html_generator.ts";
import type { ProjectAnalysis } from "@storyteller/application/types.ts";

// 完全なテストデータ
const fullAnalysis: ProjectAnalysis = {
  characters: [
    {
      id: "cinderella",
      name: "シンデレラ",
      role: "protagonist",
      traits: ["優しい", "勤勉"],
      relationships: { prince: "romantic", stepmother: "enemy" },
      appearingChapters: ["chapter_01", "chapter_02"],
      summary: "主人公の少女",
    },
    {
      id: "prince",
      name: "王子",
      role: "supporting",
      traits: ["高貴"],
      relationships: { cinderella: "romantic" },
      appearingChapters: ["chapter_02"],
      summary: "王国の王子",
    },
  ],
  settings: [
    { id: "castle", name: "城", type: "location", summary: "王国の城" },
  ],
  timelines: [
    {
      id: "main",
      name: "メインストーリー",
      scope: "story",
      summary: "物語の流れ",
      events: [
        {
          id: "ball",
          title: "舞踏会",
          category: "plot_point",
          time: { order: 1 },
          summary: "王子との出会い",
          characters: ["cinderella", "prince"],
          settings: ["castle"],
          chapters: ["chapter_02"],
          causes: ["glass_slipper"],
        },
        {
          id: "glass_slipper",
          title: "ガラスの靴",
          category: "foreshadowing",
          time: { order: 2 },
          summary: "残されたガラスの靴",
          characters: ["cinderella"],
          settings: ["castle"],
          chapters: ["chapter_02"],
          causedBy: ["ball"],
        },
      ],
    },
  ],
  foreshadowings: [
    {
      id: "magic",
      name: "魔法の力",
      type: "hint",
      summary: "妖精の力",
      planting: { chapter: "chapter_01", description: "妖精の登場" },
      status: "resolved",
      resolutions: [{
        chapter: "chapter_02",
        description: "変身",
        completeness: 1.0,
      }],
    },
  ],
  manuscripts: [
    {
      path: "manuscripts/chapter_01.md",
      title: "第1章",
      characters: ["cinderella"],
    },
  ],
};

Deno.test("HtmlGenerator - 統合テスト", async (t) => {
  const generator = new HtmlGenerator();

  await t.step("完全なHTMLが生成される", () => {
    const html = generator.generate(fullAnalysis);

    // 基本構造
    assertStringIncludes(html, "<!DOCTYPE html>");
    assertStringIncludes(html, '<html lang="ja">');

    // vis.js
    assertStringIncludes(html, "vis-network");

    // グラフセクション
    assertStringIncludes(html, "character-graph");
    assertStringIncludes(html, "timeline-graph");
    assertStringIncludes(html, "foreshadowing-graph");

    // 整合性セクション
    assertStringIncludes(html, "Consistency Check");

    // データが埋め込まれている
    assertStringIncludes(html, "シンデレラ");
    assertStringIncludes(html, "王子");
  });

  await t.step("ブラウザで開けるスタンドアロンHTML", () => {
    const html = generator.generate(fullAnalysis);

    // CSSが埋め込まれている
    assertStringIncludes(html, "<style>");

    // 外部依存はCDNのみ
    const cdnPattern = /https:\/\/unpkg\.com/g;
    const matches = html.match(cdnPattern) || [];
    assertEquals(matches.length >= 2, true); // network + css
  });
});
```

- [ ] テストを実行して失敗することを確認

---

### Green Phase: 最小実装と成功確認

- [ ] ブリーフィング
- [ ] 必要に応じて追加修正
- [ ] テストを実行して成功することを確認

---

### Refactor Phase: 品質改善と継続成功確認

- [ ] ブリーフィング
- [ ] 全テストを実行
- [ ] `deno lint` と `deno fmt --check` の実行

---

## Process 50: フォローアップ

<!--@process-briefing
category: followup
tags: []
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
(auto-populated from patterns) **Watch Points**: (auto-populated from
failure_cases)

---

実装後に仕様変更などが発生した場合は、ここにProcessを追加する

---

## Process 100: リファクタリング・品質向上

<!--@process-briefing
category: quality
tags: [refactoring, optimization]
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
(auto-populated from patterns) **Watch Points**: (auto-populated from
failure_cases)

---

### Red Phase: 品質改善テスト追加

- [ ] ブリーフィング
- [ ] パフォーマンステスト追加（大規模データ）
- [ ] エッジケーステスト追加

---

### Green Phase: リファクタリング実施

- [ ] ブリーフィング
- [ ] グラフビルダー間の共通処理抽出
- [ ] 整合性ルールの設計改善
- [ ] HTML生成コードの整理

---

### Refactor Phase: 最終確認

- [ ] ブリーフィング
- [ ] 全テスト通過確認
- [ ] lint/fmt確認

---

## Process 200: ドキュメンテーション

<!--@process-briefing
category: documentation
tags: []
-->

### Briefing (auto-generated)

**Related Lessons**: (auto-populated from stigmergy) **Known Patterns**:
(auto-populated from patterns) **Watch Points**: (auto-populated from
failure_cases)

---

### Red Phase: ドキュメント設計

- [ ] ブリーフィング
- [ ] 文書化対象を特定
  - README.md更新
  - docs/ui-guide.md更新
  - CLAUDE.md更新
- [ ] ドキュメント構成を作成

---

### Green Phase: ドキュメント記述

- [ ] README.mdにグラフ可視化機能を追記
- [ ] docs/ui-guide.mdにグラフ操作方法を追記
- [ ] CLAUDE.mdに実装済み機能として記載
- [ ] コード例を追加

---

### Refactor Phase: 品質確認

- [ ] 一貫性チェック
- [ ] リンク検証
- [ ] 最終レビュー

---

## Process 300: OODAフィードバックループ（教訓・知見の保存）

<!--@process-briefing
category: ooda_feedback
tags: []
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

---

### Green Phase: 教訓・知見の永続化

**Decide（決心）**

- [ ] ブリーフィング
- [ ] 保存すべき教訓・知見を選定
- [ ] 各項目の保存先を決定
  - Serena Memory: 組織的な知見
  - stigmergy/lessons: プロジェクト固有の教訓
  - stigmergy/code-insights: コードパターン・実装知見

**Act（行動）**

- [ ] ブリーフィング
- [ ] serena-v4のmcp__serena__write_memoryで教訓を永続化
- [ ] コードに関する知見をMarkdownで記録
- [ ] 関連するコード箇所にコメントを追加（必要に応じて）

---

### Refactor Phase: フィードバック品質改善

**Feedback Loop**

- [ ] ブリーフィング
- [ ] 保存した教訓の品質を検証
  - 再現可能性: 他のプロジェクトで適用可能か
  - 明確性: 内容が明確で理解しやすいか
  - 実用性: 実際に役立つ情報か
- [ ] 重複・矛盾する教訓を統合・整理
- [ ] メタ学習: OODAプロセス自体の改善点を記録

**Cross-Feedback**

- [ ] ブリーフィング
- [ ] 他のProcess（100, 200）との連携を確認
- [ ] 将来のミッションへの引き継ぎ事項を整理

---

# Management

## Blockers

| ID | Description        | Status | Resolution |
| -- | ------------------ | ------ | ---------- |
| -  | 現在ブロッカーなし | -      | -          |

## Lessons

| ID | Insight                                           | Severity | Applied |
| -- | ------------------------------------------------- | -------- | ------- |
| L1 | vis.jsはCDN経由で読み込むことでビルド複雑化を回避 | medium   | -       |
| L2 | グラフビルダーは抽象インターフェースで統一        | high     | -       |

## Feedback Log

| Date | Type | Content | Status |
| ---- | ---- | ------- | ------ |
| -    | -    | -       | -      |

## Completion Checklist

- [ ] すべてのProcess完了
- [ ] すべてのテスト合格
- [ ] コードレビュー完了
- [ ] ドキュメント更新完了
- [ ] マージ可能な状態

---

<!--
Process番号規則
- 1-9: 機能実装
- 10-49: テスト拡充
- 50-99: フォローアップ
- 100-199: 品質向上（リファクタリング）
- 200-299: ドキュメンテーション
- 300+: OODAフィードバックループ（教訓・知見保存）
-->
