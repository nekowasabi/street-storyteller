# Process 10: 契約・回帰テスト整備

## Overview

Go移行で既存機能を壊さないため、現行 TypeScript/Deno の入出力を Golden/fixture
として固定する。

## Affected Files

- `tests/cli_test.ts` - CLI help/error の参考
- `tests/command_registry_test.ts` - command registry の参考
- `tests/application/meta/*` - FrontMatter/meta の参考
- `tests/lsp/providers/*` - LSP provider の参考
- `tests/mcp/tools/definitions/*` - MCP tool 契約の参考
- `tests/scenario/*` - E2E scenario の参考
- `samples/cinderella/*` - 契約fixture
- `samples/momotaro/*` - 日本語ファイル名fixture

## Implementation Notes

- Golden
  は「Goで再生成して一致させる」対象と「現行との差分を許容する」対象を分ける。
- CLI/MCP/LSP の JSON は比較しやすいよう canonicalize する。
- HTML は完全一致よりも構造/主要ノード/graph data の契約を優先する。

---

## Red Phase: テスト作成と失敗確認

- [x] ブリーフィング確認
- [x] Golden fixture 生成スクリプトを追加
- [x] Go実装未作成状態で契約テストが失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [x] CLI代表コマンドの Golden を作る
- [x] Meta生成の Golden を作る
- [x] LSP request/response fixture を作る
- [x] MCP request/response fixture を作る
- [x] テストを実行して成功することを確認

> Note: RAG document fixture はスコープ外（Go 側未移行・TS のみ運用継続）。

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [x] fixture の更新手順を明文化
- [x] 差分表示を読みやすくする
- [x] テストが継続して成功することを確認

**完了の根拠**:

- fixture 更新手順: docs/development/golden-fixture-update.md（LSP
  手動更新節含む）
- 差分表示: 4 golden アサーションを `--- want / --- got / --- end ---`
  統一形式に
- 緑維持: `go test ./...` 全 31 パッケージ ok / `go vet ./...` 警告 0

✅ **Phase Complete**

---

## Dependencies

- Requires: 1
- Blocks: 4, 100
