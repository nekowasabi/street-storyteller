// Package meta also implements `storyteller meta annotate`, which retrofits
// detail markdown files with the frontmatter required by skill rule
// "frontmatter は手書きしない・CLI 経由で生成".
package meta

import (
	"fmt"
	"os"
	"strings"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/meta"
	"github.com/takets/street-storyteller/internal/service"
)

type annotateCommand struct{}

// NewAnnotate returns the `meta annotate` command.
func NewAnnotate() cli.Command { return &annotateCommand{} }

func (c *annotateCommand) Name() string { return "meta annotate" }
func (c *annotateCommand) Description() string {
	return "Add or update detail frontmatter (type/entity_id/field) on an existing markdown file"
}

type annotateArgs struct {
	file     string
	typ      string
	entityID string
	field    string
	force    bool
}

// Why: a tiny parser instead of pflag/cobra, matching the existing
// hand-rolled flag handling style of `meta check` (avoid introducing a
// dependency just for one new command).
func parseAnnotateArgs(args []string) (annotateArgs, error) {
	var a annotateArgs
	for i := 0; i < len(args); i++ {
		x := args[i]
		switch {
		case x == "--type":
			if i+1 >= len(args) {
				return a, fmt.Errorf("--type requires a value")
			}
			a.typ = args[i+1]
			i++
		case strings.HasPrefix(x, "--type="):
			a.typ = strings.TrimPrefix(x, "--type=")
		case x == "--entity-id":
			if i+1 >= len(args) {
				return a, fmt.Errorf("--entity-id requires a value")
			}
			a.entityID = args[i+1]
			i++
		case strings.HasPrefix(x, "--entity-id="):
			a.entityID = strings.TrimPrefix(x, "--entity-id=")
		case x == "--field":
			if i+1 >= len(args) {
				return a, fmt.Errorf("--field requires a value")
			}
			a.field = args[i+1]
			i++
		case strings.HasPrefix(x, "--field="):
			a.field = strings.TrimPrefix(x, "--field=")
		case x == "--force":
			a.force = true
		case strings.HasPrefix(x, "--"):
			return a, fmt.Errorf("unknown flag: %s", x)
		default:
			if a.file != "" {
				return a, fmt.Errorf("unexpected positional argument: %s", x)
			}
			a.file = x
		}
	}
	if a.file == "" {
		return a, fmt.Errorf("file path is required")
	}
	if a.typ == "" {
		return a, fmt.Errorf("--type is required")
	}
	if a.entityID == "" {
		return a, fmt.Errorf("--entity-id is required")
	}
	if a.field == "" {
		return a, fmt.Errorf("--field is required")
	}
	if !service.IsValidDetailType(a.typ) {
		return a, fmt.Errorf("invalid --type %q (must be one of: character_detail, setting_detail, plot_detail)", a.typ)
	}
	return a, nil
}

func (c *annotateCommand) Handle(cctx cli.CommandContext) int {
	a, err := parseAnnotateArgs(cctx.Args)
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}

	data, err := os.ReadFile(a.file)
	if err != nil {
		cctx.Presenter.ShowError(fmt.Sprintf("read %s: %v", a.file, err))
		return 1
	}

	if !strings.HasSuffix(strings.ToLower(a.file), ".md") {
		// Why: warn but do not fail — some authors keep .markdown or stray
		// extensions while authoring; matches "本文を完全保持" intent.
		cctx.Presenter.ShowWarning(fmt.Sprintf("warning: %s does not have .md extension", a.file))
	}

	doc, err := meta.Parse(data)
	if err != nil {
		cctx.Presenter.ShowError(fmt.Sprintf("parse %s: %v", a.file, err))
		return 1
	}

	// Conflict detection: only block when an existing detail-frontmatter
	// disagrees with the requested values. manuscript-only frontmatter
	// (chapter_id 等) is preserved untouched and never triggers conflict.
	existing := doc.FrontMatter
	hasDetail := existing.Type != "" || existing.EntityID != "" || existing.Field != ""
	if hasDetail && !a.force {
		conflict := (existing.Type != "" && existing.Type != a.typ) ||
			(existing.EntityID != "" && existing.EntityID != a.entityID) ||
			(existing.Field != "" && existing.Field != a.field)
		if conflict {
			cctx.Presenter.ShowError(fmt.Sprintf(
				"refusing to overwrite existing detail frontmatter on %s (type=%q entity_id=%q field=%q); pass --force to override",
				a.file, existing.Type, existing.EntityID, existing.Field,
			))
			return 1
		}
	}

	doc.FrontMatter.Type = a.typ
	doc.FrontMatter.EntityID = a.entityID
	doc.FrontMatter.Field = a.field
	// Why: ensure Encode emits a frontmatter block even if the input had none.
	doc.HasFrontMatter = true

	out, err := doc.Encode()
	if err != nil {
		cctx.Presenter.ShowError(fmt.Sprintf("encode: %v", err))
		return 1
	}
	if err := os.WriteFile(a.file, out, 0o644); err != nil {
		cctx.Presenter.ShowError(fmt.Sprintf("write %s: %v", a.file, err))
		return 1
	}

	if cctx.GlobalOpts.JSON {
		_ = cctx.Presenter.WriteJSON(struct {
			OK       bool   `json:"ok"`
			File     string `json:"file"`
			Type     string `json:"type"`
			EntityID string `json:"entity_id"`
			Field    string `json:"field"`
		}{OK: true, File: a.file, Type: a.typ, EntityID: a.entityID, Field: a.field})
		return 0
	}
	cctx.Presenter.ShowSuccess(fmt.Sprintf("✓ Annotated %s with type=%s entity_id=%s field=%s", a.file, a.typ, a.entityID, a.field))
	return 0
}
