# storyteller HTML可視化機能拡張計画

## 概要

物語要素（キャラクター、タイムライン、伏線）の関係性をグラフで可視化する機能を追加する。
**アプローチ: C（データ充実とグラフ実装を並行して進める）**

---

## 背景

### 参照記事の要点

- note.com/wednes12: ストーリーの伏線・構造をホワイトボード上で可視化
- kiryu-haya.site: Obsidian Advanced Canvasでノード・エッジ型の関係図示

### 現状分析結果

- **型定義**: 完備（relationships, causedBy/causes, resolutions）
- **サンプルデータ**: 関係性フィールドが空（エッジ生成不可）
- **既存機能**: `storyteller view browser`でカード表示、Mermaidタイムライン出力

---

## 実装計画

### Phase 1: 基盤整備（並行作業）

#### 1A. グラフ型定義・ユーティリティ

```
src/application/view/graph/
├── mod.ts                 # エクスポート
├── types.ts               # GraphNode, GraphEdge, GraphData型
└── render_utils.ts        # vis.js用HTML/JS生成
```

**types.ts 主要型**:

```typescript
export type GraphNode = {
  id: string;
  label: string;
  group?: string;
  color?: string;
  shape?: "ellipse" | "box" | "diamond";
};

export type GraphEdge = {
  from: string;
  to: string;
  label?: string;
  arrows?: "to" | "from" | "both";
  color?: string;
  dashes?: boolean;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};
```

#### 1B. サンプルデータ充実（cinderella）

```
samples/cinderella/src/characters/
├── cinderella.ts   # relationships追加
├── prince.ts       # relationships追加
├── stepmother.ts   # relationships追加
└── fairy_godmother.ts  # relationships追加
```

**追加データ例（cinderella.ts）**:

```typescript
relationships: {
  "stepmother": "enemy",
  "stepsister_1": "enemy",
  "stepsister_2": "enemy",
  "fairy_godmother": "ally",
  "prince": "romantic"
}
```

---

### Phase 2: キャラクター関係グラフ

#### 2A. グラフ生成ロジック

```
src/application/view/graph/
└── character_graph.ts     # キャラクター→GraphData変換
```

**主要関数**:

```typescript
export function generateCharacterGraph(
  characters: CharacterSummary[],
): GraphData;
```

**エッジ色マッピング**:

| RelationType | 色                 | 線種 |
| ------------ | ------------------ | ---- |
| ally         | #4CAF50 (緑)       | 実線 |
| enemy        | #f44336 (赤)       | 破線 |
| romantic     | #E91E63 (ピンク)   | 実線 |
| mentor       | #2196F3 (青)       | 実線 |
| competitive  | #FF9800 (オレンジ) | 破線 |

#### 2B. HtmlGenerator拡張

```
src/application/view/html_generator.ts  # 既存ファイル拡張
```

**追加メソッド**:

- `renderCharacterGraph()`: グラフHTML生成
- vis.js CDN読み込み追加

---

### Phase 3: タイムライン因果図

#### 3A. サンプルデータ充実（momotaro）

```
samples/momotaro/src/timelines/main_story.ts
```

**追加データ例**:

```typescript
{
  id: "event_battle",
  causedBy: ["event_departure", "event_meet_dog", "event_meet_monkey"],
  causes: ["event_victory"]
}
```

#### 3B. グラフ生成ロジック

```
src/application/view/graph/
└── timeline_graph.ts      # Timeline→GraphData変換
```

---

### Phase 4: 伏線フロー図

#### 4A. サンプルデータ充実

```
samples/cinderella/src/foreshadowings/  # 新規作成
└── glass_slipper.ts
```

**追加データ**:

```typescript
{
  id: "glass_slipper",
  status: "resolved",
  planting: { chapter: "chapter_02", description: "ガラスの靴を履く" },
  resolutions: [{
    chapter: "chapter_05",
    description: "王子がガラスの靴で探す",
    completeness: 1.0
  }]
}
```

