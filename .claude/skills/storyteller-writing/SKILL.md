---
name: storyteller-writing
description: storyteller MCPサーバーが利用可能で、物語プロジェクト（characters/settings/foreshadowings/timelines/subplots を持つ）の原稿(.md)を改稿または初稿生成する際に使用する。キャラクター名・設定名・伏線の整合性を保ち、未回収伏線やタイムライン矛盾の見落としを減らす。
---

# storyteller-writing スキル

## 目的

storyteller
MCPサーバーを活用して、物語プロジェクト内の原稿（Markdown）を改稿または初稿生成する際のワークフローを提供します。

**成功指標**:
キャラクター名・設定名・伏線の整合性を保ち、未回収伏線やタイムライン矛盾の見落としを削減すること。

## 起動時必須チェック

このスキル実行時は、以下の順序で storyteller MCP
リソース・ツールにアクセスしてください。

1. **最初に実行**: `storyteller://project`
   リソースを読み込み、プロジェクト構成を把握
2. **未取得の場合の先読み**:
   - `storyteller://characters` (全キャラクター)
   - `storyteller://settings` (全設定)
   - `storyteller://foreshadowings` (全伏線)
   - `storyteller://timelines` (全タイムライン)
   - `storyteller://subplots` (全サブプロット)

## Hallucination禁止ルール

**原稿に新しいキャラクター・設定・伏線を書く前に、必ず view
系ツールで既存名を確認してください。**

- **存在しない名前の検出**: 新規キャラ/設定/伏線名を提案する際は、必ず
  `storyteller://characters` などで先に確認
- **多言語配列対応**: `displayNames` / `aliases`
  は多言語配列として扱い、デフォルト日本語
- **存在確認の例外処理**:
  存在しない場合はユーザーに確認メッセージを送出し、承認を得てから
  `element_create` を実行

## Read/Write/Destructive 分類概要

MCPツールは以下の3分類に整理されています。詳細は `references/tool-map.md`
を参照。

- **READ系**: 情報読み込みのみ。制限なし。
- **WRITE系**: エンティティ作成・更新。**実行前にユーザー承認が必須**。
- **DESTRUCTIVE系**: 削除操作。本スキルでは扱いません。

## 能動検証トリガー義務

以下のタイミングで必ず検証を実行してください。

- **原稿保存/シーン完了のたびに**: `lsp_validate` を実行
- **改稿完了時**: `timeline_analyze` と
  `foreshadowing_view --status=planted`（未回収伏線チェック）も実行

## ワークフロー選択ロジック

ユーザー発話パターンから適用すべき workflow を選択します。

| ユーザーの発話例                                      | 適用ワークフロー               | 参照先                    |
| ----------------------------------------------------- | ------------------------------ | ------------------------- |
| 「既存原稿を改稿したい」「矛盾を修正してほしい」      | 改稿ワークフロー               | `workflow-revision.md`    |
| 「整合性を確認して」「矛盾を検出して」                | 整合性検証ワークフロー         | `workflow-integrity.md`   |
| 「新しいシーンを書いて」「初稿を生成して」            | シーン初稿生成ワークフロー     | `workflow-scene-draft.md` |
| 「FrontMatterに情報を追加」「エンティティを紐付けて」 | バインディング操作ワークフロー | `workflow-binding.md`     |

## Router（references読み分け）

| 参照ファイル              | 参照時機                              | 用途                                      |
| ------------------------- | ------------------------------------- | ----------------------------------------- |
| `tool-map.md`             | MCPツール分類・詳細を確認する際       | ツール選択、入出力形式確認                |
| `workflow-revision.md`    | 既存原稿の改稿依頼                    | 改稿の4フェーズ手順、見落とし削減チェック |
| `workflow-integrity.md`   | 整合性検証依頼                        | 検証3種の実行タイミング、矛盾パターン例   |
| `workflow-scene-draft.md` | シーン初稿生成依頼                    | 情報収集→執筆→検証の流れ                  |
| `workflow-binding.md`     | FrontMatter操作依頼                   | manuscript_binding の操作方法             |
| `entity-character.md`     | キャラクター操作                      | キャラビュー、create、多言語対応          |
| `entity-setting.md`       | 設定操作                              | 設定ビュー、create、type フィルタ         |
| `entity-foreshadow.md`    | 伏線操作・未回収検出                  | 伏線ビュー、create、見落とし削減の要      |
| `entity-timeline.md`      | タイムライン・イベント操作            | timeline_view、timeline_analyze           |
| `entity-subplot.md`       | サブプロット・beat・intersection 操作 | subplot_view、beat/intersection_create    |

## Out of Scope

本スキルでは以下を扱いません。

- RAG機能（廃止予定）
- textlint連携（別スキル）
- Neovim Denops連携
- 破壊的削除操作（ファイル削除等）
