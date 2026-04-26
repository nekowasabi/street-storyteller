# Process 02: Phase 1 tsparse 拡張（import / 型注釈 スキップ）

## Overview
internal/project/tsparse の現状制約（`export const NAME = {...};` 純粋形のみ対応）を解消し、実 samples/*/src/characters/*.ts を直接パースできるようにする。Why: authoring surface の TS が解釈できなければ Go 化の意味がない。

## Affected Files
- `internal/project/tsparse/parser.go` (既存): 前処理レイヤ追加
- `internal/project/tsparse/preprocess.go` (新規): import 行 / 型注釈ストリップ
- `internal/project/tsparse/parser_test.go` (既存): テスト拡充
- `internal/project/tsparse/testdata/` (新規): samples からコピーした fixture

## Implementation Notes
- 既知制約: `.serena/memories/tsparse-limited-scope.md` 参照
- 前処理対象:
  - `import { Character } from "@storyteller/types/v2/character.ts";` → 削除
  - `export const cinderella: Character = {...};` → `: Character` を削除
  - 末尾セミコロン / 末尾カンマ許容
- 代替案検討（Refactor Phase で評価）:
  - A: 自作前処理継続（依存ゼロ、現実装の延長）
  - B: tree-sitter-typescript（CGO 必要、強力）
  - C: tsc/deno subprocess で AST JSON 取得（堅牢だが Deno 依存復活）
  - 暫定: A で進め、samples 全カバーできなければ B/C を Process 11 で再検討
- 入力検証: samples/cinderella, samples/momotaro, samples/glass_slipper の全 .ts をパース成功

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] samples/cinderella/src/characters/cinderella.ts を fixture としてコピー
- [x] 該当 fixture のパース成功を期待するテスト作成 → 失敗確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] preprocess.go 実装（import 行除去、型注釈除去）
- [x] parser.go から preprocess を呼び出す
- [x] go test ./internal/project/tsparse/... で成功確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] samples 全プロジェクトの全 .ts を CI で parse する golden test 化
- [x] エラーメッセージに行番号・ファイル名を含める
- [x] 代替案 B/C の必要性評価（カバー率を計測）

✅ **Phase Complete**

---

## Dependencies
- Requires: 01
- Blocks: 03, 04, 05, 06, 07, 08
