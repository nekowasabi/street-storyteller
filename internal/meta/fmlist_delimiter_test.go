package meta

import "testing"

func TestSplitFrontmatterMatchesDocumentDelimiters(t *testing.T) {
	for _, tc := range []struct {
		name, content, fm, body string
		hasFM                   bool
	}{
		{"LF", "---\nstoryteller:\n  title: Chapter\n---\nBody\n", "storyteller:\n  title: Chapter\n", "Body\n", true},
		{"CRLF", "---\r\nstoryteller:\r\n  title: Chapter\r\n---\r\nBody\r\n", "storyteller:\r\n  title: Chapter\r\n", "Body\r\n", true},
		{"closing at EOF", "---\nstoryteller:\n  title: Chapter\n---", "storyteller:\n  title: Chapter\n", "", true},
		{"empty", "---\n---\nBody\n", "", "Body\n", true},
		{"no frontmatter", "Body\n", "", "Body\n", false},
		{"unclosed", "---\nstoryteller:\n", "", "---\nstoryteller:\n", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			fm, body, hasFM := SplitFrontmatter(tc.content)
			if fm != tc.fm || body != tc.body || hasFM != tc.hasFM {
				t.Fatalf("got (%q, %q, %t), want (%q, %q, %t)", fm, body, hasFM, tc.fm, tc.body, tc.hasFM)
			}
		})
	}
}
