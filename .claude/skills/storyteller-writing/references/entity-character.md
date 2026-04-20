# キャラクター操作

## View系ツール・リソース

### 全キャラクター一覧取得
- **リソース**: `storyteller://characters`
- **用途**: 全キャラ情報を一括取得

### 特定キャラ詳細表示
- **リソース**: `storyteller://character/{id}`
- **クエリ**: `?expand=details` で参照ファイルを解決して表示
- **用途**: キャラ詳細確認

### CLIコマンド
```bash
storyteller view character --details       # 詳細表示
storyteller view character --list          # 一覧表示
```

## Create系ツール

### element_create
- **分類**: WRITE（ユーザー承認必須）
- **用途**: 新規キャラクター作成
- **前提**: `storyteller://characters` で既存キャラを先読み

## 多言語対応

- `displayNames` / `aliases` は多言語配列
- 原稿中で使用される別名（愛称など）を管理
- LSP検出で多言語名も対応

## detectionHints

- キャラクター検出精度を上げるための補助情報
- `commonPatterns` / `excludePatterns` で検出ルールを制御
