# Process 200: docs/lsp.md に validate コマンドセクション追加

## Overview
docs/lsp.md に `storyteller lsp validate` コマンドの使い方セクションを追加。

## Affected Files
- @modify `docs/lsp.md`
  - 追加セクション: "CLI 検証コマンド (`storyteller lsp validate`)"
    - 単一ファイル検証
    - --dir / --recursive
    - --json 出力フォーマット（confidence / entityId / summary 含む）
    - --strict の CI 連携例
    - exit code: 常に 1 (cli.ts 制約) の注意書き

## Implementation Notes
- 既存 docs/lsp.md のトーンとフォーマットに合わせる
- コードブロックで実例を示す
- Issue #12 の出力例との対応関係を明記

## Red Phase
- [ ] スキップ
✅ Phase Complete

## Green Phase
- [ ] セクション追加
- [ ] サンプルコマンドと期待出力の提示
✅ Phase Complete

## Refactor Phase
- [ ] レビュー後の誤字修正
✅ Phase Complete

## Dependencies
- Requires: 100, 101
- Blocks: 300
