# LSP Validate CLI 拡張 — 要件ドキュメント

Issue #12: `lsp validate` コマンドの機能拡張

## 1. 背景

`storyteller lsp validate` コマンドは、元々単一ファイルの `--json`
出力のみをサポートしていた。 Issue #12
では、ディレクトリ一括走査、信頼度サマリー、厳格モードなど、CLI
ワンショット検証としての実用性を高める拡張を行った。

拡張内容:

- `--dir` / `--recursive` によるディレクトリ配下 `.md` ファイルの一括検証
- `--strict` フラグによる非高信頼度参照検出時の `err()` 返却（exit 1）
- High / Medium / Low 信頼度サマリー集計（`computeConfidenceSummary`）
- `DiagnosticOutput` 型への `confidence` / `entityId` フィールド追加

## 2. スコープ

**Gap-fill 戦略**: 既存 `validate.ts` を拡張し、破壊的変更を行わない。

- 既存の単一ファイル検証（`--file`）動作はそのまま維持
- 新規オプション（`--dir`, `--recursive`, `--strict`）は追加のみ
- `DiagnosticOutput` の新フィールドは `optional` により後方互換
- `DiagnosticsGenerator.generate()` は一切変更せず、`detectAll()` を新設して併置
- `listMarkdownFiles` は MCP 側（`lsp_shared.ts`）を維持したまま CLI
  共用コピーを作成

## 3. 要件一覧

| ID | 要件                                             | 優先度 | Status |
| -- | ------------------------------------------------ | ------ | ------ |
| R1 | `listMarkdownFiles` 共有化（utils 複製）         | High   | Done   |
| R2 | `DiagnosticsGenerator.detectAll()` 新設          | High   | Done   |
| R3 | `DiagnosticOutput` 型拡張（confidence/entityId） | High   | Done   |
| R4 | `--dir` / `--recursive` 引数と走査ロジック       | High   | Done   |
| R5 | High/Medium/Low サマリー集計                     | Medium | Done   |
| R6 | `--strict` フラグと `err()` 返却                 | Medium | Done   |

### R1: listMarkdownFiles 共有化

MCP 側 `src/mcp/tools/lsp_shared.ts` の `listMarkdownFiles` を
`src/lsp/utils/markdown_files.ts` に複製し、CLI / LSP / MCP
から共通利用可能にする。MCP 側は削除せず維持（段階的統一は別 Issue）。

### R2: DiagnosticsGenerator.detectAll() 新設

`src/lsp/diagnostics/diagnostics_generator.ts`
に、信頼度閾値による抑制を行わない `detectAll()` メソッドを新設。既存
`generate()` は変更しない。`detectAll()` は `PositionedMatch[]`
をそのまま返却する。

### R3: DiagnosticOutput 型拡張

`DiagnosticOutput` 型に `confidence?: number` と `entityId?: string` を optional
追加。`PositionedMatch` からこれらの値をマッピングする。既存テストは `unknown[]`
扱いで後方互換。

### R4: --dir / --recursive 引数と走査

`--dir <path>` と `--recursive` オプションを追加。ディレクトリ配下の `.md`
ファイルを一括検証する。`--dir` と `--file` 両方指定時は `--dir` を優先。

### R5: High/Medium/Low サマリー集計

閾値定義:

| 区分   | 条件                      |
| ------ | ------------------------- |
| High   | `confidence >= 0.9`       |
| Medium | `0.7 <= confidence < 0.9` |
| Low    | `confidence < 0.7`        |

`confidence` 未定義の診断は Low 扱いとする。Human-readable 出力と JSON
出力の両方に summary を表示。

### R6: --strict フラグ

`--strict` 指定時、Medium + Low の件数が 1 件以上であれば
`err({ code: "validation_errors" })` を返却。CLI は exit 1
で終了する（`cli.ts:93-98` の制約による）。

## 4. 設計判断

### exit code 制約

`cli.ts:93-98` の `Deno.exit(1)` は改修しない。現状すべての `err()` 返却が exit
1 に集約される。細分化は別 Issue で対応。

