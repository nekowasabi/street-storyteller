package meta

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
)

func runAnnotate(t *testing.T, args []string, jsonMode bool) (int, string, string) {
	t.Helper()
	var out, errBuf bytes.Buffer
	var pres cli.Presenter
	if jsonMode {
		pres = cli.NewJSONPresenter(&out)
	} else {
		pres = cli.NewTextPresenter(&out, &errBuf)
	}
	cmd := NewAnnotate()
	code := cmd.Handle(cli.CommandContext{
		Ctx:        context.Background(),
		Args:       args,
		Presenter:  pres,
		Deps:       cli.Deps{Stdout: &out, Stderr: &errBuf},
		GlobalOpts: cli.GlobalOptions{JSON: jsonMode},
	})
	return code, out.String(), errBuf.String()
}

func writeTempMD(t *testing.T, name, body string) string {
	t.Helper()
	dir := t.TempDir()
	p := filepath.Join(dir, name)
	if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
		t.Fatalf("write temp md: %v", err)
	}
	return p
}

// 1. 新規ファイル（frontmatter なし）に対する annotate で frontmatter が正しく追加されること
func TestAnnotate_AddsFrontmatterToPlainFile(t *testing.T) {
	body := "# 主人公の背景\n\n本文行1\n本文行2\n"
	p := writeTempMD(t, "hero_backstory.md", body)

	code, out, errOut := runAnnotate(t, []string{
		p,
		"--type", "character_detail",
		"--entity-id", "hero",
		"--field", "backstory",
	}, false)
	if code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errOut)
	}
	if !strings.Contains(out, "Annotated") {
		t.Errorf("expected success message, got %q", out)
	}
	got, err := os.ReadFile(p)
	if err != nil {
		t.Fatal(err)
	}
	gotStr := string(got)
	if !strings.HasPrefix(gotStr, "---\nstoryteller:\n") {
		t.Errorf("expected frontmatter prefix, got: %q", gotStr)
	}
	if !strings.Contains(gotStr, "type: character_detail") {
		t.Errorf("missing type: %q", gotStr)
	}
	if !strings.Contains(gotStr, "entity_id: hero") {
		t.Errorf("missing entity_id: %q", gotStr)
	}
	if !strings.Contains(gotStr, "field: backstory") {
		t.Errorf("missing field: %q", gotStr)
	}
	// Body must remain present.
	if !strings.HasSuffix(gotStr, body) {
		t.Errorf("body not preserved as suffix: %q", gotStr)
	}
}

// 2. 既存 frontmatter（manuscript 用フィールドあり）を破壊しないこと
func TestAnnotate_PreservesManuscriptFields(t *testing.T) {
	src := "---\nstoryteller:\n  chapter_id: ch01\n  title: \"序章\"\n  characters:\n    - hero\n---\n# 本文\n\n地の文。\n"
	p := writeTempMD(t, "ch01_detail.md", src)

	code, _, errOut := runAnnotate(t, []string{
		p,
		"--type", "plot_detail",
		"--entity-id", "main_plot",
		"--field", "description",
	}, false)
	if code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errOut)
	}
	got, _ := os.ReadFile(p)
	gotStr := string(got)
	if !strings.Contains(gotStr, "chapter_id: ch01") {
		t.Errorf("chapter_id lost: %q", gotStr)
	}
	if !strings.Contains(gotStr, "title:") {
		t.Errorf("title lost: %q", gotStr)
	}
	if !strings.Contains(gotStr, "- hero") {
		t.Errorf("characters lost: %q", gotStr)
	}
	if !strings.Contains(gotStr, "type: plot_detail") {
		t.Errorf("type not added: %q", gotStr)
	}
}

// 3. 既存 detail frontmatter の上書き拒否（--force なしでエラー）
func TestAnnotate_RefusesOverwriteWithoutForce(t *testing.T) {
	src := "---\nstoryteller:\n  type: character_detail\n  entity_id: hero\n  field: backstory\n---\n本文\n"
	p := writeTempMD(t, "hero_backstory.md", src)

	code, _, errOut := runAnnotate(t, []string{
		p,
		"--type", "character_detail",
		"--entity-id", "villain", // different
		"--field", "backstory",
	}, false)
	if code == 0 {
		t.Fatalf("expected non-zero exit")
	}
	if !strings.Contains(errOut, "refusing to overwrite") {
		t.Errorf("missing conflict message: %q", errOut)
	}
}

// 4. --force で上書き成功
func TestAnnotate_ForceOverwrites(t *testing.T) {
	src := "---\nstoryteller:\n  type: character_detail\n  entity_id: hero\n  field: backstory\n---\n本文\n"
	p := writeTempMD(t, "hero_backstory.md", src)

	code, _, errOut := runAnnotate(t, []string{
		p,
		"--type", "character_detail",
		"--entity-id", "villain",
		"--field", "backstory",
		"--force",
	}, false)
	if code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errOut)
	}
	got, _ := os.ReadFile(p)
	if !strings.Contains(string(got), "entity_id: villain") {
		t.Errorf("force did not overwrite: %q", string(got))
	}
}

// 5. 不正な type 指定でエラー
func TestAnnotate_RejectsInvalidType(t *testing.T) {
	p := writeTempMD(t, "x.md", "本文\n")
	code, _, errOut := runAnnotate(t, []string{
		p,
		"--type", "bogus_detail",
		"--entity-id", "x",
		"--field", "y",
	}, false)
	if code == 0 {
		t.Fatalf("expected non-zero exit")
	}
	if !strings.Contains(errOut, "invalid --type") {
		t.Errorf("missing type error: %q", errOut)
	}
}

// 6. 本文（frontmatter 以外）が完全保持されること（byte 比較）
func TestAnnotate_PreservesBodyBytes(t *testing.T) {
	body := "# タイトル\r\n\r\n  - 箇条書き  \n\n\n空行を含む本文\nタブ\tと全角スペース　あり\n"
	p := writeTempMD(t, "plain.md", body)

	code, _, errOut := runAnnotate(t, []string{
		p,
		"--type", "setting_detail",
		"--entity-id", "royal_capital",
		"--field", "geography",
	}, false)
	if code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errOut)
	}
	got, _ := os.ReadFile(p)
	// Body bytes must appear verbatim as the suffix.
	if !bytes.HasSuffix(got, []byte(body)) {
		t.Errorf("body bytes not preserved verbatim.\nfile: %q\nbody: %q", string(got), body)
	}
}

// JSON output mode
func TestAnnotate_JSONOutput(t *testing.T) {
	p := writeTempMD(t, "p.md", "本文\n")
	code, out, _ := runAnnotate(t, []string{
		p,
		"--type", "plot_detail",
		"--entity-id", "main_plot",
		"--field", "description",
	}, true)
	if code != 0 {
		t.Fatalf("exit=%d", code)
	}
	if !strings.Contains(out, `"ok":true`) {
		t.Errorf("missing ok:true: %q", out)
	}
	if !strings.Contains(out, `"type":"plot_detail"`) {
		t.Errorf("missing type: %q", out)
	}
}

// Idempotent: same values, no --force, succeeds (no conflict).
func TestAnnotate_IdempotentSameValues(t *testing.T) {
	src := "---\nstoryteller:\n  type: plot_detail\n  entity_id: main_plot\n  field: description\n---\n本文\n"
	p := writeTempMD(t, "p.md", src)

	code, _, errOut := runAnnotate(t, []string{
		p,
		"--type", "plot_detail",
		"--entity-id", "main_plot",
		"--field", "description",
	}, false)
	if code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errOut)
	}
}
