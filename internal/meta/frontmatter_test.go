package meta

import (
	"bytes"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/detect"
)

// fixturePath は test バイナリの cwd (internal/meta) からリポジトリルートへ遡って
// samples/cinderella/manuscripts/chapter01.md を解決する。
func fixturePath(t *testing.T) string {
	t.Helper()
	return filepath.Join("..", "..", "samples", "cinderella", "manuscripts", "chapter01.md")
}

func mustReadFixture(t *testing.T) []byte {
	t.Helper()
	b, err := os.ReadFile(fixturePath(t))
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	return b
}

func TestParse_CinderellaChapter01(t *testing.T) {
	content := mustReadFixture(t)

	doc, err := Parse(content)
	if err != nil {
		t.Fatalf("Parse: unexpected error: %v", err)
	}
	if !doc.HasFrontMatter {
		t.Fatal("HasFrontMatter = false, want true")
	}
	if got, want := doc.FrontMatter.ChapterID, "chapter01"; got != want {
		t.Errorf("ChapterID = %q, want %q", got, want)
	}
	if got, want := doc.FrontMatter.Title, "灰かぶり姫の日常"; got != want {
		t.Errorf("Title = %q, want %q", got, want)
	}
	if got, want := doc.FrontMatter.Order, 1; got != want {
		t.Errorf("Order = %d, want %d", got, want)
	}
	wantChars := []string{"cinderella", "stepmother", "stepsister_elder", "stepsister_younger"}
	if !reflect.DeepEqual(doc.FrontMatter.Characters, wantChars) {
		t.Errorf("Characters = %v, want %v", doc.FrontMatter.Characters, wantChars)
	}
	wantSettings := []string{"mansion"}
	if !reflect.DeepEqual(doc.FrontMatter.Settings, wantSettings) {
		t.Errorf("Settings = %v, want %v", doc.FrontMatter.Settings, wantSettings)
	}
	if strings.TrimSpace(doc.Body) == "" {
		t.Error("Body should not be empty")
	}
}

func TestParse_NoFrontMatter(t *testing.T) {
	src := []byte("# Plain Markdown\n\nNo frontmatter here.")
	doc, err := Parse(src)
	if err != nil {
		t.Fatalf("Parse: unexpected error: %v", err)
	}
	if doc.HasFrontMatter {
		t.Error("HasFrontMatter = true, want false")
	}
	if doc.Body != string(src) {
		t.Errorf("Body = %q, want full input", doc.Body)
	}
}

func TestEdit_AddEntities_BodyPreservation(t *testing.T) {
	content := mustReadFixture(t)
	doc, err := Parse(content)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	originalBody := append([]byte(nil), doc.bodyRaw...)

	if err := doc.AddEntities(detect.EntityCharacter, "newhero"); err != nil {
		t.Fatalf("AddEntities: %v", err)
	}

	encoded, err := doc.Encode()
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}
	if !bytes.Contains(encoded, []byte("newhero")) {
		t.Error("encoded result should contain 'newhero'")
	}

	// Body bytes 完全一致 (original の body 部分が encoded 末尾に bytewise 一致して含まれる)
	if !bytes.HasSuffix(encoded, originalBody) {
		t.Errorf("body bytes were not preserved exactly\noriginal=%q\nencoded_tail=%q", originalBody, encoded[len(encoded)-len(originalBody):])
	}

	// Re-parse して characters に "newhero" が入っていることも確認 (sanity)
	roundDoc, err := Parse(encoded)
	if err != nil {
		t.Fatalf("re-Parse: %v", err)
	}
	found := false
	for _, c := range roundDoc.FrontMatter.Characters {
		if c == "newhero" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("re-parsed Characters does not contain 'newhero': %v", roundDoc.FrontMatter.Characters)
	}
}

