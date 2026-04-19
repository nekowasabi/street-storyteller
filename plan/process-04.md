# Process 4: CLI element beat

## Overview
storyteller element beat コマンドを実装。既存 subplot ファイルを読み込み、beats[] 配列に新規 PlotBeat を追加して書き戻す (timeline+event の更新パターンを踏襲)。

## Affected Files
- **新規**: src/cli/modules/element/beat.ts (~270行目安)
- **修正**: src/cli/modules/element/index.ts (children 配列に追加)
- **参考**: src/cli/modules/element/event.ts:60-266 (timeline 更新パターン) を全面コピー
- **参考**: src/application/timeline/timeline_file_parser.ts:99-100+ (parseWithMutableEvents)

## Implementation Notes
- クラス名: `ElementBeatCommand`
- 必須引数: `--subplot` (subplot ID), `--title`, `--summary`, `--chapter`, `--structure-position`
- オプショナル: `--characters` (CSV), `--settings` (CSV), `--precondition-beats` (CSV), `--timeline-event` (event ID)
- `handle()`:
  1. src/subplots/{subplot}.ts を読込
  2. parseSubplotFromFile() (Process 09で実装) で Subplot オブジェクトに変換
  3. beats[] に新 PlotBeat を append
  4. generateSubplotFile() (Process 09) で文字列化
  5. 上書き保存
- structurePosition 検証: ["setup","rising","climax","falling","resolution"] 内
- ID 生成: `${subplot}_beat_${beats.length + 1}` または `--id` 指定で上書き

---

## Red Phase
- [ ] tests/cli/modules/element/beat_test.ts は Process 13

✅ **Phase Complete**

---

## Green Phase
- [ ] event.ts をコピーし beat 用に修正
- [ ] preconditionBeatIds の存在検証を追加 (指定された beat IDs が同一 subplot 内に存在するか)
- [ ] index.ts に descriptor 登録

✅ **Phase Complete**

---

## Refactor Phase
- [ ] 既存 beat 重複検出ロジック追加

✅ **Phase Complete**

---

## Dependencies
- Requires: 01, 02, 03, 09
- Blocks: 13
