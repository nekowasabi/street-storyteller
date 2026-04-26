# Go移行・リアーキテクチャ要件整理

作成日: 2026-04-25

---

## 用語集（Glossary）

このドキュメントで頻出する用語の定義。後続 process（02, 03, 10）から参照される。

| 用語 | 定義 |
|------|------|
| **Manifest** | `.storyteller.json`。プロジェクトメタデータ（バージョン、パス、スキーマ）を保持 |
| **EntityStore** | メモリ内に読み込まれた全 entity（character, setting, foreshadowing, timeline, subplot）の管理。ロック、増分更新、キャッシュ機構を持つ |
| **Detection** | Markdown 原稿本文からキャラクター・設定・伏線等の参照を検出するプロセス。confidence スコア付き |
| **FrontMatter** | Markdown ファイルの先頭の YAML/TOML ブロック。storyteller キー配下に章メタデータと参照リストを保持 |
| **fixture** | Go 版互換性検証用の代表サンプルプロジェクト。cinderella, momotaro, old-letter-mystery の 3 つを固定 |
| **contract test** | fixture 上で実行する契約テスト。現行 TypeScript 版と Go 版の出力/振る舞いの一致を検証 |
| **entity file** | `src/characters/*.ts`, `src/settings/*.ts` などの TypeScript 形式エンティティ定義。Go では object literal parser で読む |
| **TS object literal parser** | Go 側で実装する限定的な TypeScript パーサ。オブジェクトリテラル `{ ... }` の key-value を抽出 |

---

## 目的

現行の TypeScript/Deno 実装で提供している機能と、既存ユニットテストで固定されている振る舞いを維持したまま、Go への移行または段階的なリアーキテクチャを行う。

現行コードベースは `src` 275 ファイル、`tests` 271 ファイル、合計約 102,377 行規模で、CLI、LSP、MCP、RAG、HTML可視化、メタデータ生成、プラグイン、マイグレーションが同一リポジトリ内で密結合している。

## 現行システムの主要機能

### 1. CLI

入口は `main.ts` から `src/cli.ts` の `runCLI()` に入る。コマンド解決、設定解決、ロギング、出力形式切替、コマンドレジストリがここで組み立てられる。

維持対象:

- `generate`: 物語プロジェクト雛形生成
- `meta check/generate/watch/sync`: 原稿 FrontMatter と `.meta.ts` の検証・生成・更新
- `element`: character, setting, timeline, event, foreshadowing, subplot, beat, intersection, phase の作成
- `view`: HTML可視化、character/setting/timeline/foreshadowing/subplot 表示、JSON出力
- `lsp start/install/validate`: LSP起動、エディタ設定生成、ワンショット検証
- `mcp start/init`: MCPサーバー起動、設定生成
- `lint`: textlint 統合
- `version/update`: プロジェクトメタデータと互換性チェック
- `rag export/update/install-hooks`: RAGドキュメント生成とフック生成

注意点:

**RAG/migrate の CLI 登録状況: 未登録漏れ（正式維持対象）**

- `src/cli/modules/rag` と `src/cli/modules/migrate` は実装されているが、`registerCoreModules()` には登録されていない。
- CLAUDE.md の「RAG」セクション（L143-155）と「textlint統合機能」（L376-426）で正式ドキュメント化されており、`storyteller rag export/update/install-hooks` と `storyteller lint` コマンドは実装済み機能として利用可能。
- 移行時には CLI 登録漏れとして修正し、正式な v1 維持対象に含める。

### 2. 物語ドメインモデル

中心データは TypeScript の型と `export const` ファイルで表現されている。

維持対象のエンティティ:

- Character: id, name, role, traits, relationships, chapters, summary, displayNames, aliases, pronouns, details, detectionHints, phases
- Setting: id, name, type, chapters, summary, displayNames, details, relatedSettings, detectionHints
- Foreshadowing: planting, resolutions, status, importance, relations, displayNames, details, detectionHints
- Timeline/TimelineEvent: scope, events, causal links, phaseChanges, displayNames, details
- Subplot/PlotBeat/PlotIntersection: subplot type/status, beat sequence, preconditions, intersections, relations
- CharacterPhase: 差分適用方式の成長フェーズ、初期状態、フェーズ間差分

