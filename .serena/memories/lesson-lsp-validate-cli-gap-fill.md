# Lesson: LSP Validate CLI Gap-Fill Strategy (Issue #12)

## Summary
既存の lsp validate コマンドを --dir/--recursive/--strict/サマリー集計に拡張した際の教訓。

## Key Lessons

### 1. 閾値の一貫性が重要
- `computeConfidenceSummary` が 0.85/0.50 を使っていた一方、`generateDiagnostics` は 0.9/0.7 を使っていた
- 複数箇所で同じ閾値を参照する場合、定数を一元管理すること
- 修正: HIGH_THRESHOLD=0.9, MEDIUM_THRESHOLD=0.7 に統一

### 2. --strict の実用的な設計
- PositionedDetector の最低信頼度が 0.8（エイリアス）のため、"low" (< 0.7) 単体では発火不可能
- 解決: `medium + low > 0` で判定。計画書の "Low < 0.7" から実用的に調整
- 教訓: 検出器の実際の出力範囲を事前に確認することが重要

### 3. detectAll() 並置パターン
- `DiagnosticsGenerator.generate()` は LSP 診断で使用中のため変更不可
- suppress 前の全マッチが必要な用途には `detectAll()` を新設して並置
- generate() の現行動作を一切変えずに新機能を追加できる

### 4. MCP vs CLI のパイプライン差異
- MCP: `DiagnosticsGenerator.generate()` → LSP 準拠の Diagnostic 型（confidence/entityId なし）
- CLI: `PositionedDetector.detectWithPositions()` 直接 → 拡張 DiagnosticOutput 型
- この差異は意図的。MCP 側の統一は別 Issue で対応

### 5. 既存テストの後方互換
- 既存5テストが `diagnostics: unknown[]` 扱いだったため、型拡張（optional フィールド追加）が後方互換だった
- 新フィールドは全て optional で追加する方針が有効

### 6. Worktree クリーンアップ
- `.claude/worktrees/` の古い worktree が deno task test のタイプチェックをブロックした
- エージェント完了後に worktree を確実にクリーンアップする仕組みが必要

## Context
- Date: 2026-04-21
- Issue: #12
- Files: src/cli/modules/lsp/validate.ts, tests/cli/lsp_validate_command_test.ts
