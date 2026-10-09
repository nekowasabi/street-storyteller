package element

import (
	"os"
	"path/filepath"
	"testing"
)

func TestElementPreservesExistingSource(t *testing.T) {
	for _, args := range [][]string{
		{"--id", "hero"},
		{"--id", "hero", "--with-details"},
		{"--id", "hero", "--add-details", "backstory"},
	} {
		t.Run(args[len(args)-1], func(t *testing.T) {
			root := t.TempDir()
			path := filepath.Join(root, "src", "characters", "hero.ts")
			if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
				t.Fatal(err)
			}
			const original = "// Authored character with irreplaceable story details.\n"
			if err := os.WriteFile(path, []byte(original), 0644); err != nil {
				t.Fatal(err)
			}
			ctx, _, stderr := newCtx(t, args, false, root)
			if code := New("character").Handle(ctx); code == 0 {
				t.Errorf("creation should reject existing source; stderr=%q", stderr.String())
			}
			got, err := os.ReadFile(path)
			if err != nil || string(got) != original {
				t.Errorf("existing source changed: body=%q err=%v", got, err)
			}
			if _, err := os.Stat(filepath.Join(filepath.Dir(path), "hero_backstory.md")); !os.IsNotExist(err) {
				t.Errorf("rejected creation produced a detail file: %v", err)
			}
		})
	}
}

func TestElementDetailConflictLeavesNoPartialFiles(t *testing.T) {
	root := t.TempDir()
	dir := filepath.Join(root, "src", "characters")
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatal(err)
	}
	existing := filepath.Join(dir, "hero_backstory.md")
	if err := os.WriteFile(existing, []byte("authored backstory"), 0644); err != nil {
		t.Fatal(err)
	}
	ctx, _, stderr := newCtx(t, []string{"--id", "hero", "--add-details", "appearance,backstory"}, false, root)
	if code := New("character").Handle(ctx); code == 0 {
		t.Fatalf("expected conflicting detail to fail; stderr=%q", stderr.String())
	}
	for _, name := range []string{"hero.ts", "hero_appearance.md"} {
		if _, err := os.Stat(filepath.Join(dir, name)); !os.IsNotExist(err) {
			t.Errorf("failed creation left %s behind: %v", name, err)
		}
	}
	got, err := os.ReadFile(existing)
	if err != nil || string(got) != "authored backstory" {
		t.Errorf("existing detail changed: body=%q err=%v", got, err)
	}
}

func TestElementDoesNotFollowExistingFileSymlinks(t *testing.T) {
	for _, filename := range []string{"hero.ts", "hero_backstory.md"} {
		t.Run(filename, func(t *testing.T) {
			root := t.TempDir()
			dir := filepath.Join(root, "src", "characters")
			if err := os.MkdirAll(dir, 0755); err != nil {
				t.Fatal(err)
			}
			target := filepath.Join(root, "authored.txt")
			if err := os.WriteFile(target, []byte("preserve me"), 0644); err != nil {
				t.Fatal(err)
			}
			if err := os.Symlink(target, filepath.Join(dir, filename)); err != nil {
				t.Skipf("symlinks unavailable: %v", err)
			}
			ctx, _, _ := newCtx(t, []string{"--id", "hero", "--separate-files", "backstory"}, false, root)
			if code := New("character").Handle(ctx); code == 0 {
				t.Fatal("expected an existing symlink to be rejected")
			}
			got, err := os.ReadFile(target)
			if err != nil || string(got) != "preserve me" {
				t.Errorf("symlink target changed: body=%q err=%v", got, err)
			}
			if _, err := os.Lstat(filepath.Join(dir, filename)); err != nil {
				t.Errorf("existing symlink removed: %v", err)
			}
		})
	}
}