#### 4B. グラフ生成ロジック

```
src/application/view/graph/
└── foreshadowing_graph.ts # Foreshadowing→GraphData変換
```

---

### Phase 5: 関係性整合性チェック（ハイブリッド方式）

#### 5A. 厳密チェック（プログラム的検出）

```
src/application/validation/
├── mod.ts                          # エクスポート
├── relationship_validator.ts       # キャラクター関係検証
├── causality_validator.ts          # タイムライン因果検証
└── foreshadowing_validator.ts      # 伏線整合性検証
```

**relationship_validator.ts 検出項目**:

| 検出項目       | 説明                                   | 重要度  |
| -------------- | -------------------------------------- | ------- |
| 双方向関係欠落 | A→Bがあるが、B→Aがない                 | warning |
| 孤立ノード     | 関係が一切定義されていないキャラクター | info    |
| 無効ID参照     | 存在しないキャラクターIDへの参照       | error   |
| 関係タイプ矛盾 | A→B: ally, B→A: enemy                  | warning |

**causality_validator.ts 検出項目**:

| 検出項目         | 説明                             | 重要度 |
| ---------------- | -------------------------------- | ------ |
| 因果循環         | event_a → event_b → event_a      | error  |
| 時系列矛盾       | 原因イベントより結果イベントが先 | error  |
| 孤立イベント     | causedBy/causesが両方空          | info   |
| 無効イベント参照 | 存在しないイベントIDへの参照     | error  |

**foreshadowing_validator.ts 検出項目**:

| 検出項目           | 説明                                | 重要度  |
| ------------------ | ----------------------------------- | ------- |
| 未回収伏線         | status=planted で長期放置           | warning |
| 回収後status不整合 | resolutionsありなのにstatus=planted | warning |
| 完了度不正         | completeness > 1.0 または < 0.0     | error   |

**CLIコマンド**:

```bash
# 関係性検証
storyteller validate relationships
storyteller validate relationships --fix  # 自動修正提案出力

# タイムライン因果検証
storyteller validate causality

# 伏線整合性検証
storyteller validate foreshadowings

# 全検証
storyteller validate all
```

**LSP統合**: 診断ソースとして統合（リアルタイム警告）

#### 5B. 曖昧チェック（MCP + LLM分析）

```
src/mcp/prompts/definitions/
└── relationship_analysis.ts     # 関係性分析プロンプト
```

**MCPプロンプト: `relationship_analysis`**:

```typescript
export const relationshipAnalysisPrompt: McpPromptDefinition = {
  name: "relationship_analysis",
  description: "キャラクター関係の不整合・欠落を自然言語で分析",
  arguments: [
    {
      name: "focus",
      required: false,
      description: "character/timeline/foreshadowing/all",
    },
  ],
};
```

**LLMが検出できる曖昧なケース**:

- 物語上重要だが未定義の関係（主人公-敵対者など）
- 関係タイプの妥当性（物語コンテキストに基づく判断）
- 設定との整合性（敵対キャラが同じ設定に出現など）
- 伏線の回収タイミングの妥当性

**MCPプロンプト: `causality_analysis`**（既存拡張）:

- 因果関係の論理的妥当性
- イベント間の時間的整合性
- 欠落している中間イベントの提案

---

### Phase 6: UI統合・仕上げ

#### 6A. タブUI追加

- Overview / Relationships / Timelines / Foreshadowings タブ切替
- タブ選択でグラフ表示エリア切替

#### 6B. CLIオプション

```bash
storyteller view browser --graph          # グラフ表示有効化
storyteller view browser --graph-only     # グラフのみ
```

#### 6C. テスト・ドキュメント

- `tests/application/view/graph/` にユニットテスト追加
- `tests/application/validation/` に検証テスト追加
- `docs/visualization.md` ドキュメント作成
- `docs/validation.md` 検証機能ドキュメント

---

## 技術仕様

