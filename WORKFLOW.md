# 執筆ワークフロー（企画 → 完成）

street-storyteller を使って、物語を「企画」から「完成」まで進めるための標準ワークフローです。
SaC（StoryWriting as Code）の思想に従い、**物語の構造を型で定義 → 原稿を書く → 自動検証する** という3ステップのサイクルを各フェーズで回します。

---

## 0. 全体像

| Phase | 目的 | 主な成果物 | 主に使うコマンド |
|---|---|---|---|
| 1. 企画 | プロジェクト雛形と目的の定義 | `.storyteller.json`, `story.config.ts`, `drafts/ideas.md` | `storyteller generate` |
| 2. 世界構築 | キャラクター・設定の定義 | `src/characters/*.ts`, `src/settings/*.ts` | `storyteller element character/setting` |
| 3. 時系列設計 | タイムライン・イベント・伏線の配置 | `src/timelines/*.ts`, `src/foreshadowings/*.ts` | `storyteller element timeline/event/foreshadowing` |
| 4. プロット構造 | プロット・ビート・交差点の構築 | `src/plots/*.ts` | `storyteller element plot/beat/intersection` |
| 5. 執筆 | 原稿の作成と entity 紐付け | `manuscripts/chapter*.md` | `manuscript_binding`（MCP）/ エディタ |
| 6. 検証 | LSP / lint / 整合性チェック | 診断レポート | `storyteller lsp validate`, `lint`, `meta check` |
| 7. 完成 | 可視化・最終出力・配布 | HTML / Mermaid / 完成原稿 | `storyteller view browser`, `view list`, `lint --fix` |

各 Phase は **「定義 → 書く → 検証」** の小サイクルを回しながら進めます。前フェーズに戻るのは正常で、特に Phase 4〜6 は反復することが前提です。

---

## Phase 1: 企画（プロジェクト初期化）

### 1.1 プロジェクト雛形の生成

```bash
# 基本テンプレート
storyteller generate --name my-story --path ~/stories

# 長編向け
storyteller generate --name my-story --path ~/stories --template novel

# 脚本向け
storyteller generate --name my-story --path ~/stories --template screenplay

cd ~/stories/my-story
```

このコマンドが作るディレクトリ:

```
my-story/
├── .storyteller.json       # プロジェクト識別子（v1.0.0）
├── .mcp.json               # Claude Desktop / Code 連携用
├── story.ts                # メインの StoryTeller インターフェース
├── story.config.ts         # テンプレート設定
├── deno.json               # import map（@storyteller/）
├── src/
│   ├── characters/         # キャラクター定義（TS）
│   ├── settings/           # 場所・文化・組織
│   ├── timelines/          # 時系列
│   ├── foreshadowings/     # 伏線
│   ├── plots/           # プロット
│   ├── chapters/, themes/, structure/, purpose/
├── manuscripts/
│   └── chapter01.md        # 最初のチャプター雛形
├── drafts/
│   └── ideas.md            # ブレスト用フリーフォーム
└── output/, tests/
```

### 1.2 物語のコアアイデアを書き出す（自由記述）

`drafts/ideas.md` に「何を書きたいか」を箇条書きで残します。
このファイルは型定義の対象外ですが、Phase 2 以降で `summary` フィールドの素材になります。

### 1.3 MCP 経由でブレストする（任意）

Claude Desktop / Claude Code から `project_setup_wizard` プロンプトを呼ぶと、企画段階の対話を支援してくれます。

```
prompt: project_setup_wizard
arguments: { genre: "ファンタジー", scale: "短編" }
```

> **チェックポイント**: `.storyteller.json` が存在し、`storyteller view list` がエラーなく動けば Phase 1 完了です（まだエンティティはゼロでも OK）。

---

## Phase 2: 世界構築（キャラクター・設定）

### 2.1 キャラクター作成

```bash
# 主人公
storyteller element character \
  --id hero --name "勇者アレン" --role protagonist \
  --summary "村の少年だったが、世界の崩壊を予感して旅立つ"

# 敵対者
storyteller element character \
  --id demon_lord --name "魔王ザーグ" --role antagonist \
  --summary "千年前に封印された存在"

# 助力者・脇役
storyteller element character --id mentor --name "賢者エリス" --role supporting
storyteller element character --id innkeeper --name "宿の主人" --role guest
```

生成される `src/characters/hero.ts`:

```typescript
import type { Character } from "@storyteller/types/v2/character.ts";

export const hero: Character = {
  id: "hero",
  name: "勇者アレン",
  role: "protagonist",
  traits: [],
  relationships: {},
  appearingChapters: [],
  summary: "村の少年だったが、世界の崩壊を予感して旅立つ",
};
```

### 2.2 詳細を肉付け（手編集）

`traits`、`relationships`、`displayNames`（原稿で使う名前のバリエーション）、`detectionHints`（LSP 検出用）を手で書き加えます。

