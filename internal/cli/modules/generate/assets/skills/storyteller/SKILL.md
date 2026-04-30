---
name: storyteller
description: SaC (StoryWriting as Code) で物語プロジェクトを管理するための storyteller CLI ツールキット。物語の要素 (キャラクター、設定、タイムライン、伏線、サブプロット) を型安全に作成・検証・可視化したいときに必ずこの skill を使ってください。`storyteller generate` で新規プロジェクトをスキャフォールドし、`storyteller element ...` で要素を追加し、`storyteller meta check` / `storyteller lint` / `storyteller lsp validate` で整合性を検証し、`storyteller view browser` で HTML 可視化します。ユーザーが「物語を作りたい」「キャラクターを追加したい」「伏線を管理したい」「タイムラインを整理したい」「物語の整合性をチェックしたい」と言ったら、明示的にコマンドを指定していなくても必ずこの skill を使ってください。
---

# storyteller skill

## 概要

`storyteller` は SaC (StoryWriting as Code) コンセプトに基づく物語作成支援ツールです。物語の構造を TypeScript の型として記述し、CLI / LSP / MCP で検証・可視化します。本 skill は storyteller コマンド群を効果的に活用するための運用ガイドです。

## ツール選択フローチャート

ユーザーの意図 → コマンドへのマッピング:

| ユーザーの言いたいこと | 推奨コマンド |
|--------------------|-------------|
| 新しい物語プロジェクトを始めたい | `storyteller generate --name <name> --template basic\|novel\|screenplay` |
| キャラクターを追加したい | `storyteller element character --name <id> --role protagonist\|antagonist\|supporting\|guest --summary "..."` |
| 設定 (世界観・場所) を追加したい | `storyteller element setting --name <id> --type location\|culture\|history --summary "..."` |
| タイムラインを作りたい | `storyteller element timeline --name <id> --scope story\|world\|character\|arc` |
| イベントをタイムラインに追加 | `storyteller element event --timeline <id> --title "..." --category plot_point --order N` |
| 伏線を設置 | `storyteller element foreshadowing --name <id> --type chekhov\|prophecy\|hint --planting-chapter <ch> --planting-description "..."` |
| プロットを追加 | `storyteller element plot --name <id> --type sub\|main\|parallel --summary "..."` |
| ビート (物語の節目) を追加 | `storyteller element beat --plot <id> --title "..." --structure-position setup\|confrontation\|resolution` |
| 物語の整合性をチェック | `storyteller meta check` |
| メタデータを再生成 | `storyteller meta generate` (既存 src/ から meta を構築) |
| 文章の表記ゆれをチェック | `storyteller lint --path manuscripts/chapter01.md` |
| 文章を自動修正 | `storyteller lint --path manuscripts/chapter01.md --fix` |
| LSP で原稿を検証 | `storyteller lsp validate manuscripts/chapter01.md` |
| エディタ用 LSP 設定をインストール | `storyteller lsp install nvim\|vscode` |
| 物語要素を一覧で見る | `storyteller view character --list` / `view setting --list` / `view timeline --list` 等 |
| 詳細をファイル参照解決して表示 | `storyteller view character --id <id> --details` |
| HTML で可視化 | `storyteller view browser` |
| MCP サーバとして起動 (Claude Desktop 連携) | `storyteller mcp start --stdio` |
| MCP 設定の初期化 | `storyteller mcp init` |

## 重要な原則

### 1. authoring surface は TypeScript で記述する

`src/characters/`, `src/settings/`, `src/timelines/`, `src/foreshadowings/`, `src/plots/` 配下のファイルは TypeScript 型として記述します。`storyteller element ...` コマンドはこれらの型に整合する `.ts` ファイルを自動生成します。手動編集する場合は `@storyteller/types/v2/character.ts` 等の型をインポートしてください。

### 2. メタデータ同期を忘れない

要素を追加・変更したら `storyteller meta check` で整合性を確認します。`--watch` モードで継続的にチェック可能です。エラーが出たら `meta sync` で修復するか、対象ファイルを手動修正します。

### 3. 信頼度システムを活用する

LSP は原稿中のキャラクター/設定参照を自動検出しますが、信頼度 85% 以下は曖昧と判定されます。この場合は `@キャラクター名` 形式で明示参照に変換するか、`displayNames` / `aliases` を型側で拡充します。Code Action (`textDocument/codeAction`) で自動変換提案も得られます。

### 4. 出力フォーマットを目的別に使い分ける

- `--json`: スクリプト連携・パイプ処理用 (全コマンド対応)
- `--format mermaid`: タイムライン・サブプロットの構造を Markdown / Mermaid で可視化
- `view browser`: 統計・カード・グラフ表示で全体把握

## トラブルシューティング

| 症状 | 原因 / 対処 |
|------|-----------|
| `--name is required` エラー | `storyteller generate --name <識別子>` を必須指定 |
| `meta check` で参照不整合 | 削除済み要素が他要素から参照されている。`view <type> --list` で全体を確認し、関連を手動修正 |
| LSP の検出信頼度が低い | `displayNames` / `aliases` を充実させる、`detectionHints.commonPatterns` を追加する |
| textlint が動かない | textlint v14.8.0+ が `npx textlint` で起動可能か確認。グレースフルデグラデーションのため textlint なしでも storyteller 診断は動作します |
| 原稿に登場人物紐付けを設定したい | MCP の `manuscript_binding` ツールを `action: add\|remove\|set`, `entityType: characters\|settings\|...` で実行 |

## 推奨ワークフロー (新規プロジェクト)

1. `storyteller generate --name my_story --template basic` でスキャフォールド
2. `storyteller element character --name protagonist --role protagonist --summary "..."` で主要キャラを定義
3. `storyteller element setting --name main_world --type location --summary "..."` で世界観を定義
4. `storyteller element timeline --name main_story --scope story --summary "..."` でタイムラインを作成
5. `storyteller element event --timeline main_story --title "..." --category plot_point --order 1` でイベント追加
6. `storyteller element foreshadowing --name <id> --type chekhov --planting-chapter chapter_01 --planting-description "..."` で伏線を設置
7. `storyteller meta check` で整合性確認
8. `storyteller view browser` で全体を可視化
9. 原稿を `manuscripts/chapter01.md` に書き、`storyteller lint --path manuscripts/chapter01.md` で表記ゆれ確認
10. エディタには `storyteller lsp install nvim` (or `vscode`) でリアルタイム検証を統合

## 参照ドキュメント

- `docs/cli.md` — CLI コマンド完全リファレンス
- `docs/lsp.md` — LSP プロトコルと診断仕様
- `docs/mcp.md` — MCP Tools / Resources / Prompts 一覧
- `docs/lint.md` — textlint 統合
- `docs/architecture.md` — 二層構造 (Go 処理エンジン + TS authoring surface) 憲章
