package meta

import (
	"fmt"
	"sort"
	"strings"
	"time"
	"unicode"
)

// ChapterMetaInput は .meta.ts 生成に必要な最小限の入力。
// Why: TS の TypeScriptEmitter (455L) のうち、ファイル I/O と project root 解決を
// 呼び出し側に外出しし、emitter は純関数として「文字列 → 文字列」のみを担う。
// これにより deterministic な Golden test と process-05 (CLI/MCP) からの再利用を両立する。
type ChapterMetaInput struct {
	ID         string
	Title      string
	Order      int
	Characters []EntityImport
	Settings   []EntityImport
	// References は表記 (例: "シンデレラ") → entity ID のマップ。
	// entity ID は Characters/Settings 内のいずれかの VarName と一致する前提。
	References map[string]string
}

// EntityImport は import 行と entities/references で参照する変数を表現する。
type EntityImport struct {
	ID         string // 論理 ID (typically same as VarName)
	ImportPath string // 例: "../src/characters/cinderella.ts"
	VarName    string // 例: "cinderella"
}

// auto block マーカー定数。TS 実装と同一の文字列。
const (
	markerImportsStart    = "// storyteller:auto:imports:start"
	markerImportsEnd      = "// storyteller:auto:imports:end"
	markerCoreStart       = "// storyteller:auto:core:start"
	markerCoreEnd         = "// storyteller:auto:core:end"
	markerEntitiesStart   = "// storyteller:auto:entities:start"
	markerEntitiesEnd     = "// storyteller:auto:entities:end"
	markerReferencesStart = "// storyteller:auto:references:start"
	markerReferencesEnd   = "// storyteller:auto:references:end"
)

// EmitNew は新規の .meta.ts コンテンツ全体を生成する。
func EmitNew(meta ChapterMetaInput, generatedAt time.Time) string {
	var b strings.Builder

	b.WriteString("// 自動生成: storyteller meta generate\n")
	b.WriteString("// 生成日時: ")
	b.WriteString(generatedAt.Format("2006-01-02 15:04:05"))
	b.WriteString("\n\n")

	// imports block
	for _, line := range renderImportsBlock(meta) {
		b.WriteString(line)
		b.WriteByte('\n')
	}
	b.WriteByte('\n')

	exportName := camelCase(meta.ID) + "Meta"
	b.WriteString("export const ")
	b.WriteString(exportName)
	b.WriteString(": ChapterMeta = {\n")
	b.WriteString(fmt.Sprintf("  id: %q,\n", meta.ID))

	for _, line := range renderCoreBlock(meta, "  ") {
		b.WriteString(line)
		b.WriteByte('\n')
	}
	for _, line := range renderEntitiesBlock(meta, "  ") {
		b.WriteString(line)
		b.WriteByte('\n')
	}

	b.WriteByte('\n')

	for _, line := range renderReferencesBlock(meta, "  ") {
		b.WriteString(line)
		b.WriteByte('\n')
	}

	b.WriteString("};\n")

	return b.String()
}

// UpdateOrEmit は既存 .meta.ts の auto block のみを置換し、手動領域 (validations 等) は保持する。
// existingContent="" のときは EmitNew と等価。
func UpdateOrEmit(existingContent string, meta ChapterMetaInput, generatedAt time.Time) (string, error) {
	if existingContent == "" {
		return EmitNew(meta, generatedAt), nil
	}

	// Why: text/template ではなく strings.Builder + 手動 index 検出を採用 —
	// block 単位の選択的更新は template では「全置換 vs 部分更新」の境界が表現困難で、
	// 手動領域 (validations 等) の保持と両立させづらい。
	type blockSpec struct {
		name      string
		startTok  string
		endTok    string
		newLines  []string // 新しい block 内容 (start/end マーカー含む、indent なし)
	}

	specs := []blockSpec{
		{"imports", markerImportsStart, markerImportsEnd, renderImportsBlock(meta)},
		{"core", markerCoreStart, markerCoreEnd, renderCoreBlock(meta, "")},
		{"entities", markerEntitiesStart, markerEntitiesEnd, renderEntitiesBlock(meta, "")},
		{"references", markerReferencesStart, markerReferencesEnd, renderReferencesBlock(meta, "")},
	}

	updated := existingContent
	for _, sp := range specs {
		replaced, err := replaceMarkedBlock(updated, sp.name, sp.startTok, sp.endTok, sp.newLines)
		if err != nil {
			return "", err
		}
		updated = replaced
	}
	return updated, nil
}

// renderImportsBlock は imports auto block の行を返す (start/end マーカー含む、インデントなし)。
func renderImportsBlock(meta ChapterMetaInput) []string {
	lines := []string{markerImportsStart}
	lines = append(lines, `import type { ChapterMeta } from "../src/types/chapter.ts";`)

	// imports は characters → settings の順、各カテゴリ内は VarName alphabetical。
	chars := append([]EntityImport(nil), meta.Characters...)
	sets := append([]EntityImport(nil), meta.Settings...)
	sort.Slice(chars, func(i, j int) bool { return chars[i].VarName < chars[j].VarName })
	sort.Slice(sets, func(i, j int) bool { return sets[i].VarName < sets[j].VarName })

	seen := make(map[string]bool)
	for _, e := range chars {
		key := e.VarName + "|" + e.ImportPath
		if seen[key] {
			continue
		}
		seen[key] = true
		lines = append(lines, fmt.Sprintf(`import { %s } from "%s";`, e.VarName, e.ImportPath))
	}
	for _, e := range sets {
		key := e.VarName + "|" + e.ImportPath
		if seen[key] {
			continue
		}
		seen[key] = true
		lines = append(lines, fmt.Sprintf(`import { %s } from "%s";`, e.VarName, e.ImportPath))
	}
	lines = append(lines, markerImportsEnd)
	return lines
}

