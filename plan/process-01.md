# Process 01: Phase 0 憲章化（Go/TS 二層構造 + E2E 最小主義）

## Overview
Go 全面移植の不変条件を CLAUDE.md と docs/architecture.md に明文化する。「Go = 処理エンジン」「TypeScript = authoring surface」「E2E = YAGNI」の 3 原則を全フェーズの判断基準とする。

## Affected Files
- `CLAUDE.md` (既存): 末尾に「アーキテクチャ: 二層構造（Go 移植）」セクション追加
- `docs/architecture.md` (新規): レイヤー図と責務マッピング
- `README.md` (L1-50): バナーに「Go-powered engine, TypeScript authoring」追記（任意）

## Implementation Notes
- Why: 後続フェーズでスコープ判断が頻発するため、原典を先に確定する
- 二層構造の責務:
  - **Layer 1 (Go)**: cmd/storyteller, internal/{cli,lsp,mcp,meta,detect,domain,project,service,external,rag}
  - **Layer 2 (TypeScript)**: src/type/, src/characters/, src/settings/, src/timelines/, src/foreshadowings/, samples/*/src/
- 削除対象（Phase 4 以降）: src/cli/modules/, src/lsp/, src/mcp/, src/rag/, src/cli.ts
- E2E テスト方針:
  - 原則: ユニットテスト + golden test + 限定的な統合テストで品質を担保
  - E2E は性能・配布検証など必要が発生した時のみ追加
  - 既存の長時間 E2E は Process 13 で棚卸し・削除

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] docs/architecture.md の存在チェックを CI に追加（無ければ fail）
- [x] CLAUDE.md に「二層構造」見出しが含まれることを grep でチェック

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] docs/architecture.md 作成（レイヤー図 + 責務表 + 不変条件リスト）
- [x] CLAUDE.md に「アーキテクチャ: 二層構造」セクション追加
- [x] テスト実行で成功確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] 文書のリーダビリティ改善（mermaid 図 / 表 / 凡例）
- [x] 既存 ARCHITECTURE.md があれば差分整理

✅ **Phase Complete**

---

## Dependencies
- Requires: -
- Blocks: 02, 03, 04, 05, 06, 07, 08