```typescript
export const hero: Character = {
  id: "hero",
  name: "勇者アレン",
  role: "protagonist",
  traits: ["勇敢", "純朴", "迷いやすい"],
  relationships: {
    mentor: "respect",
    demon_lord: "enemy",
  },
  displayNames: ["アレン", "勇者", "少年"],  // 原稿中の表記ゆれ
  appearingChapters: [],
  summary: "...",
};
```

### 2.3 設定（場所・文化・組織）

```bash
storyteller element setting --id royal_capital --name "王都ヴェルデン"
storyteller element setting --id forest --name "禁忌の森"
storyteller element setting --id academy --name "魔法学院"
```

長文の歴史・地理は `details: { history: { file: "src/settings/details/royal_capital_history.md" } }` 形式でファイル分離できます（ハイブリッド方式）。

### 2.4 確認

```bash
storyteller view character --id hero
storyteller view character --id hero --details   # ファイル参照を解決
storyteller view setting --list                  # 全設定の一覧
storyteller view setting --list --type location  # 場所のみ
```

> **チェックポイント**: `view list` で全エンティティが表示でき、`relationships` の参照先 ID が全て存在することを確認します。

### 2.5 詳細の肉付け（ハイブリッド方式）

`storyteller element` で生成されるファイルは **必須メタデータ + `summary`** だけの最小構成です。詳細情報は `details` フィールドにオプショナルで追加します。**3つの方法**を場面に応じて使い分けます。

| 方法 | 適する場面 | 例 |
|---|---|---|
| **A. インライン文字列** | 200字以内の短い説明 | `description: "黒髪に青い瞳"` |
| **B. ファイル分離** | 数百字以上の長文・履歴・心理描写 | `backstory: { file: "src/characters/details/hero_backstory.md" }` |
| **C. MCP プロンプトで下書き → 配置** | アイデア未確定／AI 支援したい | `character_brainstorm` プロンプト → 結果を `.md` 保存 → `{ file: ... }` で参照 |

#### Character 型の `details` フィールド

```typescript
details?: {
  description?: string | { file: string };  // 概要（summary より詳細）
  appearance?:  string | { file: string };  // 外見
  personality?: string | { file: string };  // 性格
  backstory?:   string | { file: string };  // 過去
  development?: CharacterDevelopment;        // 成長アーク
};
```

#### Setting 型の `details` フィールド

```typescript
details?: {
  description?: string | { file: string };
  geography?:   string | { file: string };
  history?:     string | { file: string };
  culture?:     string | { file: string };
  politics?:    string | { file: string };
  economy?:     string | { file: string };
  inhabitants?: string | { file: string };
  landmarks?:   string | { file: string };
};
```

#### 例: インラインとファイル分離の併用

```typescript
// src/characters/hero.ts
import type { Character } from "@storyteller/types/v2/character.ts";

export const hero: Character = {
  id: "hero",
  name: "勇者アレン",
  role: "protagonist",
  traits: ["勇敢", "純朴"],
  relationships: { mentor: "respect" },
  appearingChapters: [],
  summary: "村の少年だったが世界の崩壊を予感して旅立つ",

  details: {
    appearance:  "黒髪、青い瞳。背は高くないが筋肉質",        // インライン（短文）
    personality: "迷いやすいが、いざという時は迷わない",       // インライン（短文）
    backstory:   { file: "src/characters/details/hero_backstory.md" },  // ファイル分離（長文）
  },
};
```

外出ししたファイル:

```markdown
<!-- src/characters/details/hero_backstory.md -->
# アレンの過去

3歳の時に村が魔物に襲われ、両親を失った。
育ての親である賢者エリスから剣術と魔法の基礎を学んだ。
12歳の時に祠で古びた剣を見つけ……
```

#### 例: 設定（場所）

```typescript
// src/settings/royal_capital.ts
export const royalCapital: Setting = {
  id: "royal_capital",
  name: "王都ヴェルデン",
  type: "location",
  summary: "ヴェルデン王国の首都",
  details: {
    geography: "三方を山に囲まれ、南に港を持つ",
    history:   { file: "src/settings/details/royal_capital_history.md" },
    culture:   { file: "src/settings/details/royal_capital_culture.md" },
    politics:  "王制。元老院が立法を担う",
  },
};
```

#### 例: 伏線の `excerpt`（原稿引用）

伏線の `planting` / `resolutions` も同じくハイブリッド対応です。

```typescript
export const ancientSword: Foreshadowing = {
  id: "ancient_sword",
  name: "古びた剣",
  type: "chekhov",
  summary: "祠の床下から発見される錆びた剣",
  planting: {
    chapter: "chapter_01",
    description: "祠の床下から発見される錆びた剣",
    excerpt: { file: "src/foreshadowings/excerpts/sword_planting.md" },
  },
  status: "planted",
  importance: "major",
};
```

#### 詳細の確認（ファイル参照を解決）

`{ file: "..." }` 形式で外出ししたものは、`--details` オプションで中身を展開して表示できます。