### vis.js統合

```html
<script
  src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"
></script>
```

### グラフレイアウトオプション

```typescript
const options = {
  layout: { improvedLayout: true },
  physics: { enabled: false }, // 静的グラフ
  interaction: { hover: true, tooltipDelay: 200 },
};
```

---

## 主要ファイル一覧

### 新規作成

| ファイル                                                | 内容                       |
| ------------------------------------------------------- | -------------------------- |
| `src/application/view/graph/mod.ts`                     | モジュールエクスポート     |
| `src/application/view/graph/types.ts`                   | グラフ型定義               |
| `src/application/view/graph/render_utils.ts`            | vis.js HTML生成            |
| `src/application/view/graph/character_graph.ts`         | キャラクターグラフ         |
| `src/application/view/graph/timeline_graph.ts`          | タイムライングラフ         |
| `src/application/view/graph/foreshadowing_graph.ts`     | 伏線グラフ                 |
| `src/application/validation/mod.ts`                     | 検証モジュールエクスポート |
| `src/application/validation/relationship_validator.ts`  | 関係性検証                 |
| `src/application/validation/causality_validator.ts`     | 因果関係検証               |
| `src/application/validation/foreshadowing_validator.ts` | 伏線検証                   |
| `src/mcp/prompts/definitions/relationship_analysis.ts`  | 関係性分析MCPプロンプト    |

### 修正

| ファイル                                 | 変更内容                  |
| ---------------------------------------- | ------------------------- |
| `src/application/view/html_generator.ts` | グラフ描画統合            |
| `src/cli/command_registry.ts`            | validate サブコマンド追加 |
| `src/mcp/prompts/prompt_registry.ts`     | relationship_analysis登録 |
| `samples/cinderella/src/characters/*.ts` | relationships追加         |
| `samples/momotaro/src/timelines/*.ts`    | causedBy/causes追加       |

---

## 検証方法

### 1. サンプルデータ確認

```bash
# cinderellaプロジェクトでキャラクター一覧
cd samples/cinderella
storyteller view character --list --json | jq '.characters[].relationships'
```

### 2. グラフHTML生成

```bash
storyteller view browser --graph
# ブラウザで開いてグラフ表示確認
```

### 3. 整合性チェック（厳密）

```bash
# 関係性検証
storyteller validate relationships
# 期待: 双方向欠落、孤立ノードの警告が表示される

# 因果関係検証
storyteller validate causality

# 全検証
storyteller validate all
```

### 4. 整合性チェック（曖昧 - MCP経由）

```
Claude Desktopで relationship_analysis プロンプトを実行
期待: 物語コンテキストに基づいた欠落関係の提案
```

### 5. テスト実行

```bash
deno test tests/application/view/graph/
deno test tests/application/validation/
```

---

## 作業順序（並行作業）

```
Week 1:
├─ [Track A] グラフ基盤実装
│   ├─ types.ts
│   ├─ render_utils.ts
│   └─ character_graph.ts
│
└─ [Track B] データ充実
    ├─ cinderella relationships
    └─ momotaro causedBy/causes

Week 2:
├─ HtmlGenerator統合
├─ timeline_graph.ts
├─ foreshadowing_graph.ts
├─ 整合性チェック（厳密）実装
│   ├─ relationship_validator.ts
│   ├─ causality_validator.ts
│   └─ foreshadowing_validator.ts
├─ MCPプロンプト（曖昧チェック）追加
│   └─ relationship_analysis.ts
└─ UI/テスト/ドキュメント
```

---

## 成功基準

1. `storyteller view browser --graph` でグラフ付きHTML生成
2. キャラクター関係、タイムライン因果、伏線フローの3種グラフ表示
3. `storyteller validate all` で整合性チェック実行可能
4. `relationship_analysis` MCPプロンプトで曖昧な問題を検出可能
5. サンプルプロジェクト（cinderella, momotaro）で動作確認
6. 全テストパス
