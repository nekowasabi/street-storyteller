# Process 04: Phase 3a CLI Go 移植（generate/element/update/view 等）

## Overview
src/cli/modules/ 配下 43 TS ファイルのうち、LSP/MCP に依存しないコマンド群を Go へ移植する。Why: ユーザーが直接呼ぶエントリポイントの起動時間が最大効果を生む。

## Affected Files
- `internal/cli/modules/generate/` (新規): プロジェクト scaffolding
- `internal/cli/modules/element/` (新規): character/setting/timeline/foreshadowing/subplot/beat/event/intersection/phase create
- `internal/cli/modules/update/` (新規): manifest/project update
- `internal/cli/modules/view/` (既存拡張): list, setting, timeline, foreshadowing, subplot サブコマンド
- `internal/cli/modules/index.go` (既存 L1-36): RegisterCore に新モジュル登録
- `cmd/storyteller/main.go`: コマンド配線確認

## Implementation Notes
- 参照元 TS: src/cli/modules/{generate,element,update,view}.ts
- 既存 Go パターン: internal/cli/modules/meta/, internal/cli/modules/view/character.go
- scaffolding テンプレートは internal/project/manifest/ に配置（embed.FS で同梱）
- element create は内部で internal/project/entity/loader.go の writer 版を使う（無ければ実装）
- ユーザー出力は internal/cli/presenter.go（既存）の text/json モード両対応
- TDD: golden test (cmd/storyteller/golden_test.go パターン) で CLI 全体の出力スナップショット

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] 各サブコマンドの golden test 雛形作成 → 未実装で失敗

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] generate モジュール実装
- [x] element 各サブコマンド実装
- [x] update モジュール実装
- [x] view 拡張実装
- [x] registry 登録
- [x] go test ./... 全 green

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] エラーメッセージ統一（internal/errors）
- [x] presenter での JSON / text 切替の重複削減
- [x] cmd/storyteller/golden_test.go に新コマンドの fixture 追加

✅ **Phase Complete**

---

## Dependencies
- Requires: 02, 03
- Blocks: 09