```bash
storyteller view character --id hero --details
storyteller view setting   --id royal_capital --details
```

MCP リソース経由でも同じ展開が可能です（`?expand=details` クエリ）:

```
storyteller://character/hero?expand=details
storyteller://setting/royal_capital?expand=details
```

#### 推奨パターン: 段階的詳細化

```
Phase 2 で element 作成 ─────── summary のみ埋める（最小構成）
       ↓
Phase 5 で執筆を始める ────── 必要になったキャラ／設定だけ details を追加
       ↓
長文化してきたら ─────────── { file: "..." } に切り出す
       ↓
AI に文脈を渡す時 ────────── view --details で展開して取得
```

最初から全項目を埋めようとせず、**「執筆中に必要になった情報だけ書く」** ことで構造の肥大化を防げます。

#### MCP プロンプトを使った下書き

Claude Desktop / Code 経由で AI に下書きを依頼:

| プロンプト | 用途 |
|---|---|
| `character_brainstorm` | キャラクターの背景・性格をブレスト |
| `plot_suggestion` | プロット展開の提案 |
| `scene_improvement` | 既存シーンの改善案 |
| `consistency_fix` | 矛盾検出と修正案 |

得られた出力を `src/<kind>/details/<id>_<field>.md` に保存し、対応するエンティティの `details.<field>` を `{ file: "..." }` で参照すれば完了です。

> **チェックポイント**: `view <kind> --id <id> --details` でファイル参照が正しく解決されること、未存在ファイルへの参照がないこと（`storyteller meta check` で検出されます）を確認します。

---

## Phase 3: 時系列設計（タイムライン・イベント・伏線）

### 3.1 タイムラインの骨格

```bash
# 物語全体のメインタイムライン
storyteller element timeline \
  --id main_story --name "本編" --scope story \
  --summary "勇者の旅立ちから魔王封印解除まで"

# 世界史
storyteller element timeline --id world_history --scope world \
  --name "ヴェルデン年代記"

# キャラクター固有のタイムライン
storyteller element timeline --id hero_arc --scope character \
  --name "アレンの成長"
```

### 3.2 イベントの追加

CLI 経由でも可能ですが、引数が多いため **MCP の `event_create` ツール** を使うほうが実用的です。

```bash
# CLI で
storyteller element event \
  --timeline main_story --title "村の襲撃" \
  --category plot_point --order 1
```

または Claude 経由で:

```json
{
  "tool": "event_create",
  "arguments": {
    "timelineId": "main_story",
    "title": "村の襲撃",
    "category": "plot_point",
    "order": 1,
    "summary": "故郷の村が魔物に襲撃され、両親を失う",
    "characters": ["hero"],
    "settings": ["hometown"]
  }
}
```

### 3.3 因果関係を設計する

イベント間の `causedBy` / `causes` を埋めることで「なぜそれが起きたか」がコードで追跡可能になります。MCP プロンプト `causality_analysis` で AI に提案させると効率的です。

### 3.4 伏線の配置

```bash
storyteller element foreshadowing \
  --id ancient_sword \
  --name "古びた剣" \
  --type chekhov \
  --planting-chapter chapter_01 \
  --planting-description "祠の床下から発見される錆びた剣" \
  --importance major \
  --planned-resolution-chapter chapter_10 \
  --related-characters hero,mentor \
  --related-settings forest
```

伏線タイプの使い分け:

| type | 使う場面 |
|---|---|
| `chekhov` | 物理的な小道具（後で使う剣・鍵・薬） |
| `prophecy` | 予言・神託（成就が予定されている） |
| `hint` | 後の展開を匂わせる会話・描写 |
| `mystery` | 謎・疑問（読者に解かせる） |
| `symbol` | 象徴的モチーフ（繰り返し登場） |
| `red_herring` | 意図的なミスリード |

### 3.5 確認

```bash
storyteller view timeline --id main_story --format mermaid > docs/timeline.mmd
storyteller view foreshadowing --list --status planted   # 未回収一覧
```

> **チェックポイント**: メインプロットの主要イベント（5〜10個）と主要伏線（3〜5個）が登録され、`timeline_analyze` MCP ツールで矛盾が検出されないこと。

---

## Phase 4: プロット構造（プロット・ビート・交差点）

タイムラインが「**いつ何が起きるか**」だとすると、プロットは「**何を・どのように物語るか**」です。両者は独立した軸として併存します。

### 4.1 プロット作成

```bash
# 主軸プロット
storyteller element plot \
  --id main_quest --name "魔王討伐の旅" --type main \
  --summary "勇者と仲間が魔王を倒すまで"

# 並走するプロット
storyteller element plot \
  --id love_story --name "ヒロインとの恋愛" --type sub

# 並列プロット（別視点）
storyteller element plot \
  --id antagonist_pov --name "魔王側の事情" --type parallel
```

### 4.2 ビートの追加

各プロットは **setup → conflict → climax → resolution** の4ポジションを持つビートで構成します。

