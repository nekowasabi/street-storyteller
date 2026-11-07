package service_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/service"
)

// rainkey copies testdata/clarity_rainkey into a temp dir and applies mutate
// to the manuscripts directory, so each broken variant is one edit away from
// the passing story (mirrors verify-reader-prereq's break table).
func rainkey(t *testing.T, mutate func(ms string)) (manuscripts, root string) {
	t.Helper()
	src := localTestdata(t, "clarity_rainkey")
	root = t.TempDir()
	if err := filepath.Walk(src, func(p string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(src, p)
		dst := filepath.Join(root, rel)
		if info.IsDir() {
			return os.MkdirAll(dst, 0o755)
		}
		b, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		return os.WriteFile(dst, b, 0o644)
	}); err != nil {
		t.Fatalf("copy: %v", err)
	}
	manuscripts = filepath.Join(root, "manuscripts")
	if mutate != nil {
		mutate(manuscripts)
	}
	return manuscripts, root
}

func replaceIn(t *testing.T, path, old, new string) {
	t.Helper()
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if !strings.Contains(string(b), old) {
		t.Fatalf("%s does not contain %q", path, old)
	}
	if err := os.WriteFile(path, []byte(strings.Replace(string(b), old, new, 1)), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
}

func codes(res service.ReaderPrereqResult) []string {
	out := make([]string, len(res.Violations))
	for i, v := range res.Violations {
		out[i] = v.Code + "@" + filepath.Base(v.File)
	}
	return out
}

func TestReaderPrereq_MainStoryPasses(t *testing.T) {
	ms, root := rainkey(t, nil)
	res, err := service.NewReaderPrereqService().Run(ms, root)
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if res.ChaptersChecked != 4 {
		t.Errorf("ChaptersChecked = %d", res.ChaptersChecked)
	}
	if len(res.Violations) != 0 {
		t.Errorf("want 0 violations, got %v", res.Violations)
	}
}

func TestReaderPrereq_BreakTable(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(ms string)
		want   []string
	}{
		{
			name: "ch-02 の開示を空にする",
			mutate: func(ms string) {
				replaceIn(t, filepath.Join(ms, "chapter02.md"),
					"  reader_shows:\n    - \"loc:shown\"\n    - \"loc:inferring\"\n    - \"hist:withheld\"\n", "")
			},
			want: []string{"RDR-102@chapter03.md", "RDR-102@chapter03.md"},
		},
		{
			name: "ch-04 の misled を消す",
			mutate: func(ms string) {
				replaceIn(t, filepath.Join(ms, "chapter04.md"), "    - \"loc:misled\"\n", "")
			},
			want: []string{"RDR-103@chapter04.md"},
		},
		{
			name: "ch-04 の corrected を消す",
			mutate: func(ms string) {
				replaceIn(t, filepath.Join(ms, "chapter04.md"), "    - \"loc:corrected\"\n", "")
			},
			want: []string{"RDR-104@chapter04.md"},
		},
		{
			name: "ch-04 の列を corrected, misled に逆転する",
			mutate: func(ms string) {
				replaceIn(t, filepath.Join(ms, "chapter04.md"),
					"    - \"loc:misled\"\n    - \"loc:corrected\"\n", "    - \"loc:corrected\"\n    - \"loc:misled\"\n")
			},
			want: []string{"RDR-103@chapter04.md", "RDR-104@chapter04.md"},
		},
		{
			name: "ch-02 の hist:withheld を消す",
			mutate: func(ms string) {
				replaceIn(t, filepath.Join(ms, "chapter02.md"), "    - \"hist:withheld\"\n", "")
			},
			want: []string{"RDR-102@chapter03.md"},
		},
		{
			name: "存在しない命題を参照する",
			mutate: func(ms string) {
				replaceIn(t, filepath.Join(ms, "chapter02.md"), "\"loc:shown\"", "\"key:shown\"")
			},
			want: []string{"RDR-101@chapter02.md", "RDR-102@chapter03.md"},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			ms, root := rainkey(t, tc.mutate)
			res, err := service.NewReaderPrereqService().Run(ms, root)
			if err != nil {
				t.Fatalf("Run: %v", err)
			}
			got := codes(res)
			if strings.Join(got, " ") != strings.Join(tc.want, " ") {
				t.Errorf("violations = %v, want %v\n%v", got, tc.want, res.Violations)
			}
			for _, v := range res.Violations {
				if v.Line < 1 || v.Message == "" {
					t.Errorf("violation lacks line or message: %+v", v)
				}
			}
		})
	}
}

func TestReaderPrereq_UnreadableProjectIsAnError(t *testing.T) {
	ms, root := rainkey(t, nil)
	if err := os.MkdirAll(filepath.Join(root, "src", "characters"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "src", "characters", "broken.ts"), []byte("export const x = {"), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err := service.NewReaderPrereqService().Run(ms, root)
	if err == nil {
		t.Fatal("a project that cannot be loaded must fail the check, not pass quietly")
	}
}

func TestReaderPrereq_NoClarityFieldsIsClean(t *testing.T) {
	res, err := service.NewReaderPrereqService().Run(localTestdata(t, "manuscript_valid"), t.TempDir())
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if len(res.Violations) != 0 {
		t.Errorf("want 0 violations, got %v", res.Violations)
	}
}
