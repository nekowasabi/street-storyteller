# 2026-04 Go Migration Lessons

Mirror of `.serena/memories/go-migration-lessons.md`, placed here for the
`ai/knowledge/lessons/` retrieval path. Source of truth (rationale + KPI tables) is
`docs/go-migration-retrospective.md`.

## Quick Reference Patterns

### Pattern 1: 並列 worktree でのヘルパ命名衝突
- 症状: 複数 worktree が独立に `errorResult` / `slugify` 等を定義 → マージ時 conflict
- 対策: scope prefix 命名規約（`bindingErrorResult`, `timelineSlugify` 等）+ マージ前 lint
- 適用条件: 3 worktree 以上の並列 disjoint 実装
- 出典: Process 06（MCP tools 並列移植）

### Pattern 2: wave-pre 契約の Error() メソッド漏れ
- 症状: `*protocol.ResponseError` を error として返したいが Error() string 未実装で型エラー
- 対策: wave-pre commit の types.go checklist に「全 Response*Error 型に Error() string」
- 出典: stigmergy/lessons.jsonl lesson-006

### Pattern 3: subagent サンドボックスでの go ツールチェーン拒否
- 症状: doctrine-executor 配下で `go build`/`go test`/`go vet` permission deny
- 対策: 親セッション代行で TDD Green 確認、または `.claude/settings.json` の permissions.allow に `Bash(go -C *)` 追加
- 出典: stigmergy/lessons.jsonl lesson-002

### Pattern 4: agent_wait timeout の偽陰性
- 症状: `agent_wait` が status:timeout を返すがサブエージェントは worktree に commit 完了済み
- 対策: timeout = 即再 spawn ではなく `git -C <wt> log --oneline main..HEAD` で実態確認 first
- 出典: stigmergy/lessons.jsonl lesson-003

### Pattern 5: In-process golden test（os/exec sandbox 回避）
- 症状: CLI golden を `os/exec` で書くと sandbox で block
- 対策: `cli.Run(ctx, args, cli.Deps{Stdout: &buf})` を直接呼ぶ in-process 方式
- ファイル: `cmd/storyteller/main.go:15-23`, `cmd/storyteller/golden_test.go:60-105`
- 出典: stigmergy/lessons.jsonl lesson-004

### Pattern 6: tsparse 限定スコープ
- 症状: `internal/project/tsparse.ParseExportConst` は import 文・型注釈非対応
- 対策: fixture / authoring DSL を `export const Name = { ... };` pure form に固定
- 将来課題: import 解析必須になったら tree-sitter 採用是非を再評価
- 出典: stigmergy/lessons.jsonl lesson-005

### Pattern 7: Codex effort:low の取りこぼし
- 症状: 低コスト LLM 設定で (a) フィールド初期化漏れ (b) helper 命名重複 (c) Error 等必須メソッド漏れ
- 対策: pre-commit で (1) 命名 prefix lint (2) interface 充足チェック (3) wave-pre 契約 checklist
- 出典: docs/go-migration-retrospective.md Lesson 6

### Pattern 8: DiagnosticSource 抽象化の導入タイミング
- 教訓: 複数の独立した診断源を統合する要件が見えた時点で導入する（YAGNI）
- Pros: textlint 不在時もグレースフル動作
- Cons: インターフェース 1 層分の呼び出しコスト（無視可能）

### Pattern 9: Go 並行制御の標準形
- 用途: textlint adapter のような外部プロセス呼び出し adapter
- 構成: `context.WithTimeout` + 直近リクエスト用 cancelFunc 保持 + `time.AfterFunc` debounce + `select` で cancel 監視

### Pattern 10: E2E 削除の YAGNI 原則
- 残存戦略: UT + in-process golden
- 結果: E2E 削除起因の観測リグレッションなし
- 補足: 性能ベンチは `workflow_dispatch` 限定 bench job として分離

## KPI Snapshot (2026-04-27)

| 指標 | 目標 | 実測 |
|------|------|------|
| LSP startup | < 2s | 1.0 ms |
| CLI latency | < 100ms | 1.6–1.9 ms |
| Single binary | < 50MB | 約 3.3 MB |
| Go coverage | >= 70% | 70.7% |
| TS authoring surface | 完全保持 | PASS |
| E2E 最小化 | tests/authoring のみ | PASS |
