# Story View

プロジェクトをHTML形式で可視化します。

## 実行コマンド

```bash
# ローカルサーバーを起動してブラウザで表示
storyteller view --serve

# カスタムポートで起動
storyteller view --serve --port 3000

# ファイル監視モード（変更を自動反映）
storyteller view --serve --watch

# HTMLファイルとして出力
storyteller view --output ./output/

# プレビューのみ（実際には出力しない）
storyteller view --dry-run
```

## オプション一覧

| オプション  | 説明                   | デフォルト |
| ----------- | ---------------------- | ---------- |
| `--serve`   | ローカルサーバーを起動 | -          |
| `--port`    | サーバーのポート番号   | 8080       |
| `--watch`   | ファイル変更を監視     | false      |
| `--output`  | 出力先ディレクトリ     | -          |
| `--path`    | プロジェクトパス       | カレント   |
| `--dry-run` | プレビューのみ         | false      |
| `--timeout` | タイムアウト（秒）     | 30         |

## 使用シーン

1. **執筆中の確認**: `--serve --watch` で常時表示
2. **共有用出力**: `--output` でHTML生成
3. **構造確認**: サーバー起動してブラウザで俯瞰

## 入力

$ARGUMENTS