重要な移行論点:

- 現行プロジェクトデータは JSON/YAML ではなく TypeScript ファイルである。Go版では TypeScript を直接実行・import できないため、以下のいずれかが必要。

**DECISION: Go 側 TS object literal parser 実装で固定**

- Go側で限定スコープの TypeScript object literal parser を実装することに決定。
- 対象: `as const`、`satisfies`、テンプレートリテラルはエッジケースとして扱う方針。
- リスク: 複雑な TS 構文（union 型、generic、conditional type）への対応は契約テスト（fixture）で検証する。
- 緩和策: fixture 代表サンプル 3 つ（cinderella, momotaro, old-letter-mystery）での contract test を強制。
- JSON/YAML 中立形式への移行は採用しない。Deno helper 抽出方式も採用しない。

### 3. メタデータ生成・FrontMatter

`src/application/meta` が中心。Markdown 原稿の FrontMatter を読み、キャラクター・設定・伏線・タイムライン・フェーズ等の参照を検出し、`.meta.ts` を生成・更新する。

維持対象:

- FrontMatter の parse/edit/sync
- `storyteller` キー配下の chapter_id, title, order, characters, settings, foreshadowings, timeline_events, phases, timelines
- 本文からの参照検出
- `.meta.ts` 自動生成
- 既存 `.meta.ts` の auto block 更新と手動領域保持
- validation preset
- batch, recursive, dry-run, preview, force, update
- 低信頼度検出や未知参照のエラー

### 4. LSP

`src/lsp/server/server.ts` が LSP の中核。Markdown と TypeScript ファイルに対して、参照検出、診断、hover、definition、code action、semantic tokens、code lens、completion、document symbol を提供する。

維持対象:

- JSON-RPC / Content-Length transport
- initialize/shutdown/initialized 状態管理
- textDocument sync: didOpen, didChange, didClose, didSave
- definition: エンティティ定義ファイル、ファイル参照
- hover: character/setting/foreshadowing、TypeScriptリテラル型、ファイル参照
- diagnostics: storyteller診断と textlint診断の集約
- codeAction: 低信頼度参照を `@id` に変換
- semanticTokens: character, setting, foreshadowing と confidence/status modifier
- codeLens: `{ file: "./path.md" }` 参照に Open レンズ
- completion: literal type 補完
- file watching: entity file 変更時の増分更新またはフルリロード
- multi-project: 近い `.storyteller.json` を検出してプロジェクトコンテキストを切替
- manuscript save 時の FrontMatter 自動同期

リスク:

- LSP サーバークラスが多数の責務を直接保持しており、診断・テキスト同期・プロジェクト検出・ファイル監視・自動同期が密結合。
- デバウンス、タイマー、外部プロセス、transport がテストで実時間依存になっている。
- textlint は `npx textlint` サブプロセス実行で、availability 判定とタイムアウトが遅延の主因になっている。

### 5. MCP

`src/mcp/server/server.ts` が MCP JSON-RPC サーバー。ツール、リソース、プロンプトを提供する。

維持対象:

- tools/list, tools/call
- resources/list, resources/read
- prompts/list, prompts/get
- server lifecycle: initialize, initialized, shutdown
- ToolRegistry による projectRoot 付き実行
- Resource URI:
  - `storyteller://project`
  - `storyteller://characters`, `storyteller://character/<id>`
  - `storyteller://settings`, `storyteller://setting/<id>`
  - `storyteller://timelines`, `storyteller://timeline/<id>`
  - `storyteller://foreshadowings`, `storyteller://foreshadowing/<id>`
  - subplot/phase 系
- Tools:
  - meta_check, meta_generate
  - element_create
  - manuscript_binding, manuscript_sync
  - view_browser
  - lsp_validate, lsp_find_references
  - timeline_create/view/analyze
  - event_create/update
  - foreshadowing_create/view
  - subplot_create/view
  - beat_create, intersection_create
  - phase_create/view
