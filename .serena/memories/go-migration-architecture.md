# Go 移行アーキテクチャ決定 (Wave-A1〜A3 確定分)

## モジュール / レイヤ
- Module path: github.com/takets/street-storyteller
- レイヤ:
  - cmd/storyteller/ (entry point)
  - internal/domain/ (純粋ドメイン、外部依存なし)
  - internal/errors/ (typed Error{Code, Cause, Hints}、apperrors.Code* で統一)
  - internal/project/{tsparse,manifest,entity,store}/ + internal/project/project.go (E2E Load)
  - internal/detect/ (LSP/meta/CLI/MCP 共通の参照検出コア)
  - internal/meta/ (FrontMatter / .meta.ts emitter / validation preset)
  - internal/testkit/{clock,process,transport}/ (テスト基盤)

## データ形式
- TS export const → Go struct を Go 側 limited parser (`internal/project/tsparse`) で読む
  - 現在の制約: `: TypeName` 注釈、`as const`、`satisfies`、関数呼び出し、spread を拒否
- 中間 JSON 形式は採用せず (将来 migrate-data コマンドで拡張余地)
- `.storyteller.json` schema: `version` 必須、`project`/`paths` optional + defaulting

## 型変換規約
- enum: string-typed const (not iota int) で TS リテラル union と 1:1 対応
- optional: scalar→pointer、slice/map→nil
- StringOrFileRef: 共通 union 型 (`internal/domain/common.go`) で text or {file:"..."} を表現
- cross-entity refs: 全て string ID で保持。関係解決は store の責務

## detect / meta 統合コア (Wave-A3 確立)

### detect: 4-stage pipeline (`internal/detect/{types,position,reference}.go`)
LSP/meta/CLI/MCP から共通利用できる単一 API として `Detect()` を提供。4 段階の pure な変換 pipeline:
1. **FrontMatter parse** — `internal/meta/frontmatter.go` で YAML を読み、explicit reference (`@id` 形式) を抽出
2. **PositionTable 構築** — UTF-16 / rune / byte offset の 3 系の双方向マップを生成 (`internal/detect/position.go`)。LSP の UTF-16 position と Go の rune index を 1 箇所で吸収
3. **Reference 検出** — displayNames / aliases / pronouns / detectionHints をルールに本文を走査し candidate を生成 (`internal/detect/reference.go`)
4. **Confidence 計算** — name/displayNames/aliases/pronouns/detectionHints の各ルールに重みを乗せてスコア化、しきい値で reference に格上げ

### SourceLocation 正規化 (Cycle 2 / commit 4fd5e7c)
- 全ての SourceLocation は PositionTable 経由で生成され、UTF-16/rune/byte の整合性を caller が再計算しない
- `candidate.fromBinding` のような speculative field は廃止し、必要な情報は `Candidate` 構造体に inline 保持
- `TestDetect_MultilineLocation` で複数行入力での line/column 整合を契約化

### meta → detect 一方向依存 (Refactor / commit 3b8b3b5)
- `internal/meta` は `internal/detect` を呼び出してよいが、逆方向の依存は禁止
- この契約は `internal/{detect,meta}/doc.go` で **package コメントの一級宣言** として明文化 (review/IDE で常に視認可能)
- doc.go は単なる godoc ではなく「契約宣言の場」として運用

### emitter / preset (Wave-A3-post)
- `.meta.ts` emitter (`internal/meta/emitter.go` / commit cce38d3): TypeScript 出力契約を Golden test (8 ケース) で固定。auto block と手動領域、StringOrFileRef のシリアライズを契約化
- validation preset 読み込み口 (`internal/meta/preset.go` / commit 3576240): 4 種類のプリセットを固定値で内蔵し `ListPresets()` で列挙可能。process-04 以降で CLI/LSP から呼び出す前提

## fixture / contract
- 代表 sample: samples/cinderella, samples/momotaro, samples/mistery/old-letter-mystery
- v1 維持コマンド一覧は docs/migration/go-rearchitecture-requirements.md に確定

## エラー Code 対応 (Refactor 3b8b3b5 で統一)
- `apperrors.Code*` を全 package 共通の単一ソースに集約
- 既存: NotFound, Validation, Parse, IO, ManifestInvalid, EntityConflict, UnsupportedFormat
- **追加 (Wave-A3 Refactor)**: `CodeMalformedFile` — meta/detect が parse 失敗時に共有して返す
- errors.Wrap で cause 保持、errors.Is/As 互換、Hints でユーザー修正手順を付与
