package meta

import (
	"bytes"
	"fmt"
	"strconv"
	"strings"

	"github.com/takets/street-storyteller/internal/detect"
	apperrors "github.com/takets/street-storyteller/internal/errors"
)

// FrontMatter は manuscript の YAML FrontMatter の "storyteller:" 配下を表現する。
// YAML 上は `storyteller:` で 1 段ネストするが、Go API としては flat に展開する。
type FrontMatter struct {
	ChapterID      string
	Title          string
	Order          int
	Characters     []string
	Settings       []string
	Foreshadowings []string
	TimelineEvents []string
	Phases         []string
	Timelines      []string
}

// Document は manuscript ファイル全体を表現する。
// Body は人間向けの文字列、bodyRaw は Encode 時に byte 完全一致を保証するための原本。
type Document struct {
	FrontMatter    FrontMatter
	Body           string
	HasFrontMatter bool
	bodyRaw        []byte
}

// Parse は manuscript の bytes から FrontMatter と Body を切り出す。
// "---\n" で囲まれた YAML ブロックがなければ HasFrontMatter=false で全文を Body として返す。
//
// Why: yaml.v3 を依存に追加せず自前で行うため、フォーマットは固定 (2-space indent、scalar / list、storyteller: 1 段ネスト) を前提とする。
// 代替の "yaml.v3 で全体 marshal" は go.mod の修正が必要かつ Body bytes の完全保持を破壊するため不採用。
func Parse(content []byte) (*Document, error) {
	if !startsWithFrontMatter(content) {
		return &Document{
			Body:           string(content),
			HasFrontMatter: false,
			bodyRaw:        content,
		}, nil
	}

	firstNL := bytes.IndexByte(content, '\n')
	if firstNL == -1 {
		return &Document{
			Body:           string(content),
			HasFrontMatter: false,
			bodyRaw:        content,
		}, nil
	}
	afterFirst := content[firstNL+1:]

	closingLineStart, bodyStart, ok := findClosingDelimiter(afterFirst)
	if !ok {
		return &Document{
			Body:           string(content),
			HasFrontMatter: false,
			bodyRaw:        content,
		}, nil
	}

	yamlBytes := afterFirst[:closingLineStart]
	bodyRaw := afterFirst[bodyStart:]

	var fm FrontMatter
	if err := parseFrontMatterYAML(yamlBytes, &fm); err != nil {
		return nil, err
	}

	return &Document{
		FrontMatter:    fm,
		Body:           string(bodyRaw),
		HasFrontMatter: true,
		bodyRaw:        bodyRaw,
	}, nil
}

// isEmpty は FrontMatter の全フィールドがゼロ値かどうかを返す。
// Why: Encode の三項分岐 (なし+空 / なし+非空 / あり) で用いる。
// 「編集 API に HasFrontMatter を意識させる」のではなく、Encode 側で吸収する設計。
func (f FrontMatter) isEmpty() bool {
	return f.ChapterID == "" &&
		f.Title == "" &&
		f.Order == 0 &&
		len(f.Characters) == 0 &&
		len(f.Settings) == 0 &&
		len(f.Foreshadowings) == 0 &&
		len(f.TimelineEvents) == 0 &&
		len(f.Phases) == 0 &&
		len(f.Timelines) == 0
}