```bash
storyteller element beat \
  --plot main_quest \
  --title "旅立ち" \
  --summary "村を出て王都を目指す" \
  --structure-position setup
```

### 4.3 交差点（Intersection）

プロット同士が絡み合う瞬間を明示します。

```bash
storyteller element intersection \
  --source-plot main_quest --source-beat beat_001 \
  --target-plot love_story --target-beat beat_001 \
  --summary "戦闘中にヒロインを救助したことで関係が始まる" \
  --influence-direction forward
```

### 4.4 可視化

```bash
storyteller view plot --list --format mermaid
storyteller view plot --id main_quest
```

`storyteller view browser` で HTML 化すると、プロット同士の交差点がグラフで見られます。

> **チェックポイント**: 各プロットに最低1つの climax と resolution beat が存在し、main プロットが他プロットと最低1箇所交差していること。

---

## Phase 5: 執筆（原稿作成と紐付け）

### 5.1 チャプターファイルの編集

`manuscripts/chapter01.md` をエディタで開きます。frontmatter は次のように構造化されています:

```yaml
---
storyteller:
  chapter_id: chapter01
  title: "始まりの村"
  order: 1
  characters:
    - hero
  settings:
    - hometown
  foreshadowings:
    - ancient_sword
  timeline_events:
    - village_attack
---

# 始まりの村

アレンは祠の前で立ち止まった。床下に錆びた古びた剣が見えた。
「これは……」勇者は剣を拾い上げた。
```

本文中の `アレン` / `勇者` は LSP が自動的に `hero` への参照として認識します（`displayNames` に登録した名前）。`@hero` のような明示的参照も使えます。

### 5.2 frontmatter の自動編集（推奨）

手で frontmatter を編集するのではなく、**MCP の `manuscript_binding` ツール** を使います。

```json
{
  "tool": "manuscript_binding",
  "arguments": {
    "manuscript": "manuscripts/chapter01.md",
    "action": "add",
    "entityType": "characters",
    "ids": ["hero", "mentor"]
  }
}
```

| action | 動作 |
|---|---|
| `add` | 既存リストに追加（重複は無視） |
| `remove` | リストから削除 |
| `set` | リストを完全置換 |

`entityType`: `characters | settings | foreshadowings | timeline_events | phases | timelines`

### 5.3 エディタ統合（執筆中のリアルタイム支援）

```bash
storyteller lsp install nvim    # Neovim 設定を生成
storyteller lsp install vscode  # VS Code 設定を生成
```

エディタを再起動すると以下が動きます:

- **Hover**: キャラ名にカーソル → 概要・関係性を表示
- **Definition Jump**: `hero` から `src/characters/hero.ts` へジャンプ
- **Diagnostics**: 未定義キャラへの参照を警告
- **Code Action**: `アレン` → `@hero` への変換提案
- **Semantic Tokens**: キャラ名・地名のシンタックスハイライト

> **チェックポイント**: 1チャプター書き終えたら必ず Phase 6（検証）を回します。後でまとめて検証するとリファクタコストが大きくなります。

---

## Phase 6: 検証（LSP / lint / 整合性）

### 6.1 frontmatter の整合性

```bash
storyteller meta check                                # 全 manuscripts/
storyteller meta check --path manuscripts/chapter01.md
storyteller meta check --json
```

frontmatter で参照される ID（characters, settings 等）が全て `src/` に存在するかをチェックします。

### 6.2 LSP ワンショット検証

```bash
storyteller lsp validate manuscripts/chapter01.md
storyteller lsp validate --dir manuscripts/ --recursive
storyteller lsp validate --json   # CI 用
```

検出される項目:

- 未定義キャラクター・設定への参照
- ID とファイル名の不一致
- 信頼度の低い暗黙参照（`displayNames` に未登録の表記）

### 6.3 lint（textlint 統合）

文法・表記ゆれは textlint で検査します。

```bash
storyteller lint                                      # 全文書
storyteller lint --path manuscripts/chapter01.md
storyteller lint --path manuscripts/chapter01.md --fix # 自動修正
storyteller lint --severity error                     # error のみ
storyteller lint --json
```

textlint 未インストールの環境でも storyteller 由来の診断は動きます（graceful degradation）。

### 6.4 Git pre-commit hook

```bash
storyteller lint install-hooks            # 標準モード
storyteller lint install-hooks --strict   # warning も commit を止める
```

### 6.5 タイムライン・伏線の整合性（MCP）

```
prompt: timeline_consistency_check
prompt: causality_analysis
tool:   timeline_analyze
```

伏線の `status` が `planted` のままで `plannedResolutionChapter` を過ぎているものを洗い出すには:

```bash
storyteller view foreshadowing --list --status planted
```

> **チェックポイント**: `meta check`, `lsp validate`, `lint` の3つが全てクリーンになるまで Phase 5 ↔ 6 を反復します。CI に組み込むなら `--json` 形式の出力をパースしてください。

