# Story Check

原稿の整合性チェックを実行し、結果を分析します。

## 実行コマンド

以下のコマンドを実行して結果を取得してください：

```bash
# manuscripts ディレクトリ全体を検証
storyteller lsp validate --dir manuscripts --recursive

# 特定のファイルを検証
storyteller lsp validate --path $ARGUMENTS

# JSON形式で詳細を取得
storyteller lsp validate --dir manuscripts --recursive --json
```

## 結果の分析

検証結果を以下の観点で分析してください：

### エラー分類

1. **参照エラー**: 未定義のキャラクターや設定への参照
2. **整合性警告**: 低信頼度の暗黙的参照
3. **情報**: 改善提案

### 修正優先度

| 優先度 | 種類    | アクション         |
| ------ | ------- | ------------------ |
| 高     | error   | 即座に修正が必要   |
| 中     | warning | 確認して対応を検討 |
| 低     | info    | 時間があれば改善   |

## 出力フォーマット

```markdown
## 検証結果サマリー

- エラー: X件
- 警告: Y件
- 情報: Z件

### 主要な問題

1. **[ファイル名]** (行番号)
   - 問題: [説明]
   - 提案: [修正方法]

### 推奨アクション

1. [優先度の高いアクション]
2. [次のアクション]
```

## 対象

$ARGUMENTS
