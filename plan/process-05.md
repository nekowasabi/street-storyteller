# Process 5: CLI element intersection

## Overview
storyteller element intersection コマンドを実装。subplot ファイルの intersections[] 配列に PlotIntersection を追加。

## Affected Files
- **新規**: src/cli/modules/element/intersection.ts (~270行目安)
- **修正**: src/cli/modules/element/index.ts (children 配列に追加)
- **参考**: src/cli/modules/element/event.ts (既存ファイル更新パターン)

## Implementation Notes
- クラス名: `ElementIntersectionCommand`
- 必須引数: `--source-subplot`, `--source-beat`, `--target-subplot`, `--target-beat`, `--summary`
- オプショナル: `--influence-direction` (default "forward"), `--influence-level` (default "medium")
- `handle()`:
  1. source subplot ファイル読込
  2. target subplot/beat の存在検証 (target の subplot ファイルも読込)
  3. PlotIntersection を構築
  4. source subplot の intersections[] に追加 (※ Grill 決定 #2 単方向格納、target側には書かない)
  5. 上書き保存
- ID 生成: `intersection_${source}_${target}_${count+1}`

---

## Red Phase
- [ ] tests は Process 14

✅ **Phase Complete**

---

## Green Phase
- [ ] event.ts をベースに intersection.ts 作成
- [ ] target 存在検証の strict モード実装
- [ ] index.ts に descriptor 登録

✅ **Phase Complete**

---

## Refactor Phase
- [ ] エラーメッセージ改善

✅ **Phase Complete**

---

## Dependencies
- Requires: 01, 02, 03, 04, 09
- Blocks: 14