---

## Phase 7: 完成・配布

### 7.1 全体可視化

```bash
storyteller view browser    # HTML を生成してブラウザで開く
storyteller view list       # ターミナル一覧
storyteller view list --json > output/snapshot.json
```

`view browser` は以下を含むダッシュボードを生成します:

- キャラクター・設定の一覧と関係グラフ
- タイムラインの Mermaid グラフ
- 伏線の設置・回収状況（統計と進捗バー）
- プロット構造グラフ

### 7.2 最終チェックリスト

| 項目 | コマンド |
|---|---|
| 全 frontmatter が valid | `storyteller meta check` |
| LSP 診断ゼロ | `storyteller lsp validate --dir manuscripts/ --recursive` |
| lint クリーン（または許容範囲） | `storyteller lint --severity error` |
| 全伏線が `resolved` または `abandoned`（意図的な未回収を除く） | `storyteller view foreshadowing --list --status planted` |
| 全プロットの climax/resolution が埋まっている | `storyteller view plot --list` |
| 主要キャラクターの `appearingChapters` が実際の登場と一致 | `storyteller view character --id <id> --details` |

### 7.3 配布形式に応じた出力

| 配布先 | 操作 |
|---|---|
| Markdown 結合（電子書籍化前段階） | `cat manuscripts/chapter*.md > output/full.md`（frontmatter は別途除去） |
| HTML プレビュー | `storyteller view browser` |
| 構造データのスナップショット | `storyteller view list --json > output/structure.json` |
| エディタ環境再現 | `.mcp.json`, `.storyteller.json`, `src/`, `manuscripts/` を一式バージョン管理 |

---

## 反復サイクル（実際の制作で起きること）

実務では以下のように行きつ戻りつします:

```
Phase 2 ── キャラ追加が必要だと気づく ──┐
Phase 3 ── 伏線が足りないと気づく ─────┤
Phase 4 ── プロットを再設計 ──────┤
Phase 5 ── チャプターを書く ─────────┤
Phase 6 ── lint/lsp で問題発覚 ─────┘
   ↑
   └─ 戻る
```

このサイクルを回しやすくするための原則:

1. **エンティティ ID は最初に決めて変えない**: `hero` のような短く一意な ID を選び、表示名（`displayNames`）で運用する。
2. **frontmatter は手で編集せず `manuscript_binding` を使う**: 一括置換・追加・削除が安全。
3. **詳細はファイル分離（`{ file: "..." }`）で後回し可**: まず構造を埋め、後から肉付け。
4. **検証は毎チャプター回す**: 蓄積したエラーは後で必ず重荷になる。
5. **MCP プロンプトを使う**: `chapter_review`, `consistency_fix`, `scene_improvement` は実行コストが低くフィードバックが多い。

---

## 参考: コマンドカンニングペーパー

```bash
# プロジェクト
storyteller generate --name <n> --path <p> [--template basic|novel|screenplay]
storyteller view list
storyteller view browser

# 要素作成
storyteller element character     --id <id> --name <n> --role <r> --summary <s>
storyteller element setting       --id <id> --name <n>
storyteller element timeline      --id <id> --name <n> --scope story|world|character|arc
storyteller element event         --timeline <id> --title <t> --category <c> --order <n>
storyteller element foreshadowing --id <id> --type chekhov|prophecy|hint|mystery|symbol|red_herring \
                                  --planting-chapter <ch> --planting-description <d>
storyteller element plot       --id <id> --type main|sub|parallel|background
storyteller element beat          --plot <id> --title <t> --structure-position setup|conflict|climax|resolution
storyteller element intersection  --source-plot <id> --source-beat <id> \
                                  --target-plot <id> --target-beat <id> --influence-direction forward|backward

# 表示
storyteller view character     --id <id> [--details] [--json]
storyteller view setting       --list [--type <t>] [--json]
storyteller view timeline      --id <id> [--format mermaid|text|json]
storyteller view foreshadowing --list [--status planted|resolved|partially_resolved|abandoned]
storyteller view plot       --id <id> [--format mermaid|text|json]

# 検証
storyteller meta check         [--path <f>] [--json]
storyteller lsp validate       <path> [--dir <d>] [--recursive] [--json]
storyteller lint               [--path <p>] [--fix] [--severity error|warning|info] [--json]
storyteller lint install-hooks [--strict]

# サーバー
storyteller lsp start --stdio [--root <p>]
storyteller mcp start --stdio [--path <p>]
storyteller lsp install nvim|vscode
```

---

## 用語集

storyteller の各コマンド・型定義・MCP ツールで使われる用語を、カテゴリ別にまとめます。型の enum 値（`protagonist`, `chekhov` など）も用語として扱います。

### 1. 基本概念

