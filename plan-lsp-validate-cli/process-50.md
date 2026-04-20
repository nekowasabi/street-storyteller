# Process 50: MCP lsp_validate ツール整合性確認

## Overview
CLI 側 `validate` 拡張 (Process 1-6) 完了後、MCP 側 `src/mcp/tools/definitions/lsp_validate.ts` の挙動と整合しているか確認する。MCP 側は既に --dir --recursive 対応済み（`listMarkdownFiles` を直接使用）。CLI 側も複製した markdown_files.ts を使うため動作一致を検証。

## Affected Files
- 確認対象: `src/mcp/tools/definitions/lsp_validate.ts` (変更不要)
- 確認対象: `src/cli/modules/lsp/validate.ts` (Process 1-6 で変更済み)
- 差分があれば: `src/lsp/utils/markdown_files.ts` 側の修正を検討

## Implementation Notes
- MCP 側は DiagnosticsGenerator.generate() を直接呼ぶ（suppress 適用）
- CLI 側は detectAll() + generate() 併用（サマリー用に全マッチ取得）
- JSON スキーマは CLI 拡張版 (confidence/entityId/summary) と MCP 現行版で差異がある
  → MCP 側を CLI に合わせる改修は本 Issue の対象外（別 Issue）とし、TODO コメントで記録

## Red Phase
- [ ] スキップ（整合性確認タスク）
✅ Phase Complete

## Green Phase
- [ ] MCP lsp_validate を実行し、CLI 相当の動作になるか smoke test
- [ ] 差異を docs/requirements/lsp-validate-cli.md に "Known Gap" として記録
✅ Phase Complete

## Refactor Phase
- [ ] 必要に応じて TODO コメント追加
✅ Phase Complete

## Dependencies
- Requires: 6, 10, 11, 12, 13, 14
- Blocks: 100
