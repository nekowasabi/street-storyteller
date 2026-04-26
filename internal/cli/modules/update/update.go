package update

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/project/manifest"
)

type Command struct{}

func New() cli.Command { return &Command{} }

func (c *Command) Name() string        { return "update" }
func (c *Command) Description() string { return "Update project metadata for the Go engine" }
func (c *Command) Usage() string       { return "storyteller update [--path <project>] [--check|--apply]" }

func (c *Command) Handle(cctx cli.CommandContext) int {
	root := cctx.GlobalOpts.Path
	checkOnly := false
	for i := 0; i < len(cctx.Args); i++ {
		a := cctx.Args[i]
		switch {
		case a == "--path":
			if i+1 >= len(cctx.Args) {
				cctx.Presenter.ShowError("--path requires a value")
				return 1
			}
			root = cctx.Args[i+1]
			i++
		case strings.HasPrefix(a, "--path="):
			root = strings.TrimPrefix(a, "--path=")
		case a == "--check":
			checkOnly = true
		}
	}
	if root == "" {
		cwd, err := os.Getwd()
		if err != nil {
			cctx.Presenter.ShowError(err.Error())
			return 1
		}
		root = cwd
	}
	if _, err := manifest.Load(root); err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	if !checkOnly {
		if err := os.WriteFile(filepath.Join(root, ".storyteller-go-ready"), []byte("ok\n"), 0644); err != nil {
			cctx.Presenter.ShowError(err.Error())
			return 1
		}
	}
	msg := fmt.Sprintf("project is up to date: %s", root)
	if cctx.GlobalOpts.JSON {
		_ = cctx.Presenter.WriteJSON(struct {
			OK   bool   `json:"ok"`
			Path string `json:"path"`
		}{OK: true, Path: root})
		return 0
	}
	cctx.Presenter.ShowSuccess(msg)
	return 0
}
