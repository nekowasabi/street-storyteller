package meta

import (
	"strings"
	"testing"
)

func TestFrontMatter_ReaderFieldsRoundTrip_KeepsOrder(t *testing.T) {
	src := "---\nstoryteller:\n  chapter_id: ch-04\n  reader_shows:\n    - \"loc:misled\"\n    - \"loc:corrected\"\n  reader_requires:\n    - \"loc:convinced\"\n    - \"hist\"\n---\n本文\n"
	doc, err := Parse([]byte(src))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if got := strings.Join(doc.FrontMatter.ReaderShows, ","); got != "loc:misled,loc:corrected" {
		t.Errorf("ReaderShows = %q", got)
	}
	if got := strings.Join(doc.FrontMatter.ReaderRequires, ","); got != "loc:convinced,hist" {
		t.Errorf("ReaderRequires = %q", got)
	}
	out, err := doc.Encode()
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}
	again, err := Parse(out)
	if err != nil {
		t.Fatalf("re-Parse: %v", err)
	}
	if got := strings.Join(again.FrontMatter.ReaderShows, ","); got != "loc:misled,loc:corrected" {
		t.Errorf("after Encode ReaderShows = %q (order must survive)", got)
	}
	if !strings.HasSuffix(string(out), "本文\n") {
		t.Errorf("body not preserved: %q", out)
	}
}

func TestFrontMatter_ReaderFieldsInline(t *testing.T) {
	src := "---\nstoryteller:\n  reader_requires: [\"loc:shown\", \"hist\"]\n---\n"
	doc, err := Parse([]byte(src))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if got := strings.Join(doc.FrontMatter.ReaderRequires, ","); got != "loc:shown,hist" {
		t.Errorf("ReaderRequires = %q", got)
	}
}
