# タイムライン・イベント操作

## View系ツール

### タイムライン表示

```bash
timeline_view              # タイムライン表示
timeline_view --id {id}    # 個別表示
```

### 因果関係・整合性分析

```bash
timeline_analyze           # 全タイムライン分析
```

## 発火ルール

**改稿時に時系列に触れる変更があれば、必ず `timeline_analyze` を実行すること。**

対象: イベント追加・削除、イベント順序変更、時系列に関わる内容修正

## Create系ツール

### timeline_create

- **分類**: WRITE（ユーザー承認必須）
- **用途**: 新規タイムライン作成
- **前提**: `storyteller://timelines` で既存タイムラインを先読み

### event_create

- **分類**: WRITE（ユーザー承認必須）
- **用途**: タイムラインにイベント追加
- **前提**: `timeline_view --id {id}` で該当タイムラインを確認

### event_update

- **分類**: WRITE（ユーザー承認必須）
- **用途**: イベント情報更新
- **前提**: `timeline_view --id {id}` で該当イベントを確認
