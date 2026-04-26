# Process 03: Phase 2 未移植モジュール棚卸し

## Overview
src/cli, src/lsp, src/mcp, src/rag 配下 ~157 ファイルの依存グラフを可視化し、Phase 3 の移植順序を確定する。Why: 依存逆順に移植しないと差分が爆発するため。

## Affected Files
- `docs/go-migration-inventory.md` (新規): モジュール一覧 + 依存グラフ
- `scripts/inventory.sh` (新規): grep / find で TS import 関係を抽出

## Implementation Notes
- 集計対象（調査済み概数）:
  - src/cli/modules/: 43 files (generate, update, element, lint, lsp, mcp, rag, view, migrate)
  - src/lsp/: 41 files (server, handlers, providers, integration/textlint)
  - src/mcp/: 58 files (server, tools, resources, prompts)
  - src/rag/: 15 files
- 出力フォーマット例:
  | Module | Files | Imports From | Importers | Priority | Target Process |
  |--------|-------|--------------|-----------|----------|----------------|
  | generate | 1 | manifest, project | cli/index | high | 04 |
  | lsp/server | ~10 | protocol, providers | cli/lsp | high | 05 |
  | textlint adapter | 4 | external | lsp/diagnostics | medium | 08 |
- 依存グループ分類:
  - Group A (no internal deps): version, help, view character → 04 fast-track
  - Group B (domain only): meta, element → 04 medium
  - Group C (complex): lsp, mcp, rag → 05/06/07
  - Group D (external): textlint → 08

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] inventory が全 src/cli/lsp/mcp/rag を網羅することを CI でチェック（ファイル数比較）

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] scripts/inventory.sh 作成（grep -r "^import" 等）
- [x] docs/go-migration-inventory.md 生成
- [x] mermaid 依存図を README または architecture.md に埋め込み

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] 依存サイクル検出（あれば設計見直しフラグ）
- [x] Process 04-08 の見積を inventory 結果で更新

✅ **Phase Complete**

---

## Dependencies
- Requires: 01, 02
- Blocks: 04, 05, 06, 07, 08
