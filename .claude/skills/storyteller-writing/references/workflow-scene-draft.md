# シーン初稿生成ワークフロー

## 発火条件

- 新規シーン・章の生成依頼
- 既存シーンの拡張・追記

## フェーズ①情報収集

1. **登場キャラ確認**
   - `storyteller://characters` リソースで全キャラを取得
   - 各キャラの `displayNames` / `aliases` を確認
   - 使用する呼び方を決定

2. **関連設定確認**
   - `storyteller://settings` リソースで関連設定を取得
   - シーン舞台となる設定の詳細を確認

3. **関連伏線確認**
   - `foreshadowing_view --list` で該当シーン関連の伏線を確認
   - 伏線の `planting` 情報で既に設置済みか確認

4. **サブプロット beat 確認**
   - `subplot_view --id {subplot_id}` で該当サブプロットの beat を確認
   - シーンが該当サブプロットのどの beat に相当するか把握

## フェーズ②執筆

- 収集した情報に基づいて原稿生成
- キャラ名・設定名は確認済みの名前を使用

## フェーズ③manuscript_binding

1. **FrontMatter に情報を紐付け**
   - `manuscript_binding` ツール実行
   - action: `add`
   - entityType: `characters` / `settings` / `foreshadowings` /
     `timeline_events`
   - 該当エンティティの ID をリスト指定

2. **validate:true で実行**
   - ID 存在確認を有効化

## フェーズ④検証

1. `lsp_validate` 実行
   - 参照整合性エラーがないか確認

## Hallucination禁止

**新規キャラ・設定・伏線名は必ず view で先に確認すること。**

存在しない名前を提案する場合は、ユーザー承認を取得してから `element_create`
を実行。
