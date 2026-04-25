// Package detect は LSP / meta / CLI / MCP 全用途の統合エンティティ参照検出コア。
//
// Detect() が単一の公開 API。呼び出し側 (LSP DiagnosticsGenerator,
// meta auto-binding emitter, CLI lsp validate, MCP meta_check 等) は
// すべてこの関数経由で参照検出を行う。
//
// # Detect() の 4-stage pipeline
//
// Wave-A3 で以下の順序を契約として固定:
//  1. candidate generation: Catalog.ListNames と detailedCatalog 経由の hints
//     (displayNames / aliases / pronouns) を本文走査して raw candidate を生成。
//  2. exclude filter: detectionHints.ExcludePatterns が本文に出現する candidate を除外。
//  3. dedup: (Kind, ID) で集約し、最高スコアと最初の byteOffset を採用。
//     FrontMatter binding を merge し、未知 ID には "catalog_miss" warning を付与。
//  4. SourceLocation 正規化: PositionTable で byteOffset → UTF-16 char position へ変換。
//
// # SourceLocation の正規化
//
// PositionTable (position.go) が UTF-16 unit ベースの char position を提供する。
// LSP は UTF-16 char offset 契約のため、本文中の byteOffset から
// PositionTable.PositionAt() で line/character を解決し SourceLocation に格納する。
//
// # 共有契約 (types.go)
//
//   - Position: line / character (UTF-16 unit) のペア。
//   - RangeUTF16: Position の Start / End ペア。
//   - SourceLocation: URI + RangeUTF16 を保持する LSP 境界向け値。
//   - EntityKind: Character / Setting / TimelineEvent / Phase / Timeline 等の分類タグ。
//   - EntityRef: (Kind, ID) で一意となるエンティティ参照。
//   - MatchSource: SourceName / SourceDisplayName / SourceAlias / SourcePronoun /
//     SourceFrontMatter のスコア由来を表す attribution。
//   - EntityCatalog: 名前解決とヒント供給を担う依存性逆転インターフェース。
//
// # 使い分け契約
//
// 検出ロジックを LSP / meta / CLI / MCP の各レイヤに重複させない。
// 各 consumer は DetectionRequest を組み立て Detect() を呼ぶだけで、
// 4-stage pipeline と UTF-16 SourceLocation の整合性を担保する。
package detect
