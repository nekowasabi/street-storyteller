# 伏線操作（見落とし削減の要）

## View系ツール

### 伏線一覧取得

```bash
foreshadowing_view --list              # 全伏線
foreshadowing_view --list --status=planted|resolved|partially_resolved|abandoned
```

### ステータス別フィルタ

- `planted`: 未回収
- `resolved`: 回収済み
- `partially_resolved`: 部分的に回収
- `abandoned`: 放棄

### 個別表示

```bash
foreshadowing_view --id {id}
```

## 未回収検出ルール（重要）

**改稿完了時は必ず以下を実行:**

1. `foreshadowing_view --list --status=planted` で未回収伏線一覧を取得
2. 各伏線の `plannedResolutionChapter` を確認
3. 原稿の現在章と照合
4. 回収予定章を超えている場合は警告

## Create系ツール

### foreshadowing_create

- **分類**: WRITE（ユーザー承認必須）
- **用途**: 新規伏線作成
- **前提**: `storyteller://foreshadowings` で既存伏線を先読み

## 伏線タイプ一覧

| タイプ      | 説明           | 例                         |
| ----------- | -------------- | -------------------------- |
| hint        | ヒント         | 不吉な予感、意味深な会話   |
| prophecy    | 予言           | 王の予言、神託             |
| mystery     | 謎             | 消えた遺産、正体不明の人物 |
| symbol      | 象徴           | 繰り返し登場するモチーフ   |
| chekhov     | チェーホフの銃 | 壁に掛かった剣、古い地図   |
| red_herring | レッドヘリング | 意図的な誤誘導             |
