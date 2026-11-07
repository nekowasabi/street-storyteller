// Package manuscript implements `storyteller manuscript build`: the gate that
// turns drafts into submission manuscripts only when every check passes.
package manuscript

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/takets/street-storyteller/internal/cli"
	metamod "github.com/takets/street-storyteller/internal/cli/modules/meta"
	"github.com/takets/street-storyteller/internal/meta"
	"github.com/takets/street-storyteller/internal/service"
)

const (
	defaultDraftsDir      = "./drafts"
	defaultManuscriptsDir = "./manuscripts"
)

type buildCommand struct{}

// NewBuild returns the `manuscript build` command.
func NewBuild() cli.Command { return &buildCommand{} }

func (c *buildCommand) Name() string { return "manuscript build" }
func (c *buildCommand) Description() string {
	return "Check drafts (frontmatter + Clarity) and copy them to manuscripts; writes nothing on failure"
}

func (c *buildCommand) Handle(cctx cli.CommandContext) int {
	from, to := defaultDraftsDir, defaultManuscriptsDir
	args := cctx.Args
	for i := 0; i < len(args); i++ {
		a := args[i]
		switch {
		case a == "--from" && i+1 < len(args):
			from = args[i+1]
			i++
		case strings.HasPrefix(a, "--from="):
			from = strings.TrimPrefix(a, "--from=")
		case a == "--to" && i+1 < len(args):
			to = args[i+1]
			i++
		case strings.HasPrefix(a, "--to="):
			to = strings.TrimPrefix(a, "--to=")
		}
	}

	result, err := service.NewMetaCheckService().Run(from)
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	if len(result.Violations) > 0 {
		return metamod.PresentMetaCheck(cctx, result)
	}

	files, err := manuscriptFiles(from)
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	if err := os.MkdirAll(to, 0o755); err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	for _, f := range files {
		data, err := os.ReadFile(f)
		if err != nil {
			cctx.Presenter.ShowError(err.Error())
			return 1
		}
		if err := os.WriteFile(filepath.Join(to, filepath.Base(f)), data, 0o644); err != nil {
			cctx.Presenter.ShowError(err.Error())
			return 1
		}
	}
	if cctx.GlobalOpts.JSON {
		_ = cctx.Presenter.WriteJSON(struct {
			OK      bool   `json:"ok"`
			Built   int    `json:"built"`
			Checked int    `json:"files_checked"`
			To      string `json:"to"`
		}{OK: true, Built: len(files), Checked: result.FilesChecked, To: to})
		return 0
	}
	cctx.Presenter.ShowSuccess(fmt.Sprintf("%d manuscripts built into %s", len(files), to))
	return 0
}

// manuscriptFiles lists depth-1 .md files in dir that carry storyteller
// frontmatter. Notes without frontmatter (drafts/ideas.md) stay behind.
func manuscriptFiles(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var out []string
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".md") {
			continue
		}
		p := filepath.Join(dir, e.Name())
		data, err := os.ReadFile(p)
		if err != nil {
			return nil, err
		}
		doc, err := meta.Parse(data)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", p, err)
		}
		if !doc.HasFrontMatter || doc.Kind() != meta.DocumentKindManuscript {
			continue
		}
		out = append(out, p)
	}
	return out, nil
}
