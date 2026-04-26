package element

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/takets/street-storyteller/internal/cli"
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

	path, err := writeElement(opts.root, c.kind, opts)
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	if cctx.GlobalOpts.JSON {
		_ = cctx.Presenter.WriteJSON(struct {
			Kind string `json:"kind"`
			ID   string `json:"id"`
			Path string `json:"path"`
		}{Kind: c.kind, ID: opts.id, Path: path})
		return 0
	}
	cctx.Presenter.ShowSuccess(fmt.Sprintf("created %s: %s", c.kind, path))
	return 0
}

type options struct {
	root    string
	id      string
	name    string
	role    string
	summary string
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
		}
	}
	return opts, nil
}

func writeElement(root, kind string, opts options) (string, error) {
	dir, typeName, body := elementTemplate(kind, opts)
	path := filepath.Join(root, dir, opts.id+".ts")
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return "", err
	}
	content := fmt.Sprintf("import type { %s } from \"@storyteller/types/v2/%s.ts\";\n\nexport const %s: %s = %s;\n", typeName, importTypeFile(kind), opts.id, typeName, body)
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		return "", err
	}
	return path, nil
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
		return "src/characters", "Character", fmt.Sprintf("{\n  id: %q,\n  name: %q,\n  role: %q,\n  traits: [],\n  relationships: {},\n  appearingChapters: [],\n  summary: %q,\n}", opts.id, opts.name, role, summary)
	case "setting":
		return "src/settings", "Setting", fmt.Sprintf("{\n  id: %q,\n  name: %q,\n  type: \"location\",\n  appearingChapters: [],\n  summary: %q,\n}", opts.id, opts.name, summary)
	case "timeline":
		return "src/timelines", "Timeline", fmt.Sprintf("{\n  id: %q,\n  name: %q,\n  scope: \"story\",\n  summary: %q,\n  events: [],\n}", opts.id, opts.name, summary)
	case "foreshadowing":
		return "src/foreshadowings", "Foreshadowing", fmt.Sprintf("{\n  id: %q,\n  name: %q,\n  type: \"hint\",\n  summary: %q,\n  planting: { chapter: \"\", description: \"\" },\n  status: \"planted\",\n}", opts.id, opts.name, summary)
	case "subplot", "beat", "intersection":
		return "src/subplots", "Subplot", fmt.Sprintf("{\n  id: %q,\n  name: %q,\n  type: \"subplot\",\n  status: \"active\",\n  summary: %q,\n  beats: [],\n}", opts.id, opts.name, summary)
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
		return "subplot"
	default:
		return kind
	}
}
