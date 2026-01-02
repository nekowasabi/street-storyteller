# Frontmatter Auto-Sync 実装の教訓

## Mission ID: frontmatter-auto-sync-v1

## Date: 2026-01-01

## 概要

原稿メタデータ自動更新機能（FrontmatterSyncService）の実装完了。

## 成功パターン

### 1. TDD厳守による品質確保

- 各Processで必ずテストファーストで開始
- Red → Green → Refactor サイクルを徹底
- 27ステップのテストが全て合格

### 2. 既存コンポーネントの再利用

- `PositionedDetector`: エンティティ検出
- `FrontmatterEditor`: YAML操作
- `EntityValidator`: ID検証
- これにより新規コード量を最小化

### 3. 統一的なインターフェース設計

- CLI, LSP, MCP, watch
  の4つのトリガーポイントから同一のFrontmatterSyncServiceを呼び出し
- 一貫したResult型パターンでエラーハンドリング

## 注意点・教訓

### 1. Partial型とreadonly の相性

```typescript
// NG: read-only プロパティに直接代入
syncOptions.entityTypes = value;

// OK: スプレッド演算子でオブジェクト作成時に設定
const syncOptions: Partial<SyncOptions> = {
  mode: syncMode,
  ...(entityTypes ? { entityTypes } : {}),
};
```

### 2. import パスの確認

- `ToolExecutionContext` の正しいパス: `@storyteller/mcp/tools/tool_registry.ts`
- 誤ったパス使用でTS2307エラー

### 3. Deno テスト権限

- ファイル操作テストには `-A` フラグが必要
- `Deno.makeTempDir()` は `--allow-write` が必要

## 実装ファイル一覧

| ファイル                                         | 役割                                  |
| ------------------------------------------------ | ------------------------------------- |
| src/application/meta/frontmatter_sync_service.ts | コアサービス                          |
| src/cli/modules/meta/sync.ts                     | CLI meta sync コマンド                |
| src/mcp/tools/definitions/manuscript_sync.ts     | MCP manuscript_sync ツール            |
| src/lsp/server/server.ts                         | LSP didSave ハンドラ（追加）          |
| src/cli/modules/meta/watch.ts                    | --sync-frontmatter オプション（追加） |

## 今後の改善案

- Process 50（フォローアップ）でE2Eテストを追加
- 信頼度閾値のプロジェクト設定対応
