# manuscript_binding共通操作ワークフロー

## 操作タイプ使い分け

| action | 用途                         | 例                                   |
| ------ | ---------------------------- | ------------------------------------ |
| add    | 既存リストに追加（重複無視） | 章に新キャラが登場、既存リストに追記 |
| remove | 既存リストから削除           | 誤削除したキャラを除外               |
| set    | リスト完全置換               | FrontMatter を一新、上書き           |

## 対応FrontMatterフィールド

- `characters`: キャラクター ID
- `settings`: 設定 ID
- `foreshadowings`: 伏線 ID
- `timeline_events`: タイムラインイベント ID
- `phases`: キャラクターフェーズ ID
- `timelines`: タイムライン ID
- `reader_shows`: `命題ID:態度`（この章で読者に見せたもの。列の順は章内の提示順。`add` は末尾に足す）
- `reader_requires`: `命題ID:態度` または `命題ID`（この章を読むのに要る前提）

## 実行ステップ

1. **対象エンティティを view で確認**
   - `storyteller://characters` / `storyteller://settings` 等で先読み
   - 使用する ID を確認

2. **manuscript_binding 実行**
   - パラメータ指定: `manuscript` / `action` / `entityType` / `ids`
   - **validate:true を推奨**: ID 存在確認を有効化

3. **実行前にユーザー承認を得る**
   - 特に `set` は破壊的な操作のため注意
