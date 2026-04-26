// Package meta implements the `storyteller meta check` command.
package meta

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/meta"
)

const defaultManuscriptsDir = "./manuscripts"

type checkCommand struct{}

// New returns the `meta check` command.
func New() cli.Command { return &checkCommand{} }

func (c *checkCommand) Name() string        { return "meta check" }
func (c *checkCommand) Description() string { return "Validate manuscript frontmatter" }

func (c *checkCommand) Handle(cctx cli.CommandContext) int {
	dir := defaultManuscriptsDir
	args := cctx.Args
	for i := 0; i < len(args); i++ {
		a := args[i]
		switch {
		case a == "--path":
			if i+1 >= len(args) {
				cctx.Presenter.ShowError("--path requires a value")
				return 1
			}
			dir = args[i+1]
			i++
		case strings.HasPrefix(a, "--path="):
			dir = strings.TrimPrefix(a, "--path=")
		}
	}

	files, err := collectMarkdown(dir)
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}

	for _, f := range files {
		data, err := os.ReadFile(f)
		if err != nil {
			cctx.Presenter.ShowError(fmt.Sprintf("read %s: %v", f, err))
			return 1
		}
		if _, err := meta.Parse(data); err != nil {
			cctx.Presenter.ShowError(fmt.Sprintf("%s: %v", f, err))
			return 1
		}
	}

	if cctx.GlobalOpts.JSON {
		_ = cctx.Presenter.WriteJSON(struct {
			OK           bool `json:"ok"`
			FilesChecked int  `json:"files_checked"`
		}{OK: true, FilesChecked: len(files)})
		return 0
	}
	cctx.Presenter.ShowSuccess(fmt.Sprintf("%d files validated", len(files)))
	return 0
}

// collectMarkdown returns every .md file under dir (depth 1). An absent
// directory yields an empty slice rather than an error so meta check on a
// fresh project does not fail before any manuscripts exist.
//
// Why depth 1: the storyteller convention places chapters directly under
// manuscripts/. Recursive walks would also pick up draft notes that aren't
// authored manuscripts.
func collectMarkdown(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("read dir %s: %w", dir, err)
	}
	out := []string{}
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		if !strings.HasSuffix(e.Name(), ".md") {
			continue
		}
		out = append(out, filepath.Join(dir, e.Name()))
	}
	return out, nil
}