// Encode は FrontMatter を YAML として再生成し、保持していた Body raw bytes と結合する。
// HasFrontMatter==false かつ FrontMatter が空の場合は bodyRaw をそのまま返す (byte-perfect)。
// HasFrontMatter==false かつ FrontMatter が非空の場合は新規 YAML ブロックを先頭に付与する。
func (d *Document) Encode() ([]byte, error) {
	if !d.HasFrontMatter && d.FrontMatter.isEmpty() {
		return d.bodyRaw, nil
	}

	var buf bytes.Buffer
	buf.WriteString("---\n")
	buf.WriteString("storyteller:\n")
	if d.FrontMatter.ChapterID != "" {
		buf.WriteString("  chapter_id: ")
		buf.WriteString(quoteIfNeeded(d.FrontMatter.ChapterID))
		buf.WriteString("\n")
	}
	if d.FrontMatter.Title != "" {
		buf.WriteString("  title: ")
		buf.WriteString(quoteIfNeeded(d.FrontMatter.Title))
		buf.WriteString("\n")
	}
	if d.FrontMatter.Order != 0 {
		buf.WriteString("  order: ")
		buf.WriteString(strconv.Itoa(d.FrontMatter.Order))
		buf.WriteString("\n")
	}
	writeList(&buf, "characters", d.FrontMatter.Characters)
	writeList(&buf, "settings", d.FrontMatter.Settings)
	writeList(&buf, "foreshadowings", d.FrontMatter.Foreshadowings)
	writeList(&buf, "timeline_events", d.FrontMatter.TimelineEvents)
	writeList(&buf, "phases", d.FrontMatter.Phases)
	writeList(&buf, "timelines", d.FrontMatter.Timelines)
	buf.WriteString("---\n")
	buf.Write(d.bodyRaw)
	return buf.Bytes(), nil
}

// AddEntities は kind に対応するリストへ ids を追加する。重複は skip する。
func (d *Document) AddEntities(kind detect.EntityKind, ids ...string) error {
	list, err := d.getList(kind)
	if err != nil {
		return err
	}
	seen := make(map[string]struct{}, len(*list)+len(ids))
	for _, id := range *list {
		seen[id] = struct{}{}
	}
	for _, id := range ids {
		if _, dup := seen[id]; dup {
			continue
		}
		*list = append(*list, id)
		seen[id] = struct{}{}
	}
	return nil
}

// RemoveEntities は kind に対応するリストから ids を削除する。存在しない ID は no-op。
func (d *Document) RemoveEntities(kind detect.EntityKind, ids ...string) {
	list, err := d.getList(kind)
	if err != nil {
		return
	}
	rmSet := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		rmSet[id] = struct{}{}
	}
	filtered := (*list)[:0]
	for _, item := range *list {
		if _, drop := rmSet[item]; drop {
			continue
		}
		filtered = append(filtered, item)
	}
	*list = filtered
}

// SetEntities は kind に対応するリストを ids で完全置換する (順序保持)。
func (d *Document) SetEntities(kind detect.EntityKind, ids []string) error {
	list, err := d.getList(kind)
	if err != nil {
		return err
	}
	cp := make([]string, len(ids))
	copy(cp, ids)
	*list = cp
	return nil
}

func (d *Document) getList(kind detect.EntityKind) (*[]string, error) {
	switch kind {
	case detect.EntityCharacter:
		return &d.FrontMatter.Characters, nil
	case detect.EntitySetting:
		return &d.FrontMatter.Settings, nil
	case detect.EntityForeshadowing:
		return &d.FrontMatter.Foreshadowings, nil
	case detect.EntityTimelineEvent:
		return &d.FrontMatter.TimelineEvents, nil
	case detect.EntityPhase:
		return &d.FrontMatter.Phases, nil
	case detect.EntityTimeline:
		return &d.FrontMatter.Timelines, nil
	default:
		return nil, apperrors.New(apperrors.CodeUnsupportedFormat, fmt.Sprintf("meta: unsupported entity kind: %s", kind))
	}
}

func startsWithFrontMatter(content []byte) bool {
	return bytes.HasPrefix(content, []byte("---\n")) ||
		bytes.HasPrefix(content, []byte("---\r\n"))
}

// findClosingDelimiter は YAML 部分から閉じ "---" 行を探す。
// 戻り値: (閉じ行の先頭 offset, 閉じ行直後の offset, 見つかったか)。
func findClosingDelimiter(buf []byte) (int, int, bool) {
	lineStart := 0
	for lineStart < len(buf) {
		nl := bytes.IndexByte(buf[lineStart:], '\n')
		var line []byte
		var lineEnd int
		if nl == -1 {
			line = buf[lineStart:]
			lineEnd = len(buf)
		} else {
			line = buf[lineStart : lineStart+nl]
			lineEnd = lineStart + nl + 1
		}
		if len(line) > 0 && line[len(line)-1] == '\r' {
			line = line[:len(line)-1]
		}
		if string(line) == "---" {
			return lineStart, lineEnd, true
		}
		if nl == -1 {
			return 0, 0, false
		}
		lineStart = lineEnd
	}
	return 0, 0, false
}

