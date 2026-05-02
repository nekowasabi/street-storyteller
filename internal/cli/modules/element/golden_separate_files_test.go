package element

import (
	"flag"
	"os"
	"path/filepath"
	"testing"
)

// Why: 既存 cmd/storyteller/golden_test.go の `-update` 規約に倣い、
// 同一フラグ名でこの package 内 golden を再生成可能にする。
// 別 package のため flag 衝突は発生しない。
var updateGolden = flag.Bool("update", false, "update golden files")

func goldenDir() string {
	return filepath.Join("testdata", "golden", "separate_files")
}

func assertGoldenBytes(t *testing.T, relPath string, got []byte) {
	t.Helper()
	path := filepath.Join(goldenDir(), relPath)
	if *updateGolden {
		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, got, 0644); err != nil {
			t.Fatalf("write golden: %v", err)
		}
		return
	}
	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read golden %s: %v (run with -update to create)", path, err)
	}
	if string(want) != string(got) {
		t.Fatalf("golden mismatch (%s)\n--- want ---\n%s\n--- got ---\n%s\n--- end ---",
			path, string(want), string(got))
	}
}

// TestGolden_SeparateFiles_CharacterBackstory は character の --separate-files backstory 出力を
// byte 完全一致で検証する。
func TestGolden_SeparateFiles_CharacterBackstory(t *testing.T) {
	root := t.TempDir()
	cmd := New("character")
	cctx, _, errBuf := newCtx(t,
		[]string{"--id", "hero", "--name", "hero", "--role", "protagonist", "--summary", "勇者", "--separate-files", "backstory"},
		false, root)
	if code := cmd.Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
	tsBody, err := os.ReadFile(filepath.Join(root, "src/characters/hero.ts"))
	if err != nil {
		t.Fatal(err)
	}
	assertGoldenBytes(t, "character_backstory.ts.golden", tsBody)

	mdBody, err := os.ReadFile(filepath.Join(root, "src/characters/hero_backstory.md"))
	if err != nil {
		t.Fatal(err)
	}
	assertGoldenBytes(t, "character_backstory.md.golden", mdBody)
}

// TestGolden_SeparateFiles_SettingGeography は setting の --separate-files geography 出力を検証する。
func TestGolden_SeparateFiles_SettingGeography(t *testing.T) {
	root := t.TempDir()
	cmd := New("setting")
	cctx, _, errBuf := newCtx(t,
		[]string{"--id", "castle", "--name", "castle", "--summary", "城", "--separate-files", "geography"},
		false, root)
	if code := cmd.Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
	tsBody, err := os.ReadFile(filepath.Join(root, "src/settings/castle.ts"))
	if err != nil {
		t.Fatal(err)
	}
	assertGoldenBytes(t, "setting_geography.ts.golden", tsBody)

	mdBody, err := os.ReadFile(filepath.Join(root, "src/settings/castle_geography.md"))
	if err != nil {
		t.Fatal(err)
	}
	assertGoldenBytes(t, "setting_geography.md.golden", mdBody)
}

// TestGolden_AddDetails_MultipleFields は --add-details で複数 field を一度に指定したときの
// .ts と各 .md ファイルを byte 比較で検証する。
func TestGolden_AddDetails_MultipleFields(t *testing.T) {
	root := t.TempDir()
	cmd := New("character")
	cctx, _, errBuf := newCtx(t,
		[]string{"--id", "hero", "--name", "hero", "--role", "protagonist", "--summary", "勇者", "--add-details", "appearance,personality"},
		false, root)
	if code := cmd.Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
	tsBody, err := os.ReadFile(filepath.Join(root, "src/characters/hero.ts"))
	if err != nil {
		t.Fatal(err)
	}
	assertGoldenBytes(t, "add_details_multi/hero.ts.golden", tsBody)

	for _, field := range []string{"appearance", "personality"} {
		body, err := os.ReadFile(filepath.Join(root, "src/characters/hero_"+field+".md"))
		if err != nil {
			t.Fatalf("read %s md: %v", field, err)
		}
		assertGoldenBytes(t, "add_details_multi/hero_"+field+".md.golden", body)
	}
}
