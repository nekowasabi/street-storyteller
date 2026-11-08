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

func TestMetaCheck_NestedManuscriptsFindAncestorManifest(t *testing.T) {
	ms, _ := rainkey(t, func(ms string) {
		replaceIn(t, filepath.Join(ms, "chapter02.md"), "\"loc:shown\"", "\"key:shown\"")
				replaceIn(t, filepath.Join(ms, "chapter02.md"), "shows: loc:shown", "shows: key:shown")
	})
	nested := filepath.Join(ms, "01", "v2")
	tmp := ms + ".tmp"
	if err := os.Rename(ms, tmp); err != nil {
		t.Fatalf("rename: %v", err)
	}
	if err := os.MkdirAll(filepath.Dir(nested), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.Rename(tmp, nested); err != nil {
		t.Fatalf("rename: %v", err)
	}
	res, err := service.NewMetaCheckService().Run(nested)
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	got := make([]string, len(res.Violations))
	for i, v := range res.Violations {
		got[i] = v.Code
	}
	if !strings.Contains(strings.Join(got, " "), "RDR-101") {
		t.Errorf("unknown proposition must be reported from a nested dir, got %v", got)
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
				replaceIn(t, filepath.Join(ms, "chapter02.md"),
					"<!-- shows: loc:shown -->\n<!-- shows: loc:inferring -->\n<!-- shows: hist:withheld -->\n", "")
			},
			want: []string{"RDR-102@chapter03.md", "RDR-102@chapter03.md"},
		},
		{
			name: "ch-04 の misled を消す",
			mutate: func(ms string) {
				replaceIn(t, filepath.Join(ms, "chapter04.md"), "    - \"loc:misled\"\n", "")
				replaceIn(t, filepath.Join(ms, "chapter04.md"), "<!-- shows: loc:misled -->\n", "")
			},
			want: []string{"RDR-103@chapter04.md"},
		},
		{
			name: "ch-04 の corrected を消す",
			mutate: func(ms string) {
				replaceIn(t, filepath.Join(ms, "chapter04.md"), "    - \"loc:corrected\"\n", "")
				replaceIn(t, filepath.Join(ms, "chapter04.md"), "<!-- shows: loc:corrected -->\n", "")
			},
			want: []string{"RDR-104@chapter04.md"},
		},
		{
			name: "ch-04 の列を corrected, misled に逆転する",
			mutate: func(ms string) {
				replaceIn(t, filepath.Join(ms, "chapter04.md"),
					"    - \"loc:misled\"\n    - \"loc:corrected\"\n", "    - \"loc:corrected\"\n    - \"loc:misled\"\n")
				replaceIn(t, filepath.Join(ms, "chapter04.md"),
					"<!-- shows: loc:misled -->\n<!-- shows: loc:corrected -->\n", "<!-- shows: loc:corrected -->\n<!-- shows: loc:misled -->\n")
			},
			want: []string{"RDR-103@chapter04.md", "RDR-104@chapter04.md"},
		},
		{
			name: "ch-02 の hist:withheld を消す",
			mutate: func(ms string) {
				replaceIn(t, filepath.Join(ms, "chapter02.md"), "    - \"hist:withheld\"\n", "")
				replaceIn(t, filepath.Join(ms, "chapter02.md"), "<!-- shows: hist:withheld -->\n", "")
			},
			want: []string{"RDR-102@chapter03.md"},
		},
		{
			name: "存在しない命題を参照する",
			mutate: func(ms string) {
				replaceIn(t, filepath.Join(ms, "chapter02.md"), "\"loc:shown\"", "\"key:shown\"")
				replaceIn(t, filepath.Join(ms, "chapter02.md"), "shows: loc:shown", "shows: key:shown")
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

// markerProject writes chapters into a fresh project holding one proposition, loc.
func markerProject(t *testing.T, policy string, chapters map[string]string) (ms, root string) {
	t.Helper()
	root = t.TempDir()
	ms = filepath.Join(root, "manuscripts")
	for _, d := range []string{ms, filepath.Join(root, "src", "propositions")} {
		if err := os.MkdirAll(d, 0o755); err != nil {
			t.Fatal(err)
		}
	}
	write := func(p, c string) {
		if err := os.WriteFile(p, []byte(c), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	src := localTestdata(t, "clarity_rainkey")
	manifest, err := os.ReadFile(filepath.Join(src, ".storyteller.json"))
	if err != nil {
		t.Fatal(err)
	}
	write(filepath.Join(root, ".storyteller.json"), string(manifest))
	prop, err := os.ReadFile(filepath.Join(src, "src", "propositions", "loc.ts"))
	if err != nil {
		t.Fatal(err)
	}
	write(filepath.Join(root, "src", "propositions", "loc.ts"),
		strings.Replace(string(prop), "must-correct-if-false", policy, 1))
	for name, c := range chapters {
		write(filepath.Join(ms, name), c)
	}
	return ms, root
}

func chapter(id, fmExtra, body string) string {
	return "---\nstoryteller:\n  chapter_id: " + id + "\n" + fmExtra + "---\n" + body
}

func runMarker(t *testing.T, policy string, chapters map[string]string) service.ReaderPrereqResult {
	t.Helper()
	ms, root := markerProject(t, policy, chapters)
	res, err := service.NewReaderPrereqService().Run(ms, root)
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	return res
}

func TestReaderPrereq_BodyOrderCatchesFrontmatterLie(t *testing.T) {
	res := runMarker(t, "must-correct-if-false", map[string]string{
		"ch01.md": chapter("ch-01", "", "x\n"),
		"ch02.md": chapter("ch-02", "  reader_shows:\n    - \"loc:misled\"\n    - \"loc:corrected\"\n",
			"<!-- shows: loc:corrected -->\n<!-- shows: loc:misled -->\n"),
	})
	got := strings.Join(codes(res), " ")
	if got != "RDR-103@ch02.md RDR-104@ch02.md" {
		t.Errorf("violations = %v", res.Violations)
	}
}

func TestReaderPrereq_DuplicateMarkerIsNotAViolation(t *testing.T) {
	res := runMarker(t, "may-remain-misled", map[string]string{
		"ch01.md": chapter("ch-01", "  reader_shows:\n    - \"loc:shown\"\n",
			"<!-- shows: loc:shown -->\n<!-- shows: loc:shown -->\n"),
	})
	if len(res.Violations) != 0 {
		t.Errorf("want none, got %v", res.Violations)
	}
}

func TestReaderPrereq_DeclaredWithoutMarker(t *testing.T) {
	res := runMarker(t, "may-remain-misled", map[string]string{
		"ch01.md": chapter("ch-01", "  reader_shows:\n    - \"loc:shown\"\n", "x\n"),
	})
	if len(res.Violations) != 1 || res.Violations[0].Code != "RDR-105" || res.Violations[0].Line != 5 {
		t.Errorf("want one RDR-105 at line 5, got %v", res.Violations)
	}
}

func TestReaderPrereq_MarkerWithoutDeclaration(t *testing.T) {
	res := runMarker(t, "may-remain-misled", map[string]string{
		"ch01.md": chapter("ch-01", "", "x\n<!-- shows: loc:shown -->\n"),
	})
	if len(res.Violations) != 1 || res.Violations[0].Code != "RDR-105" || res.Violations[0].Line != 6 {
		t.Errorf("want one RDR-105 at line 6, got %v", res.Violations)
	}
}

func TestReaderPrereq_UnreferencedPropositionIsReported(t *testing.T) {
	for _, policy := range []string{"may-remain-misled", "must-correct-if-false"} {
		t.Run(policy, func(t *testing.T) {
			res := runMarker(t, policy, map[string]string{
				"ch01.md": chapter("ch-01", "", "x\n"),
				"ch02.md": chapter("ch-02", "", "y\n"),
			})
			if got := strings.Join(codes(res), " "); got != "RDR-106@ch02.md" {
				t.Errorf("a proposition no chapter mentions must fail once, got %v", res.Violations)
			}
		})
	}
}

func TestReaderPrereq_RequiredOnlyIsNotUnreferenced(t *testing.T) {
	res := runMarker(t, "may-remain-misled", map[string]string{
		"ch01.md": chapter("ch-01", "  reader_requires:\n    - \"loc\"\n", "x\n"),
	})
	if got := strings.Join(codes(res), " "); got != "RDR-102@ch01.md" {
		t.Errorf("want only RDR-102, got %v", res.Violations)
	}
}

func TestReaderPrereq_LastStanceComesFromBody(t *testing.T) {
	res := runMarker(t, "must-correct-if-false", map[string]string{
		"ch01.md": chapter("ch-01", "  reader_shows:\n    - \"loc:misled\"\n", "<!-- shows: loc:misled -->\n"),
		"ch02.md": chapter("ch-02", "  reader_shows:\n    - \"loc:shown\"\n    - \"loc:corrected\"\n",
			"<!-- shows: loc:corrected -->\n<!-- shows: loc:shown -->\n"),
	})
	got := strings.Join(codes(res), " ")
	if !strings.Contains(got, "RDR-104@ch02.md") {
		t.Errorf("want RDR-104, got %v", res.Violations)
	}
}
