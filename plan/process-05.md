# Process 5: LSP/MCP adapter分離

## Overview

現行で最も複雑な LSP/MCP を、Go core service に乗る adapter
として再設計する。サーバー責務、transport、diagnostics、外部プロセスを分離し、テストの長時間化を防ぐ。

## Affected Files

- `src/lsp/server/server.ts:149` - LspServer の責務集中
- `src/lsp/server/server.ts:178` - file change debounce
- `src/lsp/server/server.ts:760` - didChangeWatchedFiles 処理
- `src/lsp/server/server.ts:797` - LSP から CLI loader への逆依存
- `src/lsp/integration/textlint/textlint_worker.ts:48` - textlint
  debounce/process 実行
- `src/mcp/server/server.ts` - MCP lifecycle と handlers
- `src/mcp/tools/tool_registry.ts` - ToolRegistry と projectRoot context

## Implementation Notes

- Go 配置案:
  - `internal/lsp/protocol`
  - `internal/lsp/server`
  - `internal/lsp/providers`
  - `internal/mcp/server`
  - `internal/mcp/tools`
  - `internal/external/textlint`
- `Clock`, `Timer`, `ProcessRunner`, `Transport` を interface 化する。
- LSP server は provider の orchestration だけ行い、entity load は
  `project.EntityStore` を使う。
- MCP tool は CLI adapter ではなく application service を直接呼ぶ。

---

## Red Phase: テスト作成と失敗確認

- [x] ブリーフィング確認
- [x] LSP JSON-RPC fixture テストを作る
  - initialize/shutdown
  - hover/definition/diagnostics/codeAction/semanticTokens
- [x] MCP JSON-RPC fixture テストを作る
  - tools/list, tools/call, resources/read, prompts/get
- [x] fake clock/process runner を使うテストを作る
- [x] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [x] LSP transport と server lifecycle を実装
- [x] hover/definition/diagnostics の最小 provider を実装
- [x] textlint adapter を外部コマンド境界として実装
- [x] MCP lifecycle と ToolRegistry を実装
- [x] meta_check/lsp_validate/view_browser の代表 tool を実装
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [x] LSP server からタイマーと外部プロセスを完全排除 (Green Phase で達成済み:
      clock.Clock / process.Runner DI 完了、time/exec の直接利用なし)
- [x] MCP/CLI/LSP の service 呼び出しを共通化 (internal/service/
      層を新設、CLI/MCP の MetaCheck/Validate を移譲、走査仕様を depth-1 に統一)
- [x] テストが継続して成功することを確認 (go test ./... 全 Green、28 packages)

✅ **Phase Complete**

---

## Dependencies

- Requires: 3, 11
- Blocks: 100