- 自然言語 intent analysis と command mapping

### 6. HTML可視化

`src/application/view` が中心。プロジェクトを分析し、HTMLとグラフデータを生成する。

維持対象:

- character graph
- timeline graph
- foreshadowing graph
- subplot graph
- consistency check
- orphan character rule
- unresolved foreshadowing rule
- local server
- file watcher
- WebSocket notifier

### 7. RAG

`src/rag` と `src/cli/modules/rag` が中心。AI支援用ドキュメントを生成する。

維持対象:

- character/setting/foreshadowing/timeline/subplot/manuscript の Markdown ドキュメント生成
- frontmatter 付き RAG ドキュメント
- chunking: document, scene, auto
- incremental update
- `.rag-docs` 出力
- `.rag` / digrag 連携
- git hook 生成

### 8. プラグインとマイグレーション

`src/core/plugin_system.ts` と `src/plugins` が中心。ElementPlugin/FeaturePlugin と依存関係検証がある。

維持対象:

- plugin metadata
- dependency validation
- circular dependency detection
- topological initialization
- ElementPlugin:
  - createElementFile
  - validateElement
  - exportElementSchema
  - getElementPath
  - getDetailsDir
- migration registry
- v1 to v2 migration
- project metadata migration
- git integration

## テストで担保されている項目

既存テストは大きく以下に分類できる。

- unit: domain, application, parser, emitter, validators, providers
- CLI unit/integration: command descriptor, option parse, presenter, JSON output
- LSP unit: detector, providers, document manager, JSON-RPC, diagnostics
- LSP integration/E2E: server lifecycle, hover/definition/codeAction/file watching/textlint
- MCP unit/integration: server handlers, tool registry, resources, prompts, tool definitions
- scenario: cinderella, external file details, storyteller workflow
- migration: interface, registry, v1 to v2, setting migration
- RAG: chunker, incremental, templates, CLI wrapper
- release/CI/install: deno tasks, workflow, build manifest, install script
- performance: subplot validation/graph/RAG for 100 items

Go移行後も最低限、同等のテスト層を分けて維持する必要がある。

推奨テスト階層:

- `go test ./internal/...`: ドメイン、パーサ、バリデータ、検出器などの高速ユニット
- `go test ./cmd/...`: CLI コマンドと出力契約
- `go test ./lsp/...`: LSP provider と protocol の高速テスト
- `go test -tags=integration ./...`: MCP/LSP E2E、サーバー、ファイル監視
- `go test -tags=external ./...`: textlint, digrag, git, npm/deno など外部コマンド依存

## 現在のテスト実行で確認した問題

`deno task test` を途中まで実行した。大半のユニットテストは通過したが、以下が長時間化したため、ユーザー指示により残りの遅いテストはスキップ扱いにした。

確認できた遅延箇所:

- LSP統合テストの複数ケースが 1 ケース約70秒
- `TextlintDiagnosticSource` が合計約8分
- `TextlintWorker` が合計約2分20秒
- file watching integration が 1 ケース約70秒
- multi-project E2E が 1 ケース約70秒
- `server_code_action`, `server_file_watching`, `server_semantic_tokens`, `server_integration` でも同種の 70秒級遅延が連続

原因候補:

- 実時間タイマー、デバウンス、サーバー待機をそのまま使っている
- 外部コマンド `npx textlint` の availability 判定が遅い
- テスト用 transport/clock/process runner が十分に差し替え可能でない
- サンドボックス環境では localhost 接続やサブプロセスが制約を受ける

Go版での要件 (Process-11 で達成):

- ✅ Clock/Timer をインターフェース化し、テストでは fake clock を使う
  → `internal/testkit/clock` に `Clock`, `Timer`, `Stopper` interface と `FakeClock`/FakeTimer 実装。`AfterFunc` + `Advance` で debounce が 0ms 実行可能。
