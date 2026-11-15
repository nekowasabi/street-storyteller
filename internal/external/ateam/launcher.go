package ateam

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/takets/street-storyteller/internal/service/review"
	"github.com/takets/street-storyteller/internal/testkit/process"
)

type Launcher struct {
	Path   string
	Runner process.Runner
}

func New(path string, runner process.Runner) *Launcher { return &Launcher{Path: path, Runner: runner} }

var runID = regexp.MustCompile(`(?m)(?:^|\s)run_id=([A-Za-z0-9_-]+)`)

func (l *Launcher) command() (string, process.Runner, error) {
	path := l.Path
	if path == "~" || strings.HasPrefix(path, "~/") {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", nil, err
		}
		path = filepath.Join(home, strings.TrimPrefix(path, "~/"))
	}
	if path == "" {
		return "", nil, fmt.Errorf("ateam の場所がありません")
	}
	runner := l.Runner
	if runner == nil {
		runner = process.RealRunner{}
	}
	return path, runner, nil
}
func (l *Launcher) Launch(ctx context.Context, id, dir string, agent review.AgentLaunch) (review.LaunchHandle, error) {
	h := review.LaunchHandle{ID: id}
	path, runner, err := l.command()
	if err != nil {
		return h, err
	}
	assignment := []struct {
		Role    string `json:"role"`
		Runtime string `json:"runtime"`
		Model   string `json:"model"`
		Effort  string `json:"effort"`
		Brief   string `json:"brief"`
	}{{agent.Agent, agent.Runtime, agent.Model, agent.Effort, agent.Prompt}}
	b, err := json.Marshal(assignment)
	if err != nil {
		return h, err
	}
	res, err := runner.Run(ctx, path, []string{"dispatch", id, "--project", dir, "--task", "storyteller review", "--assignments", string(b)}, nil)
	if err != nil {
		return h, err
	}
	if res.ExitCode != 0 {
		return h, fmt.Errorf("ateam の起動に失敗しました（終了コード %d）: %s", res.ExitCode, strings.TrimSpace(string(res.Stderr)))
	}
	if m := runID.FindSubmatch(res.Stdout); m != nil {
		h.RunID = string(m[1])
	}
	return h, nil
}
func (l *Launcher) Close(ctx context.Context, h review.LaunchHandle) error {
	if h.RunID == "" {
		return nil
	}
	path, runner, err := l.command()
	if err != nil {
		return err
	}
	res, err := runner.Run(ctx, path, []string{"close", h.RunID}, nil)
	if err != nil {
		return err
	}
	if res.ExitCode != 0 {
		return fmt.Errorf("ateam の終了に失敗しました（終了コード %d）", res.ExitCode)
	}
	return nil
}

var _ review.Launcher = (*Launcher)(nil)
