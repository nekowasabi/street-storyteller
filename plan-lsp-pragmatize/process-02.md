# Process 02: Provider Factory (NewServerOptions) 実装

## Overview
`lspserver.NewServer(lspserver.ServerOptions{})` が空オプションのため Catalog/Lookup/Locator/Aggregator/Clock がすべて nil。エンティティ解決・hover・definition・診断のすべてが機能していない。`rootUri` を入力にプロジェクトコンテキストを構築するファクトリ `NewServerOptions(ctx, rootUri)` を新設する。

## Affected Files
- `internal/lsp/server/factories.go` (新規)
- `internal/lsp/server/factories_test.go` (新規)
- 参考: `internal/service/lsp_validate.go:47-51` (既存の `Catalog: nil` 慣習)
- 参考: `internal/lsp/providers/hover.go:33,57-65` (Lookup インターフェース・detect.Detect 呼び方)
- 参考: `internal/lsp/providers/definition.go:12` (Locator インターフェース)
- 参考: `internal/lsp/diagnostics/generator.go:41-75,116` (Aggregator + StorytellerSource)
- 参考: `internal/detect/types.go:68` (EntityCatalog interface)

## Implementation Notes
- シグネチャ案: `func NewServerOptions(ctx context.Context, rootURI string) (server.ServerOptions, error)`
- file URI → ローカルパスへのデコードに `net/url` または既存ヘルパ（既存があれば再利用）
- Catalog 本実装が無い領域は `Catalog: nil` で graceful fallback（detect.Detect 側が nil 許容するパターンに合わせる）。Process 02 のスコープでは「nil でも壊れない」を保証する
- Lookup/Locator は project ファイルツリーを走査するシンプル実装。本格実装は別 Process（後続スコープ）
- Aggregator は `diagnostics.Aggregator{ Sources: []diagnostics.Source{ NewStorytellerSource(...) } }` で組む
- Clock は `clock.NewRealClock()` 等の本物（`testkit/clock` の常識的なファクトリを利用）

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] テストケースを作成（実装前に失敗確認）
  - `NewServerOptions(ctx, "file:///tmp/empty-project")` が `error == nil` を返す
  - 戻り値の `Aggregator` は非 nil
  - `Catalog` は nil 許容（fallback として OK）だが構造体は組み立て済み
- [ ] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] `factories.go` を新規作成し `NewServerOptions` を実装
- [ ] file URI → path 変換ヘルパ作成（必要なら）
- [ ] Aggregator 組み立て + StorytellerSource 注入
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] エラーラップを `fmt.Errorf("%w", ...)` で統一
- [ ] パッケージドックを追加
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 01
- Blocks: 03
