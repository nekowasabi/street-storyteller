# storyteller全機能テストシナリオ レポート

## 概要

歴史ミステリー短編「古い手紙の秘密」を題材に、storytellerコマンドの全機能をTDD形式でテストしました。

- **実行日時**: 2025-12-16
- **テスト結果**: **全テスト成功** (5 passed, 11 steps)
- **対象プロジェクト**: `samples/mistery/old-letter-mystery`

## テスト結果サマリー

| プロセス | テスト項目               | 結果 | 備考                         |
| -------- | ------------------------ | ---- | ---------------------------- |
| process1 | プロジェクト初期化       | OK   | generateコマンド正常動作     |
| process2 | キャラクター定義         | OK   | 2名作成成功                  |
| process3 | 設定定義                 | OK   | 2種作成成功                  |
| process4 | Timeline・イベント定義   | OK   | Timeline + 2イベント作成成功 |
| process5 | チャプター・プロット定義 | SKIP | コマンド未実装のためスキップ |
| process6 | 原稿作成・メタデータ     | OK   | Frontmatter形式で検証成功    |
| process7 | LSP検証                  | OK   | validate --json 正常動作     |
| process8 | ビュー出力               | OK   | HTML生成成功                 |
| process9 | JSON出力テスト           | OK   | --json フラグ正常動作        |

## 生成されたファイル一覧

```
samples/mistery/old-letter-mystery/
├── src/
│   ├── characters/
│   │   ├── yamashita_ryusuke.ts
│   │   ├── yamashita_chiyyo.ts
│   │   └── main_character.ts (テンプレート)
│   ├── settings/
│   │   ├── yamashita_house.ts
│   │   └── library.ts
│   └── timelines/
│       └── letter_incident_timeline.ts (2イベント付き)
├── manuscripts/
│   ├── chapter01.md
│   ├── chapter02.md
│   └── chapter03.md
└── index.html (view出力)
```

## 発見された問題と修正

### 1. eventコマンドの--orderオプション (修正済み)

**問題**: `--order` オプションが文字列として渡され、数値型チェックに失敗していた

**修正箇所**: `src/cli/modules/element/event.ts:201-210`

```typescript
// 修正前
if (args.order === undefined || typeof args.order !== "number") {

// 修正後
const orderValue = typeof args.order === "string"
  ? parseInt(args.order, 10)
  : args.order;
if (orderValue === undefined || isNaN(orderValue)) {
```

### 2. eventカテゴリの制限

**発見**: `discovery` カテゴリは未定義のため使用不可

**有効なカテゴリ**: `plot_point`, `character_event`, `world_event`, `backstory`,
`foreshadow`, `climax`, `resolution`

### 3. テンプレートのインポートパス問題 (修正済み)

**問題**: `main_character.ts` のインポートパスが壊れていた

**修正**: `@storyteller/types/v2/character.ts` に修正

## コマンド実行例

### プロジェクト生成

```bash
deno run main.ts generate --name "old-letter-mystery" --template novel --path ./samples/mistery
```

### キャラクター作成

```bash
deno run main.ts element character \
  --name "yamashita_ryusuke" \
  --role "protagonist" \
  --summary "大学教授で歴史家。矢島家の手紙消失事件を調査する"
```

### Timeline作成

```bash
deno run main.ts element timeline \
  --name "letter_incident_timeline" \
  --scope "story" \
  --summary "現代での調査から過去への遡行"
```

### イベント追加

```bash
deno run main.ts element event \
  --timeline "letter_incident_timeline" \
  --title "手紙消失の発見" \
  --category "plot_point" \
  --order 1
```

### メタデータチェック

```bash
deno run main.ts meta check --dir manuscripts --json
```

### LSP検証

```bash
deno run main.ts lsp validate --file manuscripts/chapter01.md --json
```

## Frontmatter形式

原稿ファイルには以下のFrontmatter形式が必要:

```yaml
---
storyteller:
  chapter_id: ch_01
  title: 第1章 消失
  order: 1
  characters:
    - yamashita_ryusuke
    - yamashita_chiyyo
  settings:
    - yamashita_house
    - library
---
```

## 今後の課題

1. **chapter/plotコマンドの実装**: process5でスキップしたコマンド群
2. **lsp find-referencesコマンドの実装**: 参照検索機能
3. **eventカテゴリの拡張**: `discovery` などの追加カテゴリ

## 結論

storyteller CLIの主要機能（generate, element character/setting/timeline/event,
meta check, lsp validate, view,
--json出力）は正常に動作することが確認されました。

テストファイル: `tests/scenario/storyteller_scenario_test.ts`
