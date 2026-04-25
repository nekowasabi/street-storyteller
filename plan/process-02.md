# Process 2: GoドメインとProject Loader基盤

## Overview
TypeScript/Deno に依存しない Go の domain model と project loader を作る。CLI/LSP/MCP が直接ファイル形式を触らず、共有 service 経由でデータを読む構造にする。

## Affected Files
- `src/type/v2/character.ts:95` - Character struct の元定義
- `src/type/v2/character_phase.ts:111` - CharacterPhase/InitialState struct の元定義
- `src/type/v2/setting.ts:58` - Setting struct の元定義
- `src/type/v2/foreshadowing.ts:113` - Foreshadowing struct の元定義
- `src/type/v2/timeline.ts:92` - TimelineEvent/Timeline struct の元定義
- `src/type/v2/subplot.ts:176` - Subplot struct の元定義
- `src/application/subplot/subplot_file_parser.ts:71` - 既存のTS object literal 読み取りパターン
- `src/lsp/project/project_context_manager.ts` - Go版 project loader の参考

## Implementation Notes
- 新規 Go 配置案:
  - `cmd/storyteller/`
  - `internal/domain/`
  - `internal/project/`
  - `internal/external/`
  - `internal/testkit/`
- domain は CLI/LSP/MCP に依存させない。
- project loader は `ProjectRoot`, `EntityStore`, `EntityLoader`, `ManifestLoader` を分ける。
- TypeScript object literal を読む場合、既存 parser の正規表現方式をそのまま拡張しすぎない。サポート範囲を fixture で固定する。

---

## Red Phase: テスト作成と失敗確認

- [x] ブリーフィング確認
- [x] Go側に domain fixture 読み込みテストを作成
  - Character/Setting/Foreshadowing/Timeline/Subplot が読み込めること
  - 日本語ファイル名と file reference を扱えること
- [x] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [x] Go module を初期化
- [x] `internal/domain` に struct/enum を追加
- [x] `internal/project` に manifest/entity loader を追加
- [x] fixture から最小 entity を読み込む
- [x] エラー型を code/message 付きに統一
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [x] domain と loader の循環依存を確認
- [x] parser/loader の責務を分割
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 1
- Blocks: 3, 4, 5
