# Plot Management

## 概要

Plotは、複数の物語ラインを並列管理し、その交点（intersection）を通じて物語の絡み合いを表現する機能です。

## Timeline vs Plot

| 観点     | Timeline                    | Plot                                            |
| -------- | --------------------------- | -------------------------------------------------- |
| 管理対象 | 「いつ」（時系列）          | 「何」「どのように」（展開構造）                   |
| 単位     | Event（出来事）             | Beat（物語ビート）                                 |
| 関係性   | 因果関係（causes/causedBy） | 交差（intersection）                               |
| 構造     | 順序（order）               | 物語構造（setup/rising/climax/falling/resolution） |

## 型定義

### Plot

```typescript
export type Plot = {
  id: string;
  name: string;
  type: "main" | "sub" | "parallel" | "background";
  status: "active" | "completed";
  summary: string;
  beats: PlotBeat[];
  focusCharacters?: Record<string, "primary" | "secondary">;
  intersections?: PlotIntersection[];
  importance?: "major" | "minor";
  parentPlotId?: string;
  displayNames?: string[];
  details?: PlotDetails;
  relations?: PlotRelations;
};
```

### PlotType

| タイプ       | 説明                                           |
| ------------ | ---------------------------------------------- |
| `main`       | メインプロット（物語の中心軸）                 |
| `sub`        | plot/sub（メインを補完する副次プロット）       |
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
  sourcePlotId: string;
  sourceBeatId: string;
  targetPlotId: string;
  targetBeatId: string;
  summary: string;
  influenceDirection: "forward" | "backward" | "mutual";
  influenceLevel?: "high" | "medium" | "low";
};
```

## CLI使用例

### plot/sub 作成

```bash
storyteller element plot --name "シンデレラの成長" --type main --summary "虐げられた娘から王妃への成長"
storyteller element plot --name "王子の花嫁探し" --type sub --summary "王子が真の花嫁を探す旅"
```

### ビート追加

```bash
storyteller element beat --plot cinderella_growth --title "召使いとしての日常" --summary "継母と姉たちに虐げられる" --structure-position setup --chapter chapter_01
storyteller element beat --plot cinderella_growth --title "舞踏会への招待" --summary "舞踏会の知らせが届く" --structure-position rising
```

### インターセクション作成

```bash
storyteller element intersection \
  --source-plot cinderella_growth \
  --source-beat growth_beat_001 \
  --target-plot prince_search \
  --target-beat search_beat_001 \
  --summary "シンデレラの召使いとしての姿と王子の花嫁探しが交差" \
  --influence-direction forward
```

### 表示

```bash
storyteller view plot --list
storyteller view plot --id cinderella_growth
storyteller view plot --list --type main
storyteller view plot --list --status active
storyteller view plot --list --format mermaid
storyteller view plot --list --json
```

## MCPツール

| ツール                | 説明                                   |
| --------------------- | -------------------------------------- |
| `plot_create`      | plot/sub 作成                          |
| `plot_view`        | plot/sub 表示（一覧/個別/フィルタ）    |
| `beat_create`         | ビート作成                             |
| `intersection_create` | インターセクション作成                 |

## MCPリソース

- `storyteller://plots` - plot/sub 一覧
- `storyteller://plot/{id}` - 特定の plot/sub

## MCPプロンプト

- `plot_brainstorm` - plot/sub のブレインストーミング
- `plot_intersection_suggest` - インターセクションの提案
- `plot_completion_review` - plot/sub 完了の振り返り

## HTML可視化

`storyteller view browser`でPlotGraphBuilderによる構造グラフが表示されます。

- ノード: plot（box型）、beat（structurePosition別のshape）
- エッジ: plot→beat、preconditionBeatIds（実線）、intersection（点線）
- 色分け: type別（main=赤、sub=青、parallel=緑、background=グレー）

## 設計パターン

### Foreshadowingとの使い分け

- **Foreshadowing**: 物語の「点」（伏線の設置と回収）
- **Plot**: 物語の「線」（並行する物語ラインの進行）

両者は独立して機能し、`relations`フィールドで相互参照可能です。

### オプショナル動作

`src/plots/`ディレクトリが存在しないプロジェクトでは、検証は自動的にスキップされます。既存プロジェクトへの影響はありません。

### 循環参照検出

validatorが`preconditionBeatIds`の循環参照をDFSで検出します。ビート間の依存関係に循環がある場合、エラーとして報告されます。
