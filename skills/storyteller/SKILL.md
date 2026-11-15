---
name: storyteller
description: SaC (StoryWriting as Code) で物語プロジェクトを管理するための storyteller CLI ツールキット。物語の要素 (キャラクター、設定、タイムライン、伏線、plot/sub) を型安全に作成・検証・可視化したいときに必ずこの skill を使ってください。`storyteller generate` で新規プロジェクトをスキャフォールドし、`storyteller element ...` で要素を追加し、`storyteller meta check` / `storyteller lint` / `storyteller lsp validate` で整合性を検証し、`storyteller review` で読者に分かるか・誤字・面白さを確かめ、`storyteller view browser` で HTML 可視化します。ユーザーが「物語を作りたい」「キャラクターを追加したい」「伏線を管理したい」「タイムラインを整理したい」「物語の整合性をチェックしたい」「読者に分かるか確かめたい」「原稿をレビューしてほしい」「読者に読ませたい」「この場面を相談したい」と言ったら、明示的にコマンドを指定していなくても必ずこの skill を使ってください。
---

# storyteller skill

## 概要

`storyteller` は SaC (StoryWriting as Code) コンセプトに基づく物語作成支援ツールです。物語の構造を TypeScript の型として記述し、CLI / LSP / MCP で検証・可視化します。本 skill は storyteller コマンド群を効果的に活用するための運用ガイドです。

## ツール選択フローチャート

ユーザーの意図 → コマンドへのマッピング:

| ユーザーの言いたいこと | 推奨コマンド |
|--------------------|-------------|
| 新しい物語プロジェクトを始めたい | `storyteller generate --name <name> --template basic\|novel\|screenplay` |
| キャラクターを追加したい | `storyteller element character --id <id> --name <表示名> --role protagonist\|antagonist\|supporting\|guest --summary "..." [--display-names <csv>] [--aliases <csv>] [--pronouns <csv>]` |
| 設定 (世界観・場所) を追加したい | `storyteller element setting --name <id> --type location\|culture\|history --summary "..."` |
| タイムラインを作りたい | `storyteller element timeline --name <id> --scope story\|world\|character\|arc` |
| イベントをタイムラインに追加 | `storyteller element event --timeline <id> --title "..." --category plot_point --order N` |
| 伏線を設置 | `storyteller element foreshadowing --name <id> --type chekhov\|prophecy\|hint --planting-chapter <ch> --planting-description "..."` |
| plot/sub を追加 | `storyteller element plot --name <id> --type sub\|main\|parallel --summary "..."` |
| ビート (物語の節目) を追加 | `storyteller element beat --plot <id> --title "..." --structure-position setup\|confrontation\|resolution` |
| 物語の整合性をチェック | `storyteller meta check` |
| メタデータを再生成 | `storyteller meta generate` (既存 src/ から meta を構築) |
| 文章の表記ゆれをチェック | `storyteller lint --path manuscripts/chapter01.md` |
| 文章を自動修正 | `storyteller lint --path manuscripts/chapter01.md --fix` |
| 読者に分かるかを確かめる（AI エージェントは起動しない） | `storyteller review clarity --path manuscripts [--criteria <指紋>] --json` |
| AI エージェントの読者に読ませる | `storyteller review clarity --path manuscripts --team`（終了コード 5 の間は同じ行を打ち直す） |
| 誤字を確かめる | `storyteller review typo --path manuscripts --json` |
| 面白さを読者に聞く | `storyteller review interest --path manuscripts "<頼み>"` |
| 場面や案を相談する | `storyteller review consult --path manuscripts "<相談>"` |
| レビューの保留を解く（著者だけ） | `storyteller review resolve --path manuscripts <agent>:<fact>:<ask\|reask> --accept\|--reject --why "..."` |
| 送る予定だけを見る | `storyteller review <kind> --path manuscripts --dry-run` |
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
キャラクター作成時点で原稿中の呼び方が分かっている場合は、`--display-names "アレン,勇者"`、`--aliases "英雄"`、`--pronouns "彼"` を指定して初期ファイルへ反映します。値は単純なカンマ区切りで、空白と空要素は除外されます。

### 4. 出力フォーマットを目的別に使い分ける

- `--json`: スクリプト連携・パイプ処理用 (全コマンド対応)
- `--format mermaid`: タイムライン・plot/sub の構造を Markdown / Mermaid で可視化
- `view browser`: 統計・カード・グラフ表示で全体把握

### 5. レビューは終了コードで次に動く人を決める

`storyteller review` の詳細は `docs/review.md`。守ることは次のとおり。

- 終了コード: 0 合格（`pass`・`done`）、1 本文を直す（`edit`）、2 呼び出しの誤り、3 著者の番（`author`）、4 環境の失敗（`error`）、5 読者がまだ読んでいる（`reading`）。3 と 4 では本文を直さず、出力を著者に渡す。5 では本文を直さず、同じ行を打ち直す。
- 準備: 命題（`src/propositions/*.ts`）に `ask` 欄（`main`・`question`・`answer.must`・`answer.extra`・`reask`）を書き、原稿に `<!-- shows: <id>:shown -->` の印を置く。期限章は印が最初に出る章。`.storyteller.json` に `review`（`judge`・`launcher.ateam`・`agents`・`stallMinutes`）を書く。`agents[].runtime` は `claude-code`・`codex`・`grok-build` のどれか。
- `/goal` のループでは `--team` を付けない。工程1（構造）と工程2（判定モデル）だけを回し、読者に読ませるかは著者が決める。条件文には、最初に走らせた出力の `criteria` を `--criteria` で写す。
- 直してよいのは本文だけ。命題の `statement`・`ask`、本文の印、名簿、`src/reviews/` は止まる条件なので、エージェントは変えない。変える必要があれば止まって著者に渡す。保留を解く `review resolve` は著者だけが打つ。
- 読者の AI エージェントは作品の外のディレクトリで、写されたファイルだけを読む。読者の役を頼まれた AI エージェントは、作業ディレクトリの `README.md` に従い、ほかのファイルを開かない。
- 判定モデル（OpenRouter）と、各 AI エージェントのサービスに本文を送る。送る前に `--dry-run` で予定を見る。`.storyteller/review/` は git に入れない。

## トラブルシューティング

| 症状 | 原因 / 対処 |
|------|-----------|
| `--name is required` エラー | `storyteller generate --name <識別子>` を必須指定 |
| `meta check` で参照不整合 | 削除済み要素が他要素から参照されている。`view <type> --list` で全体を確認し、関連を手動修正 |
| LSP の検出信頼度が低い | 生成時に `--display-names` / `--aliases` / `--pronouns` を指定する。既存ファイルでは `displayNames` / `aliases` / `pronouns` や `detectionHints.commonPatterns` を追加する |
| textlint が動かない | textlint v14.8.0+ が `npx textlint` で起動可能か確認。グレースフルデグラデーションのため textlint なしでも storyteller 診断は動作します |
| 原稿に登場人物紐付けを設定したい | MCP の `manuscript_binding` ツールを `action: add\|remove\|set`, `entityType: characters\|settings\|...` で実行 |

## 推奨ワークフロー (新規プロジェクト)

1. `storyteller generate --name my_story --template basic` でスキャフォールド
2. `storyteller element character --id protagonist --name "主人公名" --role protagonist --summary "..." --display-names "主人公名,呼び名"` で主要キャラを定義
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
- `docs/review.md` — `storyteller review`（設定・終了コード・保存先・送り先）
- `docs/architecture.md` — 二層構造 (Go 処理エンジン + TS authoring surface) 憲章