### listMarkdownFiles 複製戦略

MCP 側 `lsp_shared.ts:90-118` を維持し、CLI 用に
`src/lsp/utils/markdown_files.ts` を新規作成。将来的な乖離リスクはあるが、MCP
側への影響を避けるため分離を採用。統合は別 Issue で計画。

### detectAll() 並置

`DiagnosticsGenerator.generate()` の内部ロジックを変更せず、`detectAll()`
を新関数として追加。`generate()` の動作不変を保証する。

### --strict の Medium+Low 検出

`--strict` は Medium + Low を検出対象とする。理由: `PositionedDetector`
の最低信頼度が 0.8（aliases）であり、Low
単体（`< 0.7`）では標準設定で発火不可能。実質的に意味のある最小閾値が
Medium（`< 0.9`）となる。

## 5. テスト戦略

TDD Red-Green-Refactor サイクルで実施。Process 10-14 にて各要件のテストを実装。

既存 5 テストは `value.diagnostics: unknown[]`
として扱っており、`DiagnosticOutput` 型拡張による破壊的変更はない。

テストカバレッリ:

- 単一ファイル検証（既存テスト維持）
- `--dir` / `--recursive` ディレクトリ走査
- `DiagnosticOutput` の `confidence` / `entityId` フィールド検証
- `computeConfidenceSummary` の閾値境界テスト
- `--strict` モードの `err()` 返却確認
- `--json` + `summary` の JSON 構造検証

## 6. Known Gap / 別 Issue 対象

| Gap                        | 対象     | 理由                                                                                          |
| -------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| exit code 細分化           | 別 Issue | `cli.ts:93-98` の `Deno.exit(1)` 制約。err code ごとの終了コード制御は影響範囲が広い          |
| MCP JSON スキーマ統一      | 別 Issue | MCP は `DiagnosticsGenerator` 経由で `confidence` / `entityId` を欠落する。スキーマ統合が必要 |
| listMarkdownFiles 統一     | 別 Issue | 複製による将来的乖離リスク。`lsp_shared.ts` との一本化を計画                                  |
| `--strict` の Low 単体検出 | 別 Issue | `PositionedDetector` 最低信頼度 0.8 のため Low 単体発火不可。detector 改善時に対応            |

## 7. 関連ファイル

### 変更ファイル

| ファイルパス                                          | 変更内容                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `src/cli/modules/lsp/validate.ts`                     | メイン実装。型拡張、`--dir`/`--recursive`/`--strict`、サマリー集計 |
| `tests/cli/lsp_validate_command_test.ts`              | テスト追加。`--dir`、`confidence`/`entityId`、サマリー、`--strict` |
| `src/lsp/diagnostics/diagnostics_generator.ts`        | `detectAll()` メソッド新設                                         |
| `tests/lsp/diagnostics/diagnostics_generator_test.ts` | `detectAll()` テスト追加                                           |

### 新規ファイル

| ファイルパス                             | 内容                                                     |
| ---------------------------------------- | -------------------------------------------------------- |
| `src/lsp/utils/markdown_files.ts`        | `listMarkdownFiles` 共有関数（`lsp_shared.ts` から複製） |
| `tests/lsp/utils/markdown_files_test.ts` | `listMarkdownFiles` 単体テスト                           |

### 参照のみ（変更なし）

| ファイルパス                               | 参照理由                                                    |
| ------------------------------------------ | ----------------------------------------------------------- |
| `src/lsp/detection/positioned_detector.ts` | `detectWithPositions()` の戻り値（`PositionedMatch`）を利用 |
| `src/lsp/utils/entity_kind.ts`             | `getKindLabel()` によるエンティティ種別ラベル取得           |
| `src/mcp/tools/lsp_shared.ts`              | 元の `listMarkdownFiles` 実装（維持・変更なし）             |
| `src/shared/result.ts`                     | `ok()` / `err()` Result 型                                  |
| `src/cli/base_command.ts`                  | `BaseCliCommand` 基底クラス                                 |
| `src/cli/types.ts`                         | `CommandContext` 型定義                                     |
