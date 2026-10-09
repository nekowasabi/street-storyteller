package view

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
)

// Why: process-101 coverage gate. NewList / NewEntity の正常系・JSON・
// 全 kind 列挙・エラーパスを smoke test で押さえる。

func makeFullProject(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	mustWrite := func(rel, content string) {
		full := filepath.Join(root, rel)
		if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(full, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	mustWrite(".storyteller.json", `{"version":"1.0.0"}`)

	mustWrite("src/characters/hero.ts",
		`import type { Character } from "@storyteller/types/v2/character.ts";
export const hero: Character = {
  id: "hero", name: "Hero", role: "protagonist",
  traits: [], relationships: {}, appearingChapters: [],
  summary: "the hero",
};
`)
	mustWrite("src/settings/town.ts",
		`import type { Setting } from "@storyteller/types/v2/setting.ts";
export const town: Setting = {
  id: "town", name: "Town", type: "location",
  appearingChapters: [], summary: "a town",
};
`)
	mustWrite("src/timelines/main.ts",
		`import type { Timeline } from "@storyteller/types/v2/timeline.ts";
export const main: Timeline = {
  id: "main", name: "Main", scope: "story",
  summary: "main timeline", events: [],
};
`)
	mustWrite("src/foreshadowings/sword.ts",
		`import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";
export const sword: Foreshadowing = {
  id: "sword", name: "Sword", type: "chekhov",
  summary: "old sword",
  planting: { chapter: "ch1", description: "found" },
  status: "planted",
};
`)
	mustWrite("src/plots/love.ts",
		`import type { Plot } from "@storyteller/types/v2/plot.ts";
export const love: Plot = {
  id: "love", name: "Love", type: "sub",
  status: "active", summary: "love arc", beats: [],
};
`)
	return root
}

func newCtx(args []string, jsonMode bool, root string) (cli.CommandContext, *bytes.Buffer, *bytes.Buffer) {
	var out, errBuf bytes.Buffer
	var p cli.Presenter
	if jsonMode {
		p = cli.NewJSONPresenter(&out)
	} else {
		p = cli.NewTextPresenter(&out, &errBuf)
	}
	return cli.CommandContext{
		Ctx:        context.Background(),
		Args:       args,
		Presenter:  p,
		Deps:       cli.Deps{Stdout: &out, Stderr: &errBuf},
		GlobalOpts: cli.GlobalOptions{JSON: jsonMode, Path: root},
	}, &out, &errBuf
}

func TestList_AllKinds(t *testing.T) {
	root := makeFullProject(t)
	cmd := NewList()
	if cmd.Name() != "view list" {
		t.Errorf("Name = %q", cmd.Name())
	}
	if cmd.Description() == "" || cmd.(interface{ Usage() string }).Usage() == "" {
		t.Errorf("metadata empty")
	}

	for _, kind := range []string{
		"characters", "settings", "timelines", "foreshadowings", "plots",
		// singular forms exercising normalizeKind
		"character", "setting", "timeline", "foreshadowing", "plot",
		"unknown", // default branch returns []
	} {
		t.Run(kind, func(t *testing.T) {
			cctx, _, errBuf := newCtx([]string{"--kind", kind, "--path", root}, false, "")
			if code := cmd.Handle(cctx); code != 0 {
				t.Fatalf("kind=%s exit=%d stderr=%q", kind, code, errBuf.String())
			}
		})
	}
}

func TestList_JSON(t *testing.T) {
	root := makeFullProject(t)
	cctx, out, _ := newCtx([]string{"--kind=characters"}, true, root)
	if code := NewList().Handle(cctx); code != 0 {
		t.Fatalf("exit=%d", code)
	}
	var payload struct {
		Kind  string   `json:"kind"`
		Items []string `json:"items"`
	}
	if err := json.Unmarshal(out.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal: %v out=%q", err, out.String())
	}
	if payload.Kind != "characters" || len(payload.Items) == 0 {
		t.Errorf("payload = %+v", payload)
	}
}

func TestList_RequireKind(t *testing.T) {
	root := makeFullProject(t)
	cctx, _, errBuf := newCtx([]string{"--path", root}, false, "")
	if code := NewList().Handle(cctx); code != 1 {
		t.Fatalf("exit=%d want 1", code)
	}
	if !strings.Contains(errBuf.String(), "--kind") {
		t.Errorf("missing --kind error: %q", errBuf.String())
	}
}

func TestList_LoadFailure(t *testing.T) {
	// no manifest → project.Load fails
	cctx, _, errBuf := newCtx([]string{"--kind", "characters", "--path", t.TempDir()}, false, "")
	if code := NewList().Handle(cctx); code != 1 {
		t.Fatalf("exit=%d want 1", code)
	}
	if errBuf.Len() == 0 {
		t.Errorf("expected error msg")
	}
}

func TestList_ParseErrors(t *testing.T) {
	for _, args := range [][]string{
		{"--path"},
		{"--kind"},
	} {
		cctx, _, errBuf := newCtx(args, false, "")
		if code := NewList().Handle(cctx); code != 1 {
			t.Errorf("args=%v exit=%d want 1", args, code)
		}
		if errBuf.Len() == 0 {
			t.Errorf("args=%v expected error", args)
		}
	}
}

func TestList_PathFromCwd(t *testing.T) {
	root := makeFullProject(t)
	prev, _ := os.Getwd()
	t.Cleanup(func() { _ = os.Chdir(prev) })
	if err := os.Chdir(root); err != nil {
		t.Fatal(err)
	}
	cctx, _, errBuf := newCtx([]string{"--kind=characters"}, false, "")
	if code := NewList().Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
}

func TestEntity_AllKinds(t *testing.T) {
	root := makeFullProject(t)
	for _, tc := range []struct{ kind, id string }{
		{"setting", "town"},
		{"timeline", "main"},
		{"foreshadowing", "sword"},
		{"plot", "love"},
	} {
		t.Run(tc.kind, func(t *testing.T) {
			cmd := NewEntity(tc.kind)
			if !strings.Contains(cmd.Name(), tc.kind) {
				t.Errorf("Name = %q", cmd.Name())
			}
			if cmd.Description() == "" {
				t.Errorf("Description empty")
			}
			if u, ok := cmd.(interface{ Usage() string }); !ok || !strings.Contains(u.Usage(), tc.kind) {
				t.Errorf("Usage missing")
			}
			cctx, out, errBuf := newCtx([]string{"--id", tc.id, "--path", root}, false, "")
			if code := cmd.Handle(cctx); code != 0 {
				t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
			}
			if !strings.Contains(out.String(), tc.id) {
				t.Errorf("missing id %q in output: %q", tc.id, out.String())
			}
		})
	}
}

func TestEntity_JSON(t *testing.T) {
	root := makeFullProject(t)
	cctx, out, _ := newCtx([]string{"--id=town", "--path=" + root}, true, root)
	if code := NewEntity("setting").Handle(cctx); code != 0 {
		t.Fatalf("exit=%d", code)
	}
	var row struct {
		ID, Name, Summary string
	}
	if err := json.Unmarshal(out.Bytes(), &row); err != nil {
		t.Fatalf("unmarshal: %v out=%q", err, out.String())
	}
	if row.ID != "town" {
		t.Errorf("row = %+v", row)
	}
}

func TestEntity_MissingID(t *testing.T) {
	cctx, _, errBuf := newCtx(nil, false, t.TempDir())
	if code := NewEntity("setting").Handle(cctx); code != 1 {
		t.Fatalf("exit=%d want 1", code)
	}
	if !strings.Contains(errBuf.String(), "--id") {
		t.Errorf("missing --id error: %q", errBuf.String())
	}
}

func TestEntity_NotFound(t *testing.T) {
	root := makeFullProject(t)
	cctx, _, errBuf := newCtx([]string{"--id=missing", "--path", root}, false, "")
	if code := NewEntity("setting").Handle(cctx); code != 1 {
		t.Fatalf("exit=%d want 1", code)
	}
	if errBuf.Len() == 0 {
		t.Errorf("expected error")
	}
}

func TestEntity_UnsupportedKind(t *testing.T) {
	root := makeFullProject(t)
	cctx, _, errBuf := newCtx([]string{"--id=hero", "--path", root}, false, "")
	if code := NewEntity("bogus").Handle(cctx); code != 1 {
		t.Fatalf("exit=%d want 1", code)
	}
	if !strings.Contains(errBuf.String(), "unsupported") {
		t.Errorf("expected unsupported error: %q", errBuf.String())
	}
}

func TestEntity_LoadFailure(t *testing.T) {
	// no manifest
	cctx, _, errBuf := newCtx([]string{"--id=x", "--path", t.TempDir()}, false, "")
	if code := NewEntity("setting").Handle(cctx); code != 1 {
		t.Fatalf("exit=%d want 1", code)
	}
	if errBuf.Len() == 0 {
		t.Errorf("expected error")
	}
}

func TestEntity_ParseErrors(t *testing.T) {
	for _, args := range [][]string{{"--id"}, {"--path"}} {
		cctx, _, errBuf := newCtx(args, false, "")
		if code := NewEntity("setting").Handle(cctx); code != 1 {
			t.Errorf("args=%v exit=%d want 1", args, code)
		}
		if errBuf.Len() == 0 {
			t.Errorf("args=%v expected error", args)
		}
	}
}

func TestEntity_PathFromCwd(t *testing.T) {
	root := makeFullProject(t)
	prev, _ := os.Getwd()
	t.Cleanup(func() { _ = os.Chdir(prev) })
	if err := os.Chdir(root); err != nil {
		t.Fatal(err)
	}
	cctx, _, errBuf := newCtx([]string{"--id=town"}, false, "")
	if code := NewEntity("setting").Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
}

func writeEventTimeline(t *testing.T, root string) {
	t.Helper()
	src := `import type { Timeline } from "@storyteller/types/v2/timeline.ts";
export const req: Timeline = {
  id: "req", name: "Req <b>", scope: "story",
  summary: "s", events: [
    { id: "e2", title: "second", category: "plot_point", time: { order: 2 }, summary: "later", characters: [], settings: [], chapters: [] },
    { id: "e1", title: "first", category: "plot_point", time: { order: 1 }, summary: "earlier", characters: [], settings: [], chapters: [] },
  ],
};
`
	if err := os.WriteFile(filepath.Join(root, "src/timelines/req.ts"), []byte(src), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestEntity_TimelineJSONIncludesEvents(t *testing.T) {
	root := makeFullProject(t)
	writeEventTimeline(t, root)
	cctx, out, errBuf := newCtx([]string{"--id=req", "--path=" + root}, true, root)
	if code := NewEntity("timeline").Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
	var got struct {
		Events []struct{ ID string } `json:"events"`
	}
	if err := json.Unmarshal(out.Bytes(), &got); err != nil {
		t.Fatalf("json: %v: %q", err, out.String())
	}
	if len(got.Events) != 2 || got.Events[0].ID != "e1" {
		t.Errorf("events = %+v, want [e1 e2] ordered", got.Events)
	}
}

func TestEntity_HTMLStdoutAndOutputFile(t *testing.T) {
	root := makeFullProject(t)
	writeEventTimeline(t, root)
	cctx, out, errBuf := newCtx([]string{"--id=req", "--path=" + root, "--format", "html"}, false, root)
	if code := NewEntity("timeline").Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
	html := out.String()
	for _, want := range []string{"<!doctype html>", "Req &lt;b&gt;", "first", "second"} {
		if !strings.Contains(html, want) {
			t.Errorf("html missing %q: %q", want, html)
		}
	}
	if strings.Index(html, "first") > strings.Index(html, "second") {
		t.Errorf("events not ordered")
	}

	file := filepath.Join(t.TempDir(), "tl.html")
	cctx, _, errBuf = newCtx([]string{"--id=req", "--path=" + root, "--format=html", "--output=" + file}, false, root)
	if code := NewEntity("timeline").Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
	b, err := os.ReadFile(file)
	if err != nil || !strings.Contains(string(b), "first") {
		t.Errorf("output file: err=%v body=%q", err, b)
	}
}

func TestEntity_HTMLAllKindsAndErrors(t *testing.T) {
	root := makeFullProject(t)
	for _, tc := range []struct{ kind, id string }{{"setting", "town"}, {"foreshadowing", "sword"}, {"plot", "love"}} {
		cctx, out, errBuf := newCtx([]string{"--id", tc.id, "--path", root, "--format", "html"}, false, root)
		if code := NewEntity(tc.kind).Handle(cctx); code != 0 || !strings.Contains(out.String(), "<html") {
			t.Errorf("%s: exit=%d err=%q", tc.kind, code, errBuf.String())
		}
	}
	for _, args := range [][]string{
		{"--id=town", "--path=" + root, "--format=pdf"},
		{"--id=town", "--path=" + root, "--output=x.html"},
		{"--id=town", "--format"},
	} {
		cctx, _, _ := newCtx(args, false, root)
		if code := NewEntity("setting").Handle(cctx); code != 1 {
			t.Errorf("args=%v exit=%d want 1", args, code)
		}
	}
}