func TestEdit_RemoveEntities(t *testing.T) {
	content := mustReadFixture(t)
	doc, err := Parse(content)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}

	doc.RemoveEntities(detect.EntityCharacter, "stepmother")

	encoded, err := doc.Encode()
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}
	// 完全一致除去のため、リスト要素 "    - stepmother\n" が消えていること
	if bytes.Contains(encoded, []byte("- stepmother\n")) {
		t.Error("encoded should not contain '- stepmother' after removal")
	}
	// 他キャラは残っている
	for _, keep := range []string{"cinderella", "stepsister_elder", "stepsister_younger"} {
		if !bytes.Contains(encoded, []byte(keep)) {
			t.Errorf("encoded missing kept character %q", keep)
		}
	}

	// 存在しない ID の remove は no-op
	doc.RemoveEntities(detect.EntityCharacter, "ghost_who_never_existed")
}

func TestEdit_SetEntities_Replaces(t *testing.T) {
	content := mustReadFixture(t)
	doc, err := Parse(content)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	originalChars := append([]string(nil), doc.FrontMatter.Characters...)

	if err := doc.SetEntities(detect.EntitySetting, []string{"forest"}); err != nil {
		t.Fatalf("SetEntities: %v", err)
	}

	if got, want := doc.FrontMatter.Settings, []string{"forest"}; !reflect.DeepEqual(got, want) {
		t.Errorf("Settings after Set = %v, want %v", got, want)
	}
	if !reflect.DeepEqual(doc.FrontMatter.Characters, originalChars) {
		t.Errorf("Characters were modified by Set on Settings: got=%v want=%v", doc.FrontMatter.Characters, originalChars)
	}

	encoded, err := doc.Encode()
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}
	if !bytes.Contains(encoded, []byte("forest")) {
		t.Error("encoded should contain new 'forest' setting")
	}
	if bytes.Contains(encoded, []byte("- mansion\n")) {
		t.Error("encoded should no longer contain old '- mansion'")
	}
}

func TestRoundTrip_Idempotent(t *testing.T) {
	content := mustReadFixture(t)

	doc1, err := Parse(content)
	if err != nil {
		t.Fatalf("Parse #1: %v", err)
	}
	enc1, err := doc1.Encode()
	if err != nil {
		t.Fatalf("Encode #1: %v", err)
	}

	doc2, err := Parse(enc1)
	if err != nil {
		t.Fatalf("Parse #2: %v", err)
	}
	enc2, err := doc2.Encode()
	if err != nil {
		t.Fatalf("Encode #2: %v", err)
	}

	if !bytes.Equal(enc1, enc2) {
		t.Errorf("idempotency violated:\nenc1=%q\nenc2=%q", enc1, enc2)
	}
}

func TestEncode_NoFrontMatter_AddEntities_GeneratesBlock(t *testing.T) {
	plain := []byte("# 章タイトル\n本文だけ\n")
	doc, err := Parse(plain)
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}
	if doc.HasFrontMatter {
		t.Fatalf("precondition: expected HasFrontMatter=false, got true")
	}
	if err := doc.AddEntities(detect.EntityCharacter, "hero"); err != nil {
		t.Fatalf("AddEntities character failed: %v", err)
	}
	if err := doc.AddEntities(detect.EntitySetting, "castle"); err != nil {
		t.Fatalf("AddEntities setting failed: %v", err)
	}
	encoded, err := doc.Encode()
	if err != nil {
		t.Fatalf("Encode failed: %v", err)
	}
	out := string(encoded)
	if !strings.HasPrefix(out, "---\n") {
		t.Errorf("expected YAML block at top, got: %q", out)
	}
	if !strings.Contains(out, "hero") {
		t.Errorf("expected hero in output, got: %q", out)
	}
	if !strings.Contains(out, "castle") {
		t.Errorf("expected castle in output, got: %q", out)
	}
	if !strings.HasSuffix(out, "# 章タイトル\n本文だけ\n") {
		t.Errorf("expected body preserved at suffix, got: %q", out)
	}
}

func TestEncode_NoFrontMatter_NoEdit_PreservesRaw(t *testing.T) {
	plain := []byte("# 章タイトル\n本文だけ\n")
	doc, err := Parse(plain)
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}
	encoded, err := doc.Encode()
	if err != nil {
		t.Fatalf("Encode failed: %v", err)
	}
	if !bytes.Equal(plain, encoded) {
		t.Errorf("expected byte-perfect preservation\nwant: %q\ngot:  %q", plain, encoded)
	}
}
