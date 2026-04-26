# Process 200: README 更新（インストール・アーキテクチャ図）

## Overview
README.md を Go 移植後の事実に合わせて全面改訂する。Why: ユーザーの最初の接点。古い情報は離脱要因。

## Affected Files
- `README.md` (既存 L1-342): Go 実装後の事実に改訂
- `docs/architecture.md` (Process 01 で作成。図を本格化)

## Implementation Notes
- 更新項目:
  - **Installation**:
    1. `curl -fsSL https://.../install.sh | sh`（推奨）
    2. `brew install takets/tap/storyteller`
    3. `go install github.com/takets/street-storyteller/cmd/storyteller@latest`
  - **Architecture**:
    - 二層構造図（mermaid）: Go engine ↔ TS authoring
    - Generated project の TS 構造（既存通り保持）
  - **Features**:
    - "Go-powered single binary" を追加
    - "Story elements can be expressed in TypeScript types"（L318）は維持
  - **Performance**: バッジ（LSP <2s, CLI <100ms）
  - **Development**:
    - Go: `go build ./cmd/storyteller`, `go test ./...`
    - Authoring: `deno fmt`, `deno test samples/`
- 削除項目:
  - Deno ランタイム必須の旧インストール手順
  - `deno compile` 関連の記述

---

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] README 内の壊れた link / 古い手順を grep で検出

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] Installation セクション全面書き換え
- [ ] Architecture セクション追加（mermaid 図）
- [ ] Features 更新
- [ ] markdown lint pass

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] スクリーンショット / GIF を追加（任意）
- [ ] 多言語対応の方針（README.ja.md / README.en.md）

✅ **Phase Complete**

---

## Dependencies
- Requires: 50
- Blocks: 201
