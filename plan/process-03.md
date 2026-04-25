# Process 3: Meta/Reference検出基盤

## Overview
Markdown FrontMatter、`.meta.ts` 生成、本文参照検出、信頼度計算を Go の application 層に移す。LSP/CLI/MCP から共通利用できる service として実装する。

## Affected Files
- `docs/migration/go-rearchitecture-requirements.md:53` - meta/FrontMatter 維持対象
- `src/application/meta/frontmatter_parser.ts` - YAML FrontMatter parser の参考
- `src/application/meta/frontmatter_editor.ts` - add/remove/set 操作の参考
- `src/application/meta/reference_detector.ts` - 参照検出ロジックの参考
- `src/application/meta/typescript_emitter.ts` - `.meta.ts` 出力互換の参考
- `src/lsp/detection/positioned_detector.ts` - LSP位置付き検出の参考

## Implementation Notes
- Go 配置案:
  - `internal/meta/`
  - `internal/detect/`
- FrontMatter は YAML parser を使い、文字列操作だけで処理しない。
- `.meta.ts` 出力は既存の auto block と手動領域保持を契約テストで固定する。
- confidence は name/displayNames/aliases/pronouns/detectionHints のルールを fixture 化する。
- LSP位置計算のため、UTF-16/LSP position と rune/byte offset の変換を分離する。

---

## Red Phase: テスト作成と失敗確認

- [x] ブリーフィング確認
- [x] FrontMatter parse/edit/sync の Go テストを作る  ※`internal/meta/frontmatter_test.go` 6 PASS
  - characters/settings/foreshadowings/timeline_events/phases/timelines
  - add/remove/set と本文保持
- [ ] `.meta.ts` 生成の Golden Test を作る  ※Wave-A3-post で対応
- [x] 参照検出の confidence テストを作る  ※`internal/detect/reference_test.go` 8 PASS
- [x] テストを実行して失敗することを確認  ※worktree 内 Red 経由

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [x] `internal/meta` に FrontMatter parser/editor を実装
- [x] `internal/detect` に entity reference detector を実装
- [ ] TypeScript emitter 互換の最小出力を実装  ※Wave-A3-post deferred
- [ ] validation preset の読み込み口を作る  ※Cycle 2 候補
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] LSP用の位置付き検出と meta 用の参照検出を共通コアへ寄せる
- [ ] エラーコードとユーザー向けメッセージを整理
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 2
- Blocks: 4, 5

---

## Wave-A3 進捗ノート

- **Wave-A3-pre (693fdb0)**: 共有契約 (`internal/detect/types.go`, `internal/meta/doc.go`) 確定
- **Wave-A3-main (3並列マージ済み)**: frontmatter / position / reference を 3 worktree で並列実装し no-ff merge
- **Wave-A3-post (deferred)**: `.meta.ts` emitter Golden test
- **TODO**: `internal/detect/reference.go:115-128` の SourceLocation 仮 byte offset を `PositionTable` 経由に正規化 (Cycle 2 / process-04 準備)
