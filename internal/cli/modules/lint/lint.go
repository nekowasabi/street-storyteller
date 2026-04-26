// Package lint implements the `storyteller lint` command.
package lint

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/external/textlint"
	"github.com/takets/street-storyteller/internal/testkit/process"
)

// lintJSONResult is the structured output for --json mode.
type lintJSONResult struct {
	Files    int `json:"files"`
	Warnings int `json:"warnings"`
	Errors   int `json:"errors"`
}

// lintCommand implements `storyteller lint`.
type lintCommand struct {
	// worker performs the actual textlint execution (injected for testing).
	worker textlint.Worker
	// avRunner is used by IsAvailable pre-flight check.
	avRunner process.Runner
	// available pre-computes availability; set by New() or tests.
	available bool
}

// New returns the `lint` command using production defaults (RealRunner).
func New() cli.Command {
	r := process.RealRunner{}
	return &lintCommand{
		worker:   textlint.NewRealWorker(r, nil),
		avRunner: r,
	}
}

func (c *lintCommand) Name() string        { return "lint" }
func (c *lintCommand) Description() string { return "Run manuscript lint checks" }

func (c *lintCommand) Handle(cctx cli.CommandContext) int {
	// Parse flags.
	path := "."
	var severityFilter string // "" = all, "error" = errors only
	fix := false
	args := cctx.Args
	for i := 0; i < len(args); i++ {
		a := args[i]
		switch {
		case a == "--path":
			if i+1 >= len(args) {
				cctx.Presenter.ShowError("--path requires a value")
				return 1
			}
			path = args[i+1]
			i++
		case strings.HasPrefix(a, "--path="):
			path = strings.TrimPrefix(a, "--path=")
		case a == "--severity":
			if i+1 >= len(args) {
				cctx.Presenter.ShowError("--severity requires a value")
				return 1
			}
			severityFilter = args[i+1]
			i++
		case strings.HasPrefix(a, "--severity="):
			severityFilter = strings.TrimPrefix(a, "--severity=")
		case a == "--fix":
			fix = true
		}
	}
	_ = fix // stub: --fix is planned but not yet implemented

	// Pre-flight: check availability.
	if !c.available {
		ctx := cctx.Ctx
		if ctx == nil {
			ctx = context.Background()
		}
		ok, reason := textlint.IsAvailable(ctx, c.avRunner)
		if !ok {
			msg := fmt.Sprintf("textlint not available, skipping: %s", reason)
			cctx.Presenter.ShowInfo(msg)
			return 0
		}
		c.available = true
	}

	// Collect .md files under path.
	files, err := collectMarkdown(path)
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}

	// Run textlint on each file and aggregate results.
	ctx := cctx.Ctx
	if ctx == nil {
		ctx = context.Background()
	}

	var allMsgs []textlint.Message
	for _, f := range files {
		content, readErr := os.ReadFile(f)
		if readErr != nil {
			cctx.Presenter.ShowWarning(fmt.Sprintf("cannot read %s: %v", f, readErr))
			continue
		}
		msgs, lintErr := c.worker.Lint(ctx, f, content)
		if lintErr != nil {
			cctx.Presenter.ShowWarning(fmt.Sprintf("textlint error on %s: %v", f, lintErr))
			continue
		}
		allMsgs = append(allMsgs, msgs...)
	}

	// Apply severity filter.
	filtered := filterMessages(allMsgs, severityFilter)

	// Count.
	warnings, errors := countSeverities(filtered)

	if cctx.GlobalOpts.JSON {
		_ = cctx.Presenter.WriteJSON(lintJSONResult{
			Files:    len(files),
			Warnings: warnings,
			Errors:   errors,
		})
	} else {
		cctx.Presenter.ShowInfo(fmt.Sprintf(
			"%d files checked, %d warnings, %d errors", len(files), warnings, errors,
		))
		for _, m := range filtered {
			level := "warning"
			if m.Severity == textlint.SeverityError {
				level = "error"
			}
			cctx.Presenter.ShowInfo(fmt.Sprintf("  [%s] %s  (%s L%d:%d)",
				level, m.Message, m.RuleID, m.Line, m.Column))
		}
	}

	if errors > 0 || warnings > 0 {
		return 1
	}
	return 0
}

// collectMarkdown returns all .md files under root recursively.
func collectMarkdown(root string) ([]string, error) {
	info, err := os.Stat(root)
	if err != nil {
		return nil, fmt.Errorf("lint: path %q: %w", root, err)
	}
	if !info.IsDir() {
		return []string{root}, nil
	}
	var out []string
	err = filepath.Walk(root, func(p string, fi os.FileInfo, werr error) error {
		if werr != nil {
			return werr
		}
		if !fi.IsDir() && strings.HasSuffix(p, ".md") {
			out = append(out, p)
		}
		return nil
	})
	return out, err
}

// filterMessages returns messages matching the severity filter.
// An empty filter passes all messages.
func filterMessages(msgs []textlint.Message, severity string) []textlint.Message {
	if severity == "" {
		return msgs
	}
	var out []textlint.Message
	for _, m := range msgs {
		switch severity {
		case "error":
			if m.Severity == textlint.SeverityError {
				out = append(out, m)
			}
		case "warning":
			if m.Severity == textlint.SeverityWarning {
				out = append(out, m)
			}
		default:
			out = append(out, m)
		}
	}
	return out
}

// countSeverities tallies warnings and errors in msgs.
func countSeverities(msgs []textlint.Message) (warnings, errors int) {
	for _, m := range msgs {
		switch m.Severity {
		case textlint.SeverityWarning:
			warnings++
		case textlint.SeverityError:
			errors++
		}
	}
	return
}

// installHooksCommand implements `storyteller lint install-hooks`.
type installHooksCommand struct{}

// NewInstallHooks returns the `lint install-hooks` command.
func NewInstallHooks() cli.Command { return &installHooksCommand{} }

func (c *installHooksCommand) Name() string        { return "lint install-hooks" }
func (c *installHooksCommand) Description() string { return "Run manuscript lint checks" }

func (c *installHooksCommand) Handle(cctx cli.CommandContext) int {
	root := cctx.GlobalOpts.Path
	if root == "" {
		var err error
		root, err = os.Getwd()
		if err != nil {
			cctx.Presenter.ShowError(err.Error())
			return 1
		}
	}
	hook := filepath.Join(root, ".git", "hooks", "pre-commit")
	if err := os.MkdirAll(filepath.Dir(hook), 0755); err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	if err := os.WriteFile(hook, []byte("#!/usr/bin/env sh\nstoryteller lint\n"), 0755); err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	cctx.Presenter.ShowSuccess("installed lint pre-commit hook")
	return 0
}
