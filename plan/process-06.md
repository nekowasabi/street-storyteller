# Process 6: CLI view subplot

## Overview
storyteller view subplot コマンドを実装。一覧/個別/Mermaid/JSON 出力をサポート。

## Affected Files
- **新規**: src/cli/modules/view/subplot.ts (~350行目安)
- **修正**: src/cli/modules/view/index.ts (該当 view 系 index ファイル) に descriptor 登録
- **参考**: src/cli/modules/view/foreshadowing.ts (348行) を全面コピー

## Implementation Notes
- クラス名: `ViewSubplotCommand`
- 引数: `--list`, `--id`, `--type` (フィルタ), `--status` (フィルタ), `--format` (text|mermaid|json), `--json`
- メソッド:
  - `loadSubplots(subplotsDir)`: src/subplots/*.ts を全読込
  - `parseSubplotFromFile(content)`: Process 09 のパーサー利用
  - `formatSubplotList(subplots)`: テーブル形式
  - `formatSubplotDetail(subplot)`: 詳細表示 (beats, intersections, focusCharacters 含む)
  - `formatMermaid(subplots)`: Mermaid graph TD で beats と intersections を描画
  - `calculateStats(subplots)`: 総数、type 別、status 別

Mermaid 出力例:
```
graph TD
  subplot_a_setup[A: setup] --> subplot_a_climax[A: climax]
  subplot_b_setup[B: setup] --> subplot_b_climax[B: climax]
  subplot_a_climax -.intersect.-> subplot_b_climax
```

---

## Red Phase
- [ ] tests は Process 15

✅ **Phase Complete**

---

## Green Phase
- [ ] foreshadowing.ts (view) をコピーし subplot 用に修正
- [ ] Mermaid フォーマッタ新規実装
- [ ] view index に descriptor 登録

✅ **Phase Complete**

---

## Refactor Phase
- [ ] フォーマッタ関数の独立性向上

✅ **Phase Complete**

---

## Dependencies
- Requires: 01, 02, 09
- Blocks: 15, 51