| 用語 | 説明 |
|---|---|
| **SaC** (StoryWriting as Code) | 物語の構造をコード（型）で記述し、検証・再利用可能にする思想。本プロジェクトの中核。 |
| **エンティティ (Entity)** | 物語の構成要素。Character / Setting / Timeline / Event / Foreshadowing / Plot / Beat / Intersection の総称。 |
| **メタデータ (Metadata)** | 各エンティティの必須情報（id, name, role, summary 等）。型レベルで保証される。 |
| **ハイブリッド方式** | メタデータはインライン、詳細はファイル分離（`{ file: "..." }`）で扱う storyteller の標準パターン。 |
| **段階的詳細化** | 最初は `summary` だけ埋め、執筆中に必要なものだけ `details` を追加していく推奨ワークフロー。 |
| **authoring surface** | 作者が編集する TypeScript 層（`src/`, `samples/*/src/`）。Go 処理エンジンと対になる概念。 |

### 2. キャラクター関連

| 用語 | 説明 |
|---|---|
| **Character** | キャラクター（人物）を表す型。`src/type/v2/character.ts` で定義。 |
| **role** | キャラクターの物語上の役割。enum 値: `protagonist` / `antagonist` / `supporting` / `guest`。 |
| `protagonist` | 主人公。物語の中心人物。 |
| `antagonist` | 敵対者。主人公と対立する存在。 |
| `supporting` | 助力者・脇役。主人公を支える側のキャラクター。 |
| `guest` | ゲストキャラ。一時的な登場人物。 |
| **traits** | キャラクターの特徴（`["勇敢", "純朴"]` 等）の配列。 |
| **relationships** | 他キャラクターへの関係性マップ。値は `ally` / `enemy` / `neutral` / `romantic` / `respect` / `competitive` / `mentor` 等の `RelationType`。 |
| **displayNames** | 原稿中で使われる表記のバリエーション（`["アレン", "勇者", "少年"]`）。LSP の暗黙参照検出で使用。 |
| **aliases** | 別名・愛称。`displayNames` と用途は近いが、よりフォーマルな別名（爵位、コードネーム等）を想定。 |
| **detectionHints** | LSP がキャラクター参照を検出する際のヒント。`commonPatterns` / `excludePatterns` / `confidence` を含む。 |
| **CharacterDevelopment** | キャラクターの成長アーク（変化）を表す型。`details.development` に格納。 |
| **appearingChapters** | キャラクターが登場するチャプター ID の配列。整合性検証に使われる。 |

### 3. 設定（Setting）関連

| 用語 | 説明 |
|---|---|
| **Setting** | 場所・文化・組織などの世界観要素を表す型。 |
| **type**（Setting の） | 設定の種類。`location`（場所）/ `culture`（文化）/ `organization`（組織）等。 |
| **SettingDetails** | 設定の詳細情報の型。`geography` / `history` / `culture` / `politics` / `economy` / `inhabitants` / `landmarks` 等のフィールドを持つ。 |

### 4. タイムライン・イベント関連

| 用語 | 説明 |
|---|---|
| **Timeline** | 時系列を表す型。物語内の出来事の発生順を管理する。 |
| **scope**（Timeline の） | タイムラインの範囲。enum 値: `story` / `world` / `character` / `arc`。 |
| `story` | 本編タイムライン。物語の主軸。 |
| `world` | 世界史タイムライン。物語より広い時間軸。 |
| `character` | キャラクター固有のタイムライン（その人物の人生）。 |
| `arc` | 特定のアーク（章群）に閉じたタイムライン。 |
| **TimelineEvent** | タイムライン上の1イベントを表す型。 |
| **EventCategory** | イベントの分類。`plot_point`（プロット転換点）/ `background`（背景）/ `character_development`（成長）等。 |
| **TimePoint** | イベントの発生時刻を表す型。絶対時刻と相対順序の両方に対応。 |
| **causedBy** | このイベントの **原因** となるイベント ID の配列。因果関係を表現。 |
| **causes** | このイベントが **原因となって引き起こす** イベント ID の配列。`causedBy` の逆方向。 |
| **EventImportance** | イベントの重要度。`major` / `minor` / `pivotal` 等。 |
| **parentTimeline / childTimelines** | タイムラインの階層関係。世界史 → 本編 → キャラクターアーク のような入れ子構造。 |

### 5. 伏線（Foreshadowing）関連

