# Go Migration Lessons (2026-04)

Source: `docs/go-migration-retrospective.md` の Lessons Learned 抽出版。
Serena memory として「次回類似ミッション着手時に検索ヒットさせる」目的で再配置。

## Quick Reference Patterns

### Pattern 1: 並列 worktree でのヘルパ命名衝突
- 症状: 複数 worktree が独立に `errorResult` / `slugify` 等を定義 → マージ時 conflict
- 対策: scope prefix 命名規約（`bindingErrorResult`, `timelineSlugify` 等）+ マージ前 lint
- 適用条件: 3 worktree 以上の並列 disjoint 実装
- 出典: Process 06（MCP tools 並列移植）

### Pattern 2: wave-pre 契約の Error() メソッド漏れ
- 症状: `*protocol.ResponseError` を error として返したいが Error() string 未実装で型エラー
- 対策: wave-pre commit の types.go checklist に「全 Response*Error 型に Error() string」
- 適用条件: JSON-RPC / 任意の error interface を満たす型を共有契約に置く場合
- 出典: lessons.jsonl lesson-006

### Pattern 3: subagent サンドボックスでの go ツールチェーン拒否
- 症状: doctrine-executor 配下で `go build`/`go test`/`go vet` permission deny
- 対策: 親セッション代行で TDD Green 確認、または `.claude/settings.json` の permissions.allow に `Bash(go -C *)` 追加
- 適用条件: doctrine-executor / 同等のサンドボックスサブエージェントで Go タスク実行
- 出典: lessons.jsonl lesson-002

### Pattern 4: agent_wait timeout の偽陰性
- 症状: `agent_wait` が status:timeout を返すがサブエージェントは worktree に commit 完了済み
- 対策: timeout = 即再 spawn ではなく `git -C <wt> log --oneline main..HEAD` で実態確認 first
- 適用条件: doctrine 経由のサブエージェント並列実行
- 出典: lessons.jsonl lesson-003

### Pattern 5: In-process golden test（os/exec sandbox 回避）
- 症状: CLI golden を `os/exec` で書くと sandbox で block
- 対策: `cli.Run(ctx, args, cli.Deps{Stdout: &buf})` を直接呼ぶ in-process 方式
- ファイル: `cmd/storyteller/main.go:15-23`, `cmd/storyteller/golden_test.go:60-105`
- 出典: lessons.jsonl lesson-004

### Pattern 6: tsparse 限定スコープ
- 症状: `internal/project/tsparse.ParseExportConst` は import 文・型注釈非対応
- 対策: fixture / authoring DSL を `export const Name = { ... };` pure form に固定
- 将来課題: import 解析必須になったら tree-sitter 採用是非を再評価
- 出典: lessons.jsonl lesson-005

### Pattern 7: Codex effort:low の取りこぼし
- 症状: 低コスト LLM 設定で (a) フィールド初期化漏れ (b) helper 命名重複 (c) Error 等必須メソッド漏れ
- 対策: pre-commit で (1) 命名 prefix lint (2) interface 充足チェック (3) wave-pre 契約 checklist
- 適用条件: 低コスト設定で並列量産する場合の必須予防策
- 出典: docs/go-migration-retrospective.md Lesson 6

### Pattern 8: DiagnosticSource 抽象化の導入タイミング
- 教訓: 複数の独立した診断源（storyteller / textlint / vale ...）を統合する要件が見えた時点で導入する
- 反対: 要件未確定の段階で抽象化を先回りしない（YAGNI）
- Pros: グレースフルデグラデーション（textlint 不在時も storyteller 単独動作）
- Cons: インターフェース 1 層分の呼び出しコスト（診断コスト比で無視可能）

### Pattern 9: Go 並行制御の標準形
- 用途: textlint adapter のような外部プロセス呼び出し adapter
- 構成: `context.WithTimeout` + 直近リクエスト用 cancelFunc 保持 + `time.AfterFunc` debounce + `select` で cancel 監視
- 利点: 新規同種 adapter（vale / カスタム）も同型で書ける

### Pattern 10: E2E 削除の YAGNI 原則
- 削除前: Deno 旧 E2E (cli_*, lsp_*, mcp_*, rag_*)
- 残存戦略: UT + cmd/storyteller/golden_test.go の in-process golden
- 結果: E2E 削除起因の観測リグレッションなし
- 補足: 性能ベンチは E2E ではなく `workflow_dispatch` 限定 bench job として分離（数値ばらつきが PR ゲートに耐えない）

## KPI 達成記録（Snapshot）

| 指標 | 目標 | 実測 |
|------|------|------|
| LSP startup | < 2s | 1.0 ms |
| CLI latency | < 100ms | 1.6–1.9 ms |
| Single binary | < 50MB | 約 3.3 MB |
| Go coverage | >= 70% | 70.7% |

## 関連 Memory

- `go-migration-architecture.md`
- `go-migration-progress-state.md`
- `go-migration-worktree-protocol.md`
- `wave-a3-pattern.md`
- `inprocess-golden-test-strategy.md`
- `subagent-sandbox-go-deny.md`
- `tsparse-limited-scope.md`
- `worktree-merge-conflict-pattern.md`
