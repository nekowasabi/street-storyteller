# Subplot Management

## 概要

Subplotは、複数の物語ラインを並列管理し、その交点（intersection）を通じて物語の絡み合いを表現する機能です。

## Timeline vs Subplot

| 観点     | Timeline                    | Subplot                                            |
| -------- | --------------------------- | -------------------------------------------------- |
| 管理対象 | 「いつ」（時系列）          | 「何」「どのように」（展開構造）                   |
| 単位     | Event（出来事）             | Beat（物語ビート）                                 |
| 関係性   | 因果関係（causes/causedBy） | 交差（intersection）                               |
| 構造     | 順序（order）               | 物語構造（setup/rising/climax/falling/resolution） |

## 型定義

### Subplot

```typescript
export type Subplot = {
  id: string;
  name: string;
  type: "main" | "subplot" | "parallel" | "background";
  status: "active" | "completed";
  summary: string;
  beats: PlotBeat[];
  focusCharacters?: Record<string, "primary" | "secondary">;
  intersections?: PlotIntersection[];
  importance?: "major" | "minor";
  parentSubplotId?: string;
  displayNames?: string[];
  details?: SubplotDetails;
  relations?: SubplotRelations;
};
```

### SubplotType

| タイプ       | 説明                                           |
| ------------ | ---------------------------------------------- |
| `main`       | メインプロット（物語の中心軸）                 |
| `subplot`    | サブプロット（メインを補完する副次プロット）   |
| `parallel`   | 並行プロット（独立して進行するプロットライン） |
| `background` | 背景プロット（世界観を構成する背景の動き）     |

### PlotBeat

```typescript
export type PlotBeat = {
  id: string;
  title: string;
  summary: string;
  structurePosition: "setup" | "rising" | "climax" | "falling" | "resolution";
  chapter?: string;
  characters?: string[];
  settings?: string[];
  timelineEventId?: string;
  preconditionBeatIds?: string[];
};
```

### PlotIntersection

```typescript
export type PlotIntersection = {
  id: string;
  sourceSubplotId: string;
  sourceBeatId: string;
  targetSubplotId: string;
  targetBeatId: string;
  summary: string;
  influenceDirection: "forward" | "backward" | "mutual";
  influenceLevel?: "high" | "medium" | "low";
};
```

## CLI使用例

### サブプロット作成

```bash
storyteller element subplot --name "シンデレラの成長" --type main --summary "虐げられた娘から王妃への成長"
storyteller element subplot --name "王子の花嫁探し" --type subplot --summary "王子が真の花嫁を探す旅"
```

### ビート追加

```bash
storyteller element beat --subplot cinderella_growth --title "召使いとしての日常" --summary "継母と姉たちに虐げられる" --structure-position setup --chapter chapter_01
storyteller element beat --subplot cinderella_growth --title "舞踏会への招待" --summary "舞踏会の知らせが届く" --structure-position rising
```

### インターセクション作成

```bash
storyteller element intersection \
  --source-subplot cinderella_growth \
  --source-beat growth_beat_001 \
  --target-subplot prince_search \
  --target-beat search_beat_001 \
  --summary "シンデレラの召使いとしての姿と王子の花嫁探しが交差" \
  --influence-direction forward
```

### 表示

```bash
storyteller view subplot --list
storyteller view subplot --id cinderella_growth
storyteller view subplot --list --type main
storyteller view subplot --list --status active
storyteller view subplot --list --format mermaid
storyteller view subplot --list --json
```

## MCPツール

| ツール                | 説明                                   |
| --------------------- | -------------------------------------- |
| `subplot_create`      | サブプロット作成                       |
| `subplot_view`        | サブプロット表示（一覧/個別/フィルタ） |
| `beat_create`         | ビート作成                             |
| `intersection_create` | インターセクション作成                 |

## MCPリソース

- `storyteller://subplots` - サブプロット一覧
- `storyteller://subplot/{id}` - 特定のサブプロット

## MCPプロンプト

- `subplot_brainstorm` - サブプロットのブレインストーミング
- `subplot_intersection_suggest` - インターセクションの提案
- `subplot_completion_review` - サブプロット完了の振り返り

## HTML可視化

`storyteller view browser`でSubplotGraphBuilderによる構造グラフが表示されます。

- ノード: subplot（box型）、beat（structurePosition別のshape）
- エッジ: subplot→beat、preconditionBeatIds（実線）、intersection（点線）
- 色分け: type別（main=赤、subplot=青、parallel=緑、background=グレー）

## 設計パターン

### Foreshadowingとの使い分け

- **Foreshadowing**: 物語の「点」（伏線の設置と回収）
- **Subplot**: 物語の「線」（並行する物語ラインの進行）

両者は独立して機能し、`relations`フィールドで相互参照可能です。

### オプショナル動作

`src/subplots/`ディレクトリが存在しないプロジェクトでは、検証は自動的にスキップされます。既存プロジェクトへの影響はありません。

### 循環参照検出

validatorが`preconditionBeatIds`の循環参照をDFSで検出します。ビート間の依存関係に循環がある場合、エラーとして報告されます。