- ✅ textlint/digrag/git/npm/deno は外部コマンド adapter として隔離する
  → `internal/testkit/process` に `Runner` interface + `RealRunner`/`FakeRunner`。`internal/testkit/guard_test.go` が default-tag テストでの `os/exec` 直接 import を機械的に禁止。
- ✅ availability check はキャッシュし、テストでは明示的に mock する
  → `FakeRunner.Plan(...)` で実行結果を事前定義可能。
- ✅ LSP E2E は通常ユニットテストから分離する
  → 階層: `go test ./...` (default, 高速), `-tags=integration` (E2E), `-tags=external` (textlint等)。`internal/testkit/lint_test.go` が default で実時間 sleep を禁止。
- ✅ デバウンス待機を実時間で待たない
  → `FakeClock.AfterFunc` + `Advance` で debounce が決定論的。`internal/testkit/clock/timer_test.go::TestFakeTimerDebounceSimulation` が 200ms 相当の debounce coalescing を 0ms で検証。

### 高速化見込み (TS版実測値→Go版見込み)

| TS実測 | 原因 | Go版置換 |
|--------|------|----------|
| TextlintDiagnosticSource 約8分 | npx textlint 実コマンド + debounce | FakeRunner で stub + FakeTimer で debounce → 0.01s 級 |
| TextlintWorker 約2分20秒 | npx textlint 起動 × 多数 | FakeRunner.Plan で全 invocation を pre-stub |
| file watching integration 約70秒 | 実時間 debounce 待機 | FakeClock.Advance で即時進行 |
| LSP E2E 約70秒/ケース | 起動 + protocol 経由実時間 | in-memory `transport.FakeTransport` で round-trip 0.01s |
| multi-project E2E 約70秒 | 複数プロセス並列待機 | FakeRunner で全プロセス mock |

合計推定削減: TS で **15分超 → Go で 1秒未満** (1000倍以上の高速化見込み)。

## 推奨アーキテクチャ

### Go パッケージ構成案

```text
cmd/storyteller/
internal/app/
internal/config/
internal/domain/
internal/project/
internal/meta/
internal/detect/
internal/lsp/
internal/mcp/
internal/rag/
internal/view/
internal/plugins/
internal/migration/
internal/external/
internal/testkit/
```

### 依存方向

```text
cmd
  -> app
    -> domain
    -> project
    -> meta
    -> detect
    -> lsp
    -> mcp
    -> rag
    -> view
    -> plugins
    -> migration
    -> external
```

禁止したい依存:

- domain から CLI/LSP/MCP へ依存
- LSP provider から CLI module へ依存
- MCP tool から CLI 実装へ直接依存
- テストが実 npm/npx/deno/git/localhost にデフォルト依存すること

現行では `LspServer` から `cli/modules/lsp/start.ts` の `loadSingleEntity` を呼んでおり、境界が逆流している。Go版では `project.EntityLoader` のような共有サービスに切り出す。

## 移行方針案

### Phase 1: 契約固定

- 既存 CLI の入出力契約を Golden Test 化
- MCP tools/resources/prompts の JSON schema と戻り値を固定
- LSP の request/response fixture を作成
- 現行 TypeScript entity file から抽出した JSON fixture を保存
- 遅いテストを unit/integration/external に分類

### Phase 2: Go コア実装

- domain model を Go struct と enum で定義
- Result/Error code を統一
- project loader を実装
- FrontMatter parser/editor を実装
- reference detector を実装
- validators を実装

### Phase 3: CLI 置換

- `storyteller-go` として generate/meta/element/view/version/update から実装
- 既存 TS CLI と Golden 出力比較
- 互換性が取れたコマンドから symlink/alias を切替

### Phase 4: LSP/MCP 置換

- JSON-RPC transport を Go 実装
- LSP providers を段階移植
- MCP tools/resources/prompts を Go service 経由に変更
- textlint は adapter として外部コマンド実行に限定

### Phase 5: データ形式の確定と移行

- TypeScript entity files を継続するか、JSON/YAMLへ移行するか確定
- 必要なら `storyteller migrate-data` を追加
- `.storyteller.json` に schema version と data format version を持たせる