func renderCoreBlock(meta ChapterMetaInput, indent string) []string {
	return []string{
		indent + markerCoreStart,
		fmt.Sprintf("%stitle: %q,", indent, meta.Title),
		fmt.Sprintf("%sorder: %d,", indent, meta.Order),
		indent + markerCoreEnd,
	}
}

func renderEntitiesBlock(meta ChapterMetaInput, indent string) []string {
	chars := joinVarNames(meta.Characters)
	sets := joinVarNames(meta.Settings)
	return []string{
		indent + markerEntitiesStart,
		fmt.Sprintf("%scharacters: [%s],", indent, chars),
		fmt.Sprintf("%ssettings: [%s],", indent, sets),
		indent + markerEntitiesEnd,
	}
}

func joinVarNames(entries []EntityImport) string {
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		names = append(names, e.VarName)
	}
	return strings.Join(names, ", ")
}

func renderReferencesBlock(meta ChapterMetaInput, indent string) []string {
	lines := []string{
		indent + markerReferencesStart,
		indent + "references: {",
	}
	keys := make([]string, 0, len(meta.References))
	for k := range meta.References {
		keys = append(keys, k)
	}
	// Why: sort.Strings (UTF-8 byte order) を採用 — 日本語 collation は locale 依存で
	// deterministic ではなくなる。Go 標準で実現できる byte order を契約として固定する。
	sort.Strings(keys)
	for _, k := range keys {
		varName := meta.References[k]
		lines = append(lines, fmt.Sprintf("%s  %q: %s,", indent, k, varName))
	}
	lines = append(lines, indent+"},", indent+markerReferencesEnd)
	return lines
}

// replaceMarkedBlock は source 内の <startTok>...<endTok> 範囲を newLines で置換する。
// 既存 block のインデント (start マーカー行のリーディング空白) を保持する。
func replaceMarkedBlock(source, blockName, startTok, endTok string, newLines []string) (string, error) {
	startIdx, indent, ok := findMarkerLine(source, startTok)
	if !ok {
		return "", fmt.Errorf("cannot update: missing marker block (%s) for %s", startTok, blockName)
	}
	endIdx, _, ok := findMarkerLine(source[startIdx:], endTok)
	if !ok {
		return "", fmt.Errorf("malformed: missing end marker (%s) for %s after start", endTok, blockName)
	}
	endIdx += startIdx

	if endIdx <= startIdx {
		return "", fmt.Errorf("malformed: invalid marker ordering for %s", blockName)
	}

	// end マーカー行末まで切り出す範囲を計算
	endLineEnd := strings.Index(source[endIdx:], "\n")
	var sliceEnd int
	if endLineEnd == -1 {
		sliceEnd = len(source)
	} else {
		sliceEnd = endIdx + endLineEnd + 1
	}

	var b strings.Builder
	for i, line := range newLines {
		b.WriteString(indent)
		b.WriteString(line)
		if i < len(newLines)-1 || endLineEnd != -1 {
			b.WriteByte('\n')
		}
	}
	return source[:startIdx] + b.String() + source[sliceEnd:], nil
}

// findMarkerLine は source 内で token を含む行を探し、その行の先頭インデックスと indent を返す。
// 行頭から token までの間にインデント (空白/タブ) のみが許される。
func findMarkerLine(source, token string) (lineStart int, indent string, ok bool) {
	pos := 0
	for {
		idx := strings.Index(source[pos:], token)
		if idx == -1 {
			return 0, "", false
		}
		abs := pos + idx
		// 行頭を特定
		ls := strings.LastIndex(source[:abs], "\n")
		if ls == -1 {
			ls = 0
		} else {
			ls = ls + 1
		}
		// ls..abs がすべて空白/タブか
		prefix := source[ls:abs]
		if isAllWhitespace(prefix) {
			return ls, prefix, true
		}
		pos = abs + len(token)
	}
}

func isAllWhitespace(s string) bool {
	for _, r := range s {
		if !unicode.IsSpace(r) {
			return false
		}
	}
	return true
}

// camelCase converts e.g. "chapter01" -> "chapter01" (no separators) and "my_chapter" -> "myChapter".
// Why: TS 実装は単純に `${meta.id}Meta` を使っていたが、id が "chapter_01" 形式の可能性に備え
// snake_case → camelCase 変換を入れる。"chapter01" のような連続英数字はそのまま保持される。
func camelCase(s string) string {
	if s == "" {
		return ""
	}
	parts := strings.Split(s, "_")
	if len(parts) == 1 {
		return s
	}
	var b strings.Builder
	b.WriteString(parts[0])
	for _, p := range parts[1:] {
		if p == "" {
			continue
		}
		runes := []rune(p)
		runes[0] = unicode.ToUpper(runes[0])
		b.WriteString(string(runes))
	}
	return b.String()
}
