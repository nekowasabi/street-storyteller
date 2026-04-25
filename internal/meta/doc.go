// Package meta は manuscript の FrontMatter parser, .meta.ts emitter,
// validation preset の 3 機能を提供する。
//
// 検出ロジック (エンティティ参照解決) は本パッケージでは行わず、
// internal/detect パッケージ (Detect() 統合 API) を呼び出す前提。
// meta は「manuscript ファイル境界の入出力」と「FrontMatter ↔ 構造体の往復」に責務を限定する。
//
// # 提供機能 (エントリ関数)
//
//   - frontmatter.go:
//     ParseFrontMatter / EditFrontMatter — Markdown 先頭の YAML "storyteller:"
//     ブロックを FrontMatter 構造体へ往復変換する。
//   - emitter.go:
//     UpdateOrEmit — .meta.ts ファイルの marker block 内を deterministic に
//     更新 / 新規生成する純関数。
//   - preset.go:
//     LoadPreset — validation preset (lenient / strict 等) を解決する。
//
// # 依存方向
//
// meta → detect (一方向)。
//
// FrontMatter の bindings に格納された ID 群は EntityKind ごとに分類されており、
// detect.DetectionRequest.Bindings として直接渡せる契約 (types.go の EntityKind を共有)。
// meta が独自に名前解決を持たないことで、Detect() の 4-stage pipeline (candidate →
// exclude → dedup → SourceLocation 正規化) と整合した検出結果が常に得られる。
package meta
