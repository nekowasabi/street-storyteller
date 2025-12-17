# Story Character

キャラクターの作成・管理を行います。

## キャラクター作成

引数からキャラクター情報を解析し、適切なコマンドを実行してください。

### 基本作成

```bash
# 基本的なキャラクター作成
storyteller element character --name "キャラ名" --role protagonist --summary "概要"

# 詳細情報付きで作成
storyteller element character --name "キャラ名" --role supporting --summary "概要" --with-details

# トレイト付きで作成
storyteller element character --name "キャラ名" --role antagonist --summary "概要" --traits "勇敢,正義感"
```

### 役割オプション

| 役割 | 説明 |
|------|------|
| `protagonist` | 主人公 |
| `antagonist` | 敵対者 |
| `supporting` | 脇役・サポート |
| `guest` | ゲスト・一時的登場 |

## 引数の解析

ユーザーの入力（$ARGUMENTS）を解析して、以下を特定してください：

1. **名前**: 「〜という名前」「〜を作成」などから抽出
2. **役割**: 「主人公」→protagonist、「悪役」→antagonist など
3. **概要**: 説明文があれば抽出
4. **特徴**: 「特徴は〜」「〜な性格」などから抽出

## 入力

$ARGUMENTS