| 用語 | 説明 |
|---|---|
| **Foreshadowing** | 伏線を表す型。設置（planting）と回収（resolution）を追跡する。 |
| **ForeshadowingType** | 伏線の種類。`chekhov` / `prophecy` / `hint` / `symbol` / `mystery` / `red_herring`。 |
| `chekhov` | チェーホフの銃。**物理的な小道具による伏線**（壁の銃、古い剣、鍵など、後で使われることが暗示される物体）。アントン・チェーホフの「物語に銃を出すなら撃たねばならない」に由来。 |
| `prophecy` | 予言・神託。明示的に未来を予告するタイプの伏線。 |
| `hint` | ヒント。後の展開を匂わせる会話・描写。 |
| `symbol` | 象徴。繰り返し登場するモチーフで意味を蓄積するタイプ。 |
| `mystery` | 謎。読者に解かせるために提示される疑問。 |
| `red_herring` | レッドヘリング。**意図的なミスリード**（読者を誤った方向へ誘導する偽の手がかり）。推理小説で多用。 |
| **ForeshadowingStatus** | 伏線の状態。`planted`（設置済み）/ `partially_resolved`（部分的に回収）/ `resolved`（回収済み）/ `abandoned`（放棄）。 |
| **ForeshadowingImportance** | 伏線の重要度。`major`（主要）/ `minor`（副次的）/ `subtle`（さりげない）。 |
| **PlantingInfo** | 伏線設置情報の型。`chapter` / `description` / `excerpt` / `eventId` を含む。 |
| **ResolutionInfo** | 伏線回収情報の型。`completeness`（0.0〜1.0 の回収度）を含む。 |
| **excerpt** | 原稿引用。設置・回収シーンの該当文を保持するフィールド（`string` または `{ file: string }`）。 |
| **plannedResolutionChapter** | 回収予定チャプター。未回収伏線の検出に使われる。 |

### 6. プロット・ビート関連

| 用語 | 説明 |
|---|---|
| **Plot** | プロットを表す型。複数のプロットラインを並列管理する。 |
| **PlotType** | プロットの種類。`main` / `sub` / `parallel` / `background`。 |
| `main` | 主軸プロット。物語の中心となる筋。 |
| `sub` | 副筋。主筋を補強・装飾する。 |
| `parallel` | 並列プロット。主筋と並走する別視点（例: 敵側の物語）。 |
| `background` | 背景プロット。直接描かれないが世界の動きとして存在する。 |
| **PlotStatus** | `active`（進行中）/ `completed`（完結）/ `abandoned`（破棄）。 |
| **Beat** | プロットのビート（拍）。プロット内の最小ユニット。物語の「動き」を表す。**Save the Cat や三幕構成の用語と語源は同じだが、storyteller では独自定義**。 |
| **PlotBeat** | Beat の正式型名。`title` / `summary` / `structurePosition` / `chapter` / `characters` を持つ。 |
| **structurePosition** | Beat の構造位置。`setup` / `conflict` / `climax` / `resolution`。 |
| `setup` | 導入。状況設定・問題提起。 |
| `conflict` | 葛藤。対立・障害の発生。 |
| `climax` | クライマックス。物語の頂点。 |
| `resolution` | 解決。事態の収束。 |
| **PlotIntersection** | プロット同士が交差する瞬間を表す型。 |
| **influenceDirection** | 交差点の影響方向。`forward`（source が target に影響）/ `backward`（target が source に影響）/ `mutual`（相互）。 |
| **focusCharacters** | プロットの焦点となるキャラクター。値は `primary`（主役）/ `secondary`（副役）。 |
| **parentPlotId** | 親プロット ID。プロットの階層化に使う。 |

### 7. 原稿（Manuscript）関連

| 用語 | 説明 |
|---|---|
| **Manuscript** | 原稿。`manuscripts/chapter*.md` に置かれる Markdown ファイル。 |
| **frontmatter** | Markdown 冒頭の YAML ブロック。`storyteller:` キー以下にチャプターメタデータと entity 紐付けが入る。 |
| **chapter_id** | チャプター識別子。`chapter01` のような短い ID。 |
| **manuscript_binding** | 原稿の frontmatter に entity ID を追加・削除・置換する MCP ツール。 |
| **action** (manuscript_binding の) | `add`（追加）/ `remove`（削除）/ `set`（完全置換）。 |
| **entityType** (manuscript_binding の) | 紐付け対象の種類。`characters` / `settings` / `foreshadowings` / `timeline_events` / `phases` / `timelines`。 |
| **chapter*.meta.ts** | チャプターの自動生成メタデータファイル。frontmatter から派生し、TypeScript 型で entity 参照を解決する。 |
| **storyteller:auto:imports:start/end** | meta.ts 内の自動生成マーカー。手編集してはいけない領域を示す。 |

### 8. 検出・参照（LSP / 信頼度）関連

| 用語 | 説明 |
|---|---|
| **LSP** | Language Server Protocol。エディタと言語サーバ間の通信規格。VS Code / Neovim / Emacs など多数のエディタで動作。 |
| **明示的参照** | `@hero` のように `@<id>` 形式で書かれた entity 参照。信頼度 100%。 |
| **暗黙的参照** | `displayNames` / `aliases` / 文脈から推測される entity 参照（例: `アレン` → `hero`）。信頼度は文脈で変動。 |
| **confidence**（信頼度） | 0.0〜1.0 の参照確度。`detectionHints` の重み・文脈・近接性から算出される。 |
| **PositionedDetector** | 原稿中の entity 参照を位置情報付きで検出するエンジン。`internal/lsp/detection/` 配下。 |
| **Hover** | カーソル位置の entity 情報をポップアップ表示する LSP 機能。 |
| **Definition Jump** | 原稿中の entity 名から TS 定義ファイルへ飛ぶ LSP 機能（`textDocument/definition`）。 |
| **Code Action** | 低信頼度参照を `@<id>` に変換するなどの LSP の「クイックフィックス」。 |
| **Semantic Tokens** | 構文ハイライトの拡張。キャラ名・地名を色分け表示する LSP 機能。 |
| **Diagnostic** | LSP が返す警告・エラー情報の単位。`range` / `severity` / `message` を持つ。 |
| **DiagnosticSource** | 複数の診断ソース（storyteller / textlint / Vale 等）を統合する抽象化。`internal/lsp/diagnostics/`。 |
| **graceful degradation** | textlint 未インストール環境でも storyteller 由来の診断は動作させる設計方針。 |

