package migrate

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/takets/street-storyteller/internal/cli"
)

type Command struct{}

func New() cli.Command { return &Command{} }

func (c *Command) Name() string { return "migrate" }
func (c *Command) Description() string {
	return "Migrate storyteller projects between breaking schema versions"
}
func (c *Command) Usage() string {
	return "storyteller migrate plot-rename [--path <project>] [--dry-run|--apply]"
}

type options struct {
	root       string
	apply      bool
	allowDirty bool
}

func (c *Command) Handle(cctx cli.CommandContext) int {
	if len(cctx.Args) == 0 || cctx.Args[0] != "plot-rename" {
		cctx.Presenter.ShowError("migrate requires subcommand: plot-rename")
		return 1
	}
	opts, err := parseOptions(cctx.Args[1:], cctx.GlobalOpts.Path)
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	if opts.root == "" {
		opts.root, err = os.Getwd()
		if err != nil {
			cctx.Presenter.ShowError(err.Error())
			return 1
		}
	}
	if err := checkConsistentPlotDirs(opts.root); err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	plan, err := buildPlan(opts.root)
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	if !opts.apply {
		for _, change := range plan.Changes {
			cctx.Presenter.ShowInfo("dry-run: " + change)
		}
		cctx.Presenter.ShowInfo(fmt.Sprintf("%d files to update", plan.FilesToUpdate))
		cctx.Presenter.ShowInfo("run with --apply to modify files")
		return 0
	}
	if !opts.allowDirty {
		clean, err := gitClean(opts.root)
		if err == nil && !clean {
			cctx.Presenter.ShowError("Please commit or stash changes before migration")
			return 1
		}
	}
	if err := applyPlotRename(opts.root); err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	cctx.Presenter.ShowSuccess("migration applied: plot-rename")
	cctx.Presenter.ShowInfo("review changes and commit as one migration commit")
	return 0
}

func parseOptions(args []string, root string) (options, error) {
	opts := options{root: root}
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
		case a == "--apply":
			opts.apply = true
		case a == "--dry-run":
			opts.apply = false
		case a == "--allow-dirty":
			opts.allowDirty = true
		default:
			return opts, fmt.Errorf("unknown migrate option %q", a)
		}
	}
	return opts, nil
}

type planResult struct {
	Changes       []string
	FilesToUpdate int
}

func buildPlan(root string) (planResult, error) {
	plan := planResult{}
	if pathExists(filepath.Join(root, "src", "subplots")) {
		plan.Changes = append(plan.Changes, "src/subplots -> src/plots")
	}
	files, err := countContentUpdates(root)
	if err != nil {
		return plan, err
	}
	plan.FilesToUpdate = files
	if files > 0 {
		plan.Changes = append(plan.Changes,
			"Subplot -> Plot in TypeScript sources",
			"subplots: -> plots: in manuscript frontmatter and manifest paths",
			`type: "subplot" -> type: "sub"`,
		)
	}
	if len(plan.Changes) == 0 {
		plan.Changes = append(plan.Changes, "no changes")
	}
	return plan, nil
}

func gitClean(root string) (bool, error) {
	out, err := gitStatusPorcelain(root)
	if err != nil {
		return true, err
	}
	return strings.TrimSpace(string(out)) == "", nil
}

var gitStatusPorcelain = func(root string) ([]byte, error) {
	cmd := exec.Command("git", "status", "--porcelain")
	cmd.Dir = root
	return cmd.Output()
}

func applyPlotRename(root string) error {
	oldDir := filepath.Join(root, "src", "subplots")
	newDir := filepath.Join(root, "src", "plots")
	if _, err := os.Stat(oldDir); err == nil {
		if err := os.MkdirAll(filepath.Dir(newDir), 0755); err != nil {
			return err
		}
		if err := os.Rename(oldDir, newDir); err != nil {
			return err
		}
	}
	return filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			switch d.Name() {
			case ".git", "node_modules", "vendor":
				return filepath.SkipDir
			default:
				return nil
			}
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		next := migrateContent(string(data))
		if next == string(data) {
			return nil
		}
		return os.WriteFile(path, []byte(next), 0644)
	})
}

func migrateContent(s string) string {
	s = strings.ReplaceAll(s, `type: "subplot"`, `type: "sub"`)
	s = strings.ReplaceAll(s, `type:"subplot"`, `type:"sub"`)
	replacer := strings.NewReplacer(
		"Subplots", "Plots",
		"Subplot", "Plot",
		"subplots", "plots",
		"subplot", "plot",
	)
	return replacer.Replace(s)
}

func countContentUpdates(root string) (int, error) {
	count := 0
	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			switch d.Name() {
			case ".git", "node_modules", "vendor":
				return filepath.SkipDir
			default:
				return nil
			}
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if migrateContent(string(data)) != string(data) {
			count++
		}
		return nil
	})
	return count, err
}

func checkConsistentPlotDirs(root string) error {
	oldDir := filepath.Join(root, "src", "subplots")
	newDir := filepath.Join(root, "src", "plots")
	oldExists := pathExists(oldDir)
	newExists := pathExists(newDir)
	if oldExists && newExists {
		return fmt.Errorf("both src/subplots and src/plots exist; resolve the partial migration before running plot-rename")
	}
	return nil
}

func pathExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