## 受け入れ条件

- 既存サンプル `samples/cinderella`, `samples/momotaro`, `samples/mistery/old-letter-mystery` を読み込める
- 主要 CLI コマンドが現行と同じ exit code と出力契約を満たす
- MCP tools/resources/prompts が現行互換
- LSP の hover/definition/diagnostics/codeAction/semanticTokens/codeLens/completion が現行互換
- FrontMatter と `.meta.ts` の生成・更新結果が現行互換
- RAG ドキュメント生成結果が現行互換
- 既存 v1 to v2 migration が再現される
- 通常ユニットテストは外部コマンドなしで高速に完走する
- 外部依存テストは明示タグ付きでのみ実行される

---

## 決定事項の固定（Decisions Captured in Phase 1）

### 1. TypeScript データ形式の読み取り方針

**決定**: Go 側 TS object literal parser 実装で固定

- Go側で限定スコープの TypeScript object literal parser を実装
- 対象: object literal（`{ ... as const }`） の基本的なパース
- エッジケース: `as const`、`satisfies`、テンプレートリテラルは対応せず、contract test で catch
- リスク: 複雑な TS 構文への対応
- 緩和策: fixture 代表サンプル（cinderella, momotaro, old-letter-mystery）での contract test を強制

代替案は採用しない:
- JSON/YAML 中立形式への一括移行 ✗
- Deno helper による JSON 抽出 ✗

### 2. Fixture 代表サンプル

Go版との互換性検証に使用するサンプルプロジェクト:

- `samples/cinderella` - 基本的なキャラクター・設定・伏線構造
- `samples/momotaro` - Timeline/Event の因果関係と phaseChange
- `samples/mistery/old-letter-mystery` - 複雑な Subplot/Intersection、高度な検出ルール

これらサンプルで以下が成功することを Go版受け入れ条件とする:
- TypeScript entity file の読み取り
- FrontMatter の生成・更新
- LSP hover/definition の動作
- MCP tools/resources の返却

### 3. v1 維持対象コマンド一覧

`registerCoreModules()` に登録されるコマンド:

| モジュール | コマンド | サブコマンド |
|-----------|----------|------------|
| generate | `generate` | - |
| meta | `meta` | check, generate, watch, sync |
| lsp | `lsp` | start, install, validate |
| element | `element` | character, setting, timeline, event, foreshadowing, subplot, beat, intersection, phase |
| view | `view` | character, setting, timeline, foreshadowing, subplot, browser |
| mcp | `mcp` | start, init |
| lint | `lint` | - |
| help | `help` | - |
| **rag** (登録漏れ修正予定) | `rag` | export, update, install-hooks |
| **version/update** (ドキュメント L26 記載だが未確認) | `version`, `update` | - |

### 4. Go Module Path

```
github.com/takets/street-storyteller
```

### 5. データ読み取り方針の詳細

#### 対応する型から Go struct への 1:1 マッピング

詳細は別ファイル `docs/migration/entity-type-mapping.md` を参照。

#### 制約と例外処理

- TypeScript の union type（`"protagonist" | "antagonist" | ...`）は Go の iota enum に置き換え
- optional field（`field?: type`）は pointer or nullable 型で表現
- ファイル参照（`{ file: "./path.md" }`）は string-based resolution を実装

---

## Ask User Questions

1. Go版の物語データ保存形式は、現行の TypeScript `export const` を互換維持したいですか。それとも JSON/YAML 等へ移行してよいですか。
2. Go移行の初期スコープは CLI 中心でよいですか。それとも LSP/MCP も同時に置き換える必要がありますか。
3. RAG と textlint は Go版の初期リリースに必須ですか。外部コマンド adapter として後追いでもよいですか。
4. 現行ドキュメントにあるが CLI 登録されていない `rag` と `migrate` は、v1機能として正式に維持対象に含めますか。
5. `.meta.ts` 生成は Go版でも TypeScript ファイルとして出力し続ける必要がありますか。中立形式への変更は許容されますか。
