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
	mustWrite("src/subplots/love.ts",
		`import type { Subplot } from "@storyteller/types/v2/subplot.ts";
export const love: Subplot = {
  id: "love", name: "Love", type: "subplot",
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
		"characters", "settings", "timelines", "foreshadowings", "subplots",
		// singular forms exercising normalizeKind
		"character", "setting", "timeline", "foreshadowing", "subplot",
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
		{"subplot", "love"},
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
