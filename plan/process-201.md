# Process 201: docs 個別更新（cli/lsp/mcp/lint/architecture）

## Overview
docs/ 配下の各仕様書に Go 実装の事実を反映する。Why: README だけでは深いユースケースをカバーできない。

## Affected Files
- `docs/architecture.md` 全面刷新（二層構造憲章を Go 移植後の現状で更新）
- `docs/cli.md` 全面刷新（internal/cli/modules/* に整合）
- `docs/lsp.md` 全面刷新（internal/lsp/* providers/diagnostics に整合）
- `docs/mcp.md` 全面刷新（18 Tools / Resources / Prompts を網羅）
- `docs/lint.md` 全面刷新（internal/external/textlint adapter）
- `docs/rag.md` 削除（RAG モジュールは Go 移植時に廃止）

## Implementation Notes
- 各ドキュメントは「概要 → 実装ファイル一覧 → 詳細」の構成に統一
- 実装ファイル参照（internal/*）を明示し、コードへ飛べるようにする
- 旧 TS ランタイム（src/cli, src/lsp, src/mcp, src/rag, deno compile）の記述を全削除
- benchmarks.md は Process 100 成果物として保持

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] docs 内の古いパス参照（src/cli/modules/...）を grep 抽出

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] architecture.md / cli.md / lsp.md / mcp.md / lint.md 更新
- [x] docs/rag.md 削除
- [x] architecture.md と各 docs の整合性チェック
- [x] markdown 構文 OK

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] 各ドキュメント先頭に H1 + 関連リンク
- [x] 実装ファイルへの参照を表で集約
- [x] CLAUDE.md「MCP (Claude Desktop) 統合」セクションと docs/mcp.md の Tools/Resources/Prompts 記述を一致

✅ **Phase Complete**

---

## Dependencies
- Requires: 50, 200
- Blocks: 300
