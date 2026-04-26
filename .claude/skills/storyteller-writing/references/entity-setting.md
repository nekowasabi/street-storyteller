# 設定操作

## View系ツール・リソース

### 全設定一覧取得

- **リソース**: `storyteller://settings`
- **用途**: 全設定情報を一括取得

### 特定設定詳細表示

- **リソース**: `storyteller://setting/{id}`
- **クエリ**: `?expand=details` で参照ファイルを解決して表示
- **用途**: 設定詳細確認

### CLIコマンド

```bash
storyteller view setting --list                    # 一覧表示
storyteller view setting --list --type location    # タイプでフィルタ
storyteller view setting --details                 # 詳細表示
```

## Create系ツール

### element_create

- **分類**: WRITE（ユーザー承認必須）
- **用途**: 新規設定作成
- **前提**: `storyteller://settings` で既存設定を先読み
