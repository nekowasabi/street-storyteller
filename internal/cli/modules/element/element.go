package element

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/meta"
)

type Command struct {
	kind string
}

func New(kind string) cli.Command { return &Command{kind: kind} }

func (c *Command) Name() string        { return "element " + c.kind }
func (c *Command) Description() string { return "Create a " + c.kind + " element" }
func (c *Command) Usage() string {
	return "storyteller element " + c.kind + " --id <id> --name <name> [--path <project>]"
}

func (c *Command) Handle(cctx cli.CommandContext) int {
	opts, err := parseOptions(cctx.Args)
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	if opts.id == "" {
		cctx.Presenter.ShowError("--id is required")
		return 1
	}
	if strings.ContainsAny(opts.id, `/\`) {
		cctx.Presenter.ShowError("--id must not contain path separators")
		return 1
	}
	for _, field := range opts.detailFields {
		if strings.ContainsAny(field, `/\`) {
			cctx.Presenter.ShowError("detail field names must not contain path separators")
			return 1
		}
	}
	if opts.name == "" {
		opts.name = opts.id
	}
	if opts.root == "" {
		opts.root = cctx.GlobalOpts.Path
	}
	if opts.root == "" {
		cwd, err := os.Getwd()
		if err != nil {
			cctx.Presenter.ShowError(err.Error())
			return 1
		}
		opts.root = cwd
	}

	// Why: detail flags は character/setting のみで意味を持つ。他 kind 指定時はエラーとし
	// 暗黙の no-op で利用者を混乱させない。
	if (opts.withDetails || len(opts.detailFields) > 0) && c.kind != "character" && c.kind != "setting" {
		cctx.Presenter.ShowError(fmt.Sprintf("detail flags are only supported for character/setting, not %q", c.kind))
		return 1
	}
	if opts.hasCharacterNames() && c.kind != "character" {
		cctx.Presenter.ShowError(fmt.Sprintf("display name flags are only supported for character, not %q", c.kind))
		return 1
	}

	path, detailPaths, err := writeElement(opts.root, c.kind, opts)
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	if cctx.GlobalOpts.JSON {
		_ = cctx.Presenter.WriteJSON(struct {
			Kind        string   `json:"kind"`
			ID          string   `json:"id"`
			Path        string   `json:"path"`
			DetailPaths []string `json:"detail_paths,omitempty"`
		}{Kind: c.kind, ID: opts.id, Path: path, DetailPaths: detailPaths})
		return 0
	}
	cctx.Presenter.ShowSuccess(fmt.Sprintf("created %s: %s", c.kind, path))
	for _, dp := range detailPaths {
		cctx.Presenter.ShowSuccess(fmt.Sprintf("created detail: %s", dp))
	}
	return 0
}

type options struct {
	root         string
	id           string
	name         string
	role         string
	summary      string
	withDetails  bool
	detailFields []string // フィールド名のユニーク集合 (順序保持)
	nameFlags    bool
	displayNames []string
	aliases      []string
	pronouns     []string
}

// addDetailField は重複を排除しつつ順序を保持して field を追加する。
func (o *options) addDetailField(field string) {
	field = strings.TrimSpace(field)
	if field == "" {
		return
	}
	for _, existing := range o.detailFields {
		if existing == field {
			return
		}
	}
	o.detailFields = append(o.detailFields, field)
}

func (o options) hasCharacterNames() bool {
	return o.nameFlags
}

func parseCSVList(value string) []string {
	seen := make(map[string]struct{})
	var out []string
	for _, item := range strings.Split(value, ",") {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		out = append(out, item)
	}
	return out
}

func parseOptions(args []string) (options, error) {
	var opts options
	for i := 0; i < len(args); i++ {
		a := args[i]
		switch {
		case a == "--path":
			if i+1 >= len(args) {
				return opts, fmt.Errorf("--path requires a value")
			}
			opts.root = args[i+1]
			i++
		case strings.HasPrefix(a, "--path="):
			opts.root = strings.TrimPrefix(a, "--path=")
		case a == "--id":
			if i+1 >= len(args) {
				return opts, fmt.Errorf("--id requires a value")
			}
			opts.id = args[i+1]
			i++
		case strings.HasPrefix(a, "--id="):
			opts.id = strings.TrimPrefix(a, "--id=")
		case a == "--name":
			if i+1 >= len(args) {
				return opts, fmt.Errorf("--name requires a value")
			}
			opts.name = args[i+1]
			i++
		case strings.HasPrefix(a, "--name="):
			opts.name = strings.TrimPrefix(a, "--name=")
		case a == "--role":
			if i+1 >= len(args) {
				return opts, fmt.Errorf("--role requires a value")
			}
			opts.role = args[i+1]
			i++
		case strings.HasPrefix(a, "--role="):
			opts.role = strings.TrimPrefix(a, "--role=")
		case a == "--summary":
			if i+1 >= len(args) {
				return opts, fmt.Errorf("--summary requires a value")
			}
			opts.summary = args[i+1]
			i++
		case strings.HasPrefix(a, "--summary="):
			opts.summary = strings.TrimPrefix(a, "--summary=")
		case a == "--display-names":
			if i+1 >= len(args) {
				return opts, fmt.Errorf("--display-names requires a value")
			}
			opts.nameFlags = true
			opts.displayNames = parseCSVList(args[i+1])
			i++
		case strings.HasPrefix(a, "--display-names="):
			opts.nameFlags = true
			opts.displayNames = parseCSVList(strings.TrimPrefix(a, "--display-names="))
		case a == "--aliases":
			if i+1 >= len(args) {
				return opts, fmt.Errorf("--aliases requires a value")
			}
			opts.nameFlags = true
			opts.aliases = parseCSVList(args[i+1])
			i++
		case strings.HasPrefix(a, "--aliases="):
			opts.nameFlags = true
			opts.aliases = parseCSVList(strings.TrimPrefix(a, "--aliases="))
		case a == "--pronouns":
			if i+1 >= len(args) {
				return opts, fmt.Errorf("--pronouns requires a value")
			}
			opts.nameFlags = true
			opts.pronouns = parseCSVList(args[i+1])
			i++
		case strings.HasPrefix(a, "--pronouns="):
			opts.nameFlags = true
			opts.pronouns = parseCSVList(strings.TrimPrefix(a, "--pronouns="))
		case a == "--with-details":
			opts.withDetails = true
		case a == "--separate-files":
			if i+1 >= len(args) {
				return opts, fmt.Errorf("--separate-files requires a value")
			}
			opts.addDetailField(args[i+1])
			i++
		case strings.HasPrefix(a, "--separate-files="):
			opts.addDetailField(strings.TrimPrefix(a, "--separate-files="))
		case a == "--add-details":
			if i+1 >= len(args) {
				return opts, fmt.Errorf("--add-details requires a value")
			}
			for _, f := range strings.Split(args[i+1], ",") {
				opts.addDetailField(f)
			}
			i++
		case strings.HasPrefix(a, "--add-details="):
			for _, f := range strings.Split(strings.TrimPrefix(a, "--add-details="), ",") {
				opts.addDetailField(f)
			}
		}
	}
	return opts, nil
}

func writeElement(root, kind string, opts options) (path string, detailPaths []string, err error) {
	dir, typeName, body := elementTemplate(kind, opts)
	path = filepath.Join(root, dir, opts.id+".ts")
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return "", nil, err
	}
	content := fmt.Sprintf("import type { %s } from \"@storyteller/types/v2/%s.ts\";\n\nexport const %s: %s = %s;\n", typeName, importTypeFile(kind), opts.id, typeName, body)
	if err := createFile(path, []byte(content)); err != nil {
		return "", nil, err
	}
	createdSource := path
	defer func() {
		if err != nil {
			_ = os.Remove(createdSource)
		}
	}()

	// Why: detail md は --separate-files / --add-details に列挙された field 分のみ生成。
	// --with-details (フィールド指定なし) は TS 側 details:{} のみで md は生成しない。
	detailPaths, err = writeDetailFiles(filepath.Dir(path), kind, opts)
	if err != nil {
		for _, created := range detailPaths {
			_ = os.Remove(created)
		}
		return "", nil, err
	}
	return path, detailPaths, nil
}

// createFile never replaces authored content, including a symlink target.
func createFile(path string, content []byte) error {
	f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0644)
	if err != nil {
		return err
	}
	_, writeErr := f.Write(content)
	closeErr := f.Close()
	if writeErr != nil {
		_ = os.Remove(path)
		return writeErr
	}
	if closeErr != nil {
		_ = os.Remove(path)
		return closeErr
	}
	return nil
}

// writeDetailFiles は detailFields ごとに <id>_<field>.md を生成する。
// 既存ファイルがある場合は上書きせずエラーを返す (data loss 防止)。
func writeDetailFiles(dir, kind string, opts options) ([]string, error) {
	if len(opts.detailFields) == 0 {
		return nil, nil
	}
	docType := detailDocType(kind)
	if docType == "" {
		return nil, fmt.Errorf("detail md not supported for kind %q", kind)
	}
	out := make([]string, 0, len(opts.detailFields))
	for _, field := range opts.detailFields {
		mdPath := filepath.Join(dir, opts.id+"_"+field+".md")
		doc := &meta.Document{
			HasFrontMatter: true,
			FrontMatter: meta.FrontMatter{
				Type:     docType,
				EntityID: opts.id,
				Field:    field,
			},
		}
		// bodyRaw 用プレースホルダ。Encode は bodyRaw を frontmatter 末尾に連結する。
		body := fmt.Sprintf("\nTODO: %s を記述\n", field)
		// Document.bodyRaw は非 export だが Encode は d.bodyRaw を読む。
		// よって直接生成ではなく Parse 経由は不要 — 一旦 Encode して body を末尾に追記する。
		encoded, err := doc.Encode()
		if err != nil {
			return out, err
		}
		final := append(encoded, []byte(body)...)
		if err := createFile(mdPath, final); err != nil {
			return out, err
		}
		out = append(out, mdPath)
	}
	return out, nil
}

func detailDocType(kind string) string {
	switch kind {
	case "character":
		return "character_detail"
	case "setting":
		return "setting_detail"
	default:
		return ""
	}
}

// detailsLiteral は TS の details オブジェクトリテラルを生成する。
// withDetails=true かつ detailFields=[] → "{}"。
// detailFields 非空 → 各 field を { file: "./<id>_<field>.md" } で展開。
// 何もなければ空文字を返し、呼び出し側で details キー自体を省略する。
func detailsLiteral(id string, opts options) string {
	if !opts.withDetails && len(opts.detailFields) == 0 {
		return ""
	}
	if len(opts.detailFields) == 0 {
		return "{}"
	}
	// Why: 出力安定性のため field 名でソート。テスト golden 比較を容易にする。
	fields := make([]string, len(opts.detailFields))
	copy(fields, opts.detailFields)
	sort.Strings(fields)
	var b strings.Builder
	b.WriteString("{\n")
	for _, f := range fields {
		fmt.Fprintf(&b, "    %s: { file: \"./%s_%s.md\" },\n", f, id, f)
	}
	b.WriteString("  }")
	return b.String()
}

func tsStringArrayLiteral(values []string) string {
	var b strings.Builder
	b.WriteString("[")
	for i, value := range values {
		if i > 0 {
			b.WriteString(", ")
		}
		fmt.Fprintf(&b, "%q", value)
	}
	b.WriteString("]")
	return b.String()
}

func elementTemplate(kind string, opts options) (dir, typeName, body string) {
	summary := opts.summary
	if summary == "" {
		summary = opts.name + "の概要"
	}
	switch kind {
	case "character":
		role := opts.role
		if role == "" {
			role = "supporting"
		}
		base := fmt.Sprintf("{\n  id: %q,\n  name: %q,\n  role: %q,\n  traits: [],\n  relationships: {},\n  appearingChapters: [],\n  summary: %q,", opts.id, opts.name, role, summary)
		if len(opts.displayNames) > 0 {
			base += fmt.Sprintf("\n  displayNames: %s,", tsStringArrayLiteral(opts.displayNames))
		}
		if len(opts.aliases) > 0 {
			base += fmt.Sprintf("\n  aliases: %s,", tsStringArrayLiteral(opts.aliases))
		}
		if len(opts.pronouns) > 0 {
			base += fmt.Sprintf("\n  pronouns: %s,", tsStringArrayLiteral(opts.pronouns))
		}
		if dl := detailsLiteral(opts.id, opts); dl != "" {
			base += fmt.Sprintf("\n  details: %s,", dl)
		}
		base += "\n}"
		return "src/characters", "Character", base
	case "setting":
		base := fmt.Sprintf("{\n  id: %q,\n  name: %q,\n  type: \"location\",\n  appearingChapters: [],\n  summary: %q,", opts.id, opts.name, summary)
		if dl := detailsLiteral(opts.id, opts); dl != "" {
			base += fmt.Sprintf("\n  details: %s,", dl)
		}
		base += "\n}"
		return "src/settings", "Setting", base
	case "timeline":
		return "src/timelines", "Timeline", fmt.Sprintf("{\n  id: %q,\n  name: %q,\n  scope: \"story\",\n  summary: %q,\n  events: [],\n}", opts.id, opts.name, summary)
	case "foreshadowing":
		return "src/foreshadowings", "Foreshadowing", fmt.Sprintf("{\n  id: %q,\n  name: %q,\n  type: \"hint\",\n  summary: %q,\n  planting: { chapter: \"\", description: \"\" },\n  status: \"planted\",\n}", opts.id, opts.name, summary)
	case "plot", "beat", "intersection":
		return "src/plots", "Plot", fmt.Sprintf("{\n  id: %q,\n  name: %q,\n  type: \"sub\",\n  status: \"active\",\n  summary: %q,\n  beats: [],\n}", opts.id, opts.name, summary)
	case "phase":
		return "src/characters", "CharacterPhase", fmt.Sprintf("{\n  id: %q,\n  name: %q,\n  summary: %q,\n}", opts.id, opts.name, summary)
	default:
		return "src/" + kind + "s", "unknown", "{}"
	}
}

func importTypeFile(kind string) string {
	switch kind {
	case "phase":
		return "character_phase"
	case "beat", "intersection":
		return "plot"
	default:
		return kind
	}
}