### 9. MCP（Model Context Protocol）関連

| 用語 | 説明 |
|---|---|
| **MCP** | Model Context Protocol。Anthropic が策定した、AI エージェント（Claude 等）と外部ツール間の通信規格。 |
| **Tool** (MCP の) | AI が呼び出せる関数。`element_create`, `manuscript_binding` 等。副作用を伴う操作が中心。 |
| **Resource** (MCP の) | AI が読み取れるデータソース。`storyteller://characters` のような URI で指定。 |
| **Prompt** (MCP の) | 定型的な指示テンプレート。`character_brainstorm` 等。引数を受け取り、AI に渡すメッセージ列を生成。 |
| **stdio** | 標準入出力経由の MCP 通信モード。`storyteller mcp start --stdio` で起動。 |
| **expand=details** | リソース URI のクエリパラメータ。`{ file: ... }` 参照を解決して中身を埋め込んで返す。 |

### 10. 検証・lint 関連

| 用語 | 説明 |
|---|---|
| **meta check** | frontmatter の整合性検証コマンド。entity ID の存在確認等を行う。 |
| **lsp validate** | 原稿に対する LSP のワンショット検証。エディタを介さず CLI で診断を取得。 |
| **lint** | textlint + storyteller の統合 lint コマンド。文法・表記ゆれ・参照整合性を検査。 |
| **textlint** | 自然言語向けの汎用 lint ツール。プラグインで日本語特有のルール（表記ゆれ等）を追加可能。 |
| **prh** | 表記ゆれ検出用の textlint ルールセット。`prh-rules.yml` で辞書を定義。 |
| **--fix** | lint の自動修正モード。修正可能な指摘を自動適用する。 |
| **--severity** | 重要度フィルタ。`error` / `warning` / `info` のいずれか以上のみ表示。 |
| **install-hooks** | Git の pre-commit フックに lint を組み込むコマンド。`--strict` で warning も commit を止める。 |

### 11. アーキテクチャ用語

| 用語 | 説明 |
|---|---|
| **二層構造** | Go 処理エンジン（CLI/LSP/MCP） + TypeScript authoring surface（型定義・サンプル）の2層分離。 |
| **Go 処理エンジン** | `cmd/storyteller` + `internal/` 配下の Go コード。実行系（CLI / LSP / MCP / 検証）を担う。 |
| **tsparse** | `internal/project/tsparse` にある TypeScript パーサ。`src/` の TS 定義を Go 構造体に変換する。 |
| **import map** | Deno / TypeScript のパス解決機構。`@storyteller/` エイリアスで相対パスを排除する。 |
| **catalog** | Go 側で構築される entity の集約構造。LSP / MCP 起動時に `--root` または CWD から構築される。 |

### 12. 創作理論用語（参考）

storyteller が参照している既存の創作理論用語です。型定義の語源を理解する助けになります。

| 用語 | 説明 |
|---|---|
| **チェーホフの銃** | アントン・チェーホフの創作原則。「物語に銃を出すなら撃たねばならない」。`chekhov` 型伏線の語源。 |
| **三幕構成** | Setup → Confrontation → Resolution の古典的構造。`structurePosition` の `setup` / `conflict` / `resolution` の概念基盤。 |
| **Save the Cat** | Blake Snyder の脚本術。Beat Sheet を提唱した。storyteller の Beat の概念は Save the Cat の影響を受けつつ独自定義。 |
| **Story Circle** | Dan Harmon の物語論。8 ビートの円環構造。Beat 概念のもう1つの源流。 |
| **キャラクターアーク** | キャラクターが物語を通じて変化する軌跡。`CharacterDevelopment` 型で表現。 |
| **レッドヘリング** | 推理小説における意図的なミスリード。`red_herring` 型伏線の語源。 |

---

## 参考リンク（リポジトリ内）

- アーキテクチャ全体像: `docs/architecture.md`
- CLI リファレンス: `docs/cli.md`
- LSP 詳細: `docs/lsp.md`
- lint 詳細: `docs/lint.md`
- MCP 詳細: `docs/mcp.md`
- サンプル: `samples/cinderella/`, `samples/momotaro/`
