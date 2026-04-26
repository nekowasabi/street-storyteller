package version

import (
	"bytes"
	"context"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
)

func TestVersionCommand_Text(t *testing.T) {
	cmd := New()
	if cmd.Name() != "version" {
		t.Errorf("Name = %q, want version", cmd.Name())
	}
	var out, errBuf bytes.Buffer
	p := cli.NewTextPresenter(&out, &errBuf)
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Presenter: p,
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 0 {
		t.Errorf("exit = %d, want 0", code)
	}
	if !strings.Contains(out.String(), "storyteller") {
		t.Errorf("stdout missing 'storyteller': %q", out.String())
	}
	if !strings.Contains(out.String(), "0.1.0-go-migration") {
		t.Errorf("stdout missing version: %q", out.String())
	}
}

func TestVersionCommand_JSON(t *testing.T) {
	cmd := New()
	var out bytes.Buffer
	p := cli.NewJSONPresenter(&out)
	code := cmd.Handle(cli.CommandContext{
		Ctx:        context.Background(),
		Presenter:  p,
		Deps:       cli.Deps{Stdout: &out},
		GlobalOpts: cli.GlobalOptions{JSON: true},
	})
	if code != 0 {
		t.Errorf("exit = %d", code)
	}
	got := strings.TrimRight(out.String(), "\n")
	want := `{"version":"0.1.0-go-migration"}`
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}
