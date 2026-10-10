# Lesson: LSP Validate CLI/MCP (Issue #12, #18)

## Key Lessons

### 1. 閾値は 2 系統の別概念（統合しない）

- CLI `--severity`: 検出スコアの下限フィルタ（error>=0.9, warning>=0.7, info>=0.0）。`internal/cli/modules/lsp/validate.go`
- LSP/MCP 診断: スコアの帯（<0.7 Error, 0.7-0.85 Warning, >=0.85 診断なし）。`internal/lsp/diagnostics/generator.go`
- 向きが逆なので同じ定数にすると片方が逆転する。docs/lsp.md に区別を明記済み。

### 2. CLI と MCP は同じ経路

- 両方 `service.ValidateService.Run` を通り、`StorytellerSource` の Generate/Detect を共有する。
- MCP の `Diagnostic.data` に `confidence` と `entityId` がある。診断 0 件なら "<N> entities detected"。
- CLI の JSON は 5 キー配列 {file,line,type,id,confidence}（line は 1 始まり）。これは現行契約で維持。

### 3. 検出スコア

name 1.0 / displayName 0.9 / alias 0.8 / pronoun 0.6 / frontmatter 1.0（`internal/detect/reference.go`）。検出器の実出力範囲を先に確認してから閾値を設計する。

### 4. 回帰テストは観測の穴に注意

- stdio は逐次書き込みでしか 2 通目の消失を検出できない（一括入力では見えない）。
- 定義ジャンプは Locate 単体でなく providers.Definition 経由で確かめる。
