# Process 201: docs/requirements/lsp-validate-cli.md 作成

## Overview

Issue #12 の要件定義を docs/requirements/
に正式文書化。合議済み設計判断・既存実装ギャップ・テスト戦略・Known Gap（MCP
側の JSON スキーマ差異など）を含める。

## Affected Files

- @new `docs/requirements/lsp-validate-cli.md`

## Implementation Notes

- 構成:
  1. 背景と Issue #12 引用
  2. スコープ (ギャップ埋め戦略)
  3. 要件 R1-R6 詳細
  4. 設計判断と合議結果（exit code 制約、複製 vs 移動、detectAll() 新設）
  5. TDD テスト計画（Process 10-14 の概要）
  6. Known Gap / 別 Issue 対象（exit code 細分化、MCP
     スキーマ統一、listMarkdownFiles 統一）
  7. 参考: 関連ファイルパス一覧

## Red Phase

- [ ] スキップ ✅ Phase Complete

## Green Phase

- [ ] ドキュメント作成 ✅ Phase Complete

## Refactor Phase

- [ ] レビュー後修正 ✅ Phase Complete

## Dependencies

- Requires: 100, 101
- Blocks: 300
