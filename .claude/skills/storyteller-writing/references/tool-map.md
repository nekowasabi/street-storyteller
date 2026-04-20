# MCPツール分類マップ

以下は storyteller が提供する21個のMCPツールの分類と詳細です。

## ツール一覧（分類別）

| ツール名 | 分類 | 目的 | 典型入出力 | 前提READ |
|---|---|---|---|---|
| meta_check | READ | プロジェクトメタデータ検証 | 入: なし / 出: メタデータ妥当性チェック結果 | - |
| view_browser | READ | HTMLビジュアル表示 | 入: なし / 出: HTML(統計・カード表示) | - |
| lsp_validate | READ | 原稿の参照整合性検証 | 入: ファイルパス / 出: 診断リスト | - |
| lsp_find_references | READ | シンボル参照検索 | 入: シンボル名 / 出: 参照位置リスト | - |
| timeline_view | READ | タイムライン表示 | 入: ID(オプション) / 出: タイムライン構造JSON | - |
| timeline_analyze | READ | 因果関係・整合性分析 | 入: なし / 出: 矛盾検出リスト | - |
| foreshadowing_view | READ | 伏線表示(一覧/個別/フィルタ) | 入: --list/--id/--status / 出: 伏線リストJSON | - |
| subplot_view | READ | サブプロット表示 | 入: --list/--id/--format / 出: サブプロット構造JSON | - |
| **ユーザー承認必須: element_create** | WRITE | エンティティ作成(character/setting/timeline/foreshadowing/subplot) | 入: --name/--type/--summary等 / 出: 作成結果ID | view_browser / 種別別view |
| **ユーザー承認必須: timeline_create** | WRITE | タイムライン作成 | 入: --name/--scope/--summary / 出: timeline ID | timeline_view --list |
| **ユーザー承認必須: event_create** | WRITE | イベント作成 | 入: --timeline/--title/--category / 出: event ID | timeline_view --id {id} |
| **ユーザー承認必須: event_update** | WRITE | イベント更新 | 入: --id/--title等 / 出: 更新結果 | timeline_view --id {id} |
| **ユーザー承認必須: foreshadowing_create** | WRITE | 伏線作成 | 入: --name/--type/--planting-chapter / 出: foreshadowing ID | foreshadowing_view --list |
| **ユーザー承認必須: subplot_create** | WRITE | サブプロット作成 | 入: --name/--type/--summary / 出: subplot ID | subplot_view --list |
| **ユーザー承認必須: beat_create** | WRITE | ビート作成 | 入: --subplot/--title/--summary / 出: beat ID | subplot_view --id {id} |
| **ユーザー承認必須: intersection_create** | WRITE | インターセクション作成 | 入: --source-subplot/--target-subplot / 出: intersection ID | subplot_view --list |
| **ユーザー承認必須: manuscript_binding** | WRITE | FrontMatter操作(add/remove/set) | 入: --manuscript/--action/--entityType/--ids / 出: 操作結果 | storyteller://characters等で先読み |
| **ユーザー承認必須: meta_generate** | WRITE | メタデータ自動生成 | 入: --type(character等) / 出: テンプレートJSON | meta_check で現状確認 |

## DESTRUCTIVE操作

該当なし。本スキルではDESTRUCTIVE操作は扱いません。

## MCPリソース（READ専用）

| リソース | 内容 | 先読みタイミング |
|---|---|---|
| storyteller://project | プロジェクト全体構成 | スキル起動時(必須) |
| storyteller://characters | キャラクター一覧 | キャラ操作前、またはHallucination予防 |
| storyteller://character/{id} | 特定キャラ詳細 | 該当キャラを指す前 |
| storyteller://settings | 設定一覧 | 設定操作前 |
| storyteller://setting/{id} | 特定設定詳細 | 該当設定を指す前 |
| storyteller://timelines | タイムライン一覧 | 時系列確認前 |
| storyteller://timeline/{id} | 特定タイムライン詳細 | 該当タイムラインを指す前 |
| storyteller://foreshadowings | 伏線一覧 | 未回収検出前(必須) |
| storyteller://foreshadowing/{id} | 特定伏線詳細 | 該当伏線を指す前 |
| storyteller://subplots | サブプロット一覧 | サブプロット操作前 |
| storyteller://subplot/{id} | 特定サブプロット詳細 | 該当サブプロット内容確認前 |
