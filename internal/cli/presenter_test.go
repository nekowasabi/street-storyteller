package cli

import (
	"bytes"
	"strings"
	"testing"
)

func TestTextPresenter_InfoToStdout_ErrorToStderr(t *testing.T) {
	var out, errBuf bytes.Buffer
	p := NewTextPresenter(&out, &errBuf)
	p.ShowInfo("hello")
	p.ShowSuccess("ok")
	p.ShowWarning("careful")
	p.ShowError("boom")

	if !strings.Contains(out.String(), "hello") {
		t.Errorf("stdout missing info: %q", out.String())
	}
	if !strings.Contains(out.String(), "ok") {
		t.Errorf("stdout missing success: %q", out.String())
	}
	if !strings.Contains(errBuf.String(), "careful") {
		t.Errorf("stderr missing warning: %q", errBuf.String())
	}
	if !strings.Contains(errBuf.String(), "boom") {
		t.Errorf("stderr missing error: %q", errBuf.String())
	}
}

func TestJSONPresenter_InfoOutput_HasLevelAndMsg(t *testing.T) {
	var out bytes.Buffer
	p := NewJSONPresenter(&out)
	p.ShowInfo("hello")
	got := out.String()
	if !strings.Contains(got, `"level":"info"`) {
		t.Errorf("missing level: %q", got)
	}
	if !strings.Contains(got, `"msg":"hello"`) {
		t.Errorf("missing msg: %q", got)
	}
	if !strings.HasSuffix(got, "\n") {
		t.Errorf("expected trailing newline: %q", got)
	}
}

func TestJSONPresenter_LineDelimited(t *testing.T) {
	var out bytes.Buffer
	p := NewJSONPresenter(&out)
	p.ShowInfo("a")
	p.ShowError("b")
	lines := strings.Split(strings.TrimRight(out.String(), "\n"), "\n")
	if len(lines) != 2 {
		t.Fatalf("want 2 lines, got %d (%q)", len(lines), out.String())
	}
	if !strings.Contains(lines[0], `"level":"info"`) {
		t.Errorf("line 0 wrong: %q", lines[0])
	}
	if !strings.Contains(lines[1], `"level":"error"`) {
		t.Errorf("line 1 wrong: %q", lines[1])
	}
}

func TestJSONPresenter_WriteJSON_DeterministicOrder(t *testing.T) {
	var out bytes.Buffer
	p := NewJSONPresenter(&out)
	type payload struct {
		Version string `json:"version"`
	}
	if err := p.WriteJSON(payload{Version: "0.1.0"}); err != nil {
		t.Fatalf("WriteJSON: %v", err)
	}
	got := strings.TrimRight(out.String(), "\n")
	want := `{"version":"0.1.0"}`
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}
