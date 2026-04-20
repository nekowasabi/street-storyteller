# Process 300: 振り返り・教訓抽出 (OODA Learning)

## Overview
ミッション完了後の OODA Learning フェーズ。実装全体の教訓を .serena/memories/ に保存し、将来の類似タスク（CLI 拡張 / LSP 統合）に活用する。

## Affected Files
- @new `.serena/memories/lesson-lsp-validate-cli-gap-fill.md` (教訓)

## Implementation Notes
- 抽出対象:
  - 既存コードを破壊せず拡張する「ギャップ埋め戦略」の有効性
  - DiagnosticsGenerator の suppress ロジックが CLI サマリーと衝突した際の detectAll() 新設パターン
  - listMarkdownFiles の複製 vs 移動のトレードオフ
  - cli.ts:93-98 の Deno.exit(1) ハードコードが複数 exit code を阻害する構造的制約
  - 既存テストが unknown[] 扱いだったため型拡張が後方互換だった幸運ケース
- 保存先: .serena/memories/ (ローカル)
- 必要に応じて stigmergy/lesson-index.json も更新

## Red Phase
- [ ] スキップ
✅ Phase Complete

## Green Phase
- [ ] 教訓ファイル作成
- [ ] 主要な意思決定ログを time-stamped で列挙
✅ Phase Complete

## Refactor Phase
- [ ] 一般化可能な教訓を抽出
✅ Phase Complete

## Dependencies
- Requires: 200, 201
- Blocks: -