func parseFrontMatterYAML(yamlBytes []byte, fm *FrontMatter) error {
	text := string(yamlBytes)
	lines := strings.Split(text, "\n")

	i := 0
	for i < len(lines) && strings.TrimSpace(stripCR(lines[i])) == "" {
		i++
	}
	if i >= len(lines) || strings.TrimSpace(stripCR(lines[i])) != "storyteller:" {
		return apperrors.New(apperrors.CodeParse, "meta: frontmatter must start with 'storyteller:' top-level key")
	}
	i++

	for i < len(lines) {
		line := stripCR(lines[i])
		if strings.TrimSpace(line) == "" {
			i++
			continue
		}
		if !strings.HasPrefix(line, "  ") {
			break
		}
		// Reject deeper indents at this level (children must be 2-space).
		if strings.HasPrefix(line, "   ") {
			i++
			continue
		}

		keyLine := line[2:]
		colonIdx := strings.Index(keyLine, ":")
		if colonIdx == -1 {
			i++
			continue
		}
		key := keyLine[:colonIdx]
		valueStr := strings.TrimSpace(keyLine[colonIdx+1:])

		if valueStr == "" {
			items := []string{}
			i++
			for i < len(lines) {
				child := stripCR(lines[i])
				if !strings.HasPrefix(child, "    - ") {
					if strings.TrimSpace(child) == "" {
						i++
						continue
					}
					break
				}
				item := strings.TrimSpace(child[len("    - "):])
				items = append(items, unquote(item))
				i++
			}
			assignList(fm, key, items)
			continue
		}

		assignScalar(fm, key, unquote(valueStr))
		i++
	}
	return nil
}

func stripCR(s string) string {
	if len(s) > 0 && s[len(s)-1] == '\r' {
		return s[:len(s)-1]
	}
	return s
}

func unquote(s string) string {
	if len(s) >= 2 {
		if (s[0] == '"' && s[len(s)-1] == '"') || (s[0] == '\'' && s[len(s)-1] == '\'') {
			inner := s[1 : len(s)-1]
			if s[0] == '"' {
				inner = strings.ReplaceAll(inner, `\"`, `"`)
				inner = strings.ReplaceAll(inner, `\\`, `\`)
			}
			return inner
		}
	}
	return s
}

func assignScalar(fm *FrontMatter, key, value string) {
	switch key {
	case "chapter_id":
		fm.ChapterID = value
	case "title":
		fm.Title = value
	case "order":
		if n, err := strconv.Atoi(value); err == nil {
			fm.Order = n
		}
	}
}

func assignList(fm *FrontMatter, key string, list []string) {
	switch key {
	case "characters":
		fm.Characters = list
	case "settings":
		fm.Settings = list
	case "foreshadowings":
		fm.Foreshadowings = list
	case "timeline_events":
		fm.TimelineEvents = list
	case "phases":
		fm.Phases = list
	case "timelines":
		fm.Timelines = list
	}
}

func quoteIfNeeded(s string) string {
	if s == "" {
		return `""`
	}
	if needsQuote(s) {
		escaped := strings.ReplaceAll(s, `\`, `\\`)
		escaped = strings.ReplaceAll(escaped, `"`, `\"`)
		return `"` + escaped + `"`
	}
	return s
}

func needsQuote(s string) bool {
	if s == "" {
		return true
	}
	for _, r := range s {
		if r > 127 {
			return true
		}
	}
	if strings.ContainsAny(s, ":\"'#&*!|>%@`{}[],?") {
		return true
	}
	if strings.HasPrefix(s, " ") || strings.HasSuffix(s, " ") {
		return true
	}
	return false
}

func writeList(buf *bytes.Buffer, key string, list []string) {
	if len(list) == 0 {
		return
	}
	buf.WriteString("  ")
	buf.WriteString(key)
	buf.WriteString(":\n")
	for _, item := range list {
		buf.WriteString("    - ")
		buf.WriteString(quoteIfNeeded(item))
		buf.WriteString("\n")
	}
}
