# 改稿ワークフロー

## 発火条件

- 既存原稿(.md)の編集・改稿依頼
- 文脈整合性の確認依頼
- キャラ・設定矛盾の検出

## フェーズ①現状把握

1. `lsp_validate` 実行（原稿ファイルパス指定）
   - 参照整合性エラーを検出
2. 原稿ファイルを読み込み
   - 実際の内容を確認
3. FrontMatter 確認
   - `characters` / `settings` / `foreshadowings` / `timeline_events`
     フィールドを確認
   - 既に紐付けられているエンティティを把握

## フェーズ②矛盾抽出

1. `timeline_analyze` 実行
   - タイムラインの因果関係・整合性を分析
   - 時系列の矛盾を検出
2. `foreshadowing_view --status=planted` で未回収伏線リストを取得
   - 現在章と `plannedResolutionChapter` を照合
3. キャラ造形ズレをチェック
   - `storyteller://characters` で登場キャラの `displayNames` / `aliases` を確認
   - 原稿内の名前呼び方が一貫しているか確認
4. 設定用語揺れをチェック
   - `storyteller://settings` で使用中の設定名を確認
   - 原稿内での呼称が統一されているか確認

## フェーズ③改稿提案

1. 差分ベースで改稿案を作成
   - lsp_validate と timeline_analyze で検出された矛盾の改稿案
   - キャラ・設定の呼称統一案
2. 見落とし削減チェックリスト実施
   - [ ] 未回収伏線の放置はないか？
   - [ ] タイムライン矛盾はないか？
   - [ ] キャラの口調・性格が一貫しているか？
   - [ ] 設定の用語・ルールが揺れていないか？

## フェーズ④検証

1. 改稿案をユーザーに提示
   - **ユーザー承認を得てから実行**
2. 改稿内容を適用
   - 原稿を更新
   - 必要に応じて `manuscript_binding` で FrontMatter を更新
3. 再度 `lsp_validate` 実行
4. 再度 `timeline_analyze` 実行
5. 再度 `foreshadowing_view --status=planted` で未回収伏線を確認

## 多言語対応

- `displayNames` / `aliases` は多言語配列として扱う
- 事前に `storyteller://characters`
  で確認し、原稿で使用される名前の対応を把握してから改稿を進める
