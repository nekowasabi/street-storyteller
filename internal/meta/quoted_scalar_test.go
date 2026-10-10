package meta

import (
	"reflect"
	"testing"
)

func TestFrontMatterQuotedScalarsRoundTrip(t *testing.T) {
	for _, value := range []string{
		"First line\nSecond line",
		"\tIndented\t",
		"Carriage\rreturn",
		"The hero's \"journey\"",
		`C:\stories\chapter`,
		"勇者😀",
	} {
		t.Run(value, func(t *testing.T) {
			want := FrontMatter{Title: value, Characters: []string{value}}
			original := &Document{HasFrontMatter: true, FrontMatter: want, bodyRaw: []byte("# Body\r\nUnchanged prose.\n")}
			encoded, err := original.Encode()
			if err != nil {
				t.Fatal(err)
			}
			parsed, err := Parse(encoded)
			if err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(parsed.FrontMatter, want) {
				t.Fatalf("metadata changed: got %#v, want %#v; encoded=%q", parsed.FrontMatter, want, encoded)
			}
			if parsed.Body != string(original.bodyRaw) {
				t.Fatalf("manuscript body changed: %q", parsed.Body)
			}
		})
	}
}

func TestFrontMatterSingleQuotedApostrophe(t *testing.T) {
	doc, err := Parse([]byte("---\nstoryteller:\n  title: 'The hero''s journey'\n---\n# Chapter\n"))
	if err != nil {
		t.Fatal(err)
	}
	if doc.FrontMatter.Title != "The hero's journey" {
		t.Fatalf("title = %q", doc.FrontMatter.Title)
	}
}

func FuzzFrontMatterQuotedScalars(f *testing.F) {
	for _, value := range []string{"", "勇者😀", "First\nSecond", "\tIndented\t", `The hero's "journey"`, "\x00\x7f"} {
		f.Add(value)
	}
	f.Fuzz(func(t *testing.T, value string) {
		if len(value) > 16*1024 {
			t.Skip()
		}
		doc := &Document{HasFrontMatter: true, FrontMatter: FrontMatter{Title: value, Characters: []string{value}}, bodyRaw: []byte("# Authored body\n")}
		encoded, err := doc.Encode()
		if err != nil {
			t.Fatal(err)
		}
		parsed, err := Parse(encoded)
		if err != nil {
			t.Fatal(err)
		}
		if !reflect.DeepEqual(parsed.FrontMatter, doc.FrontMatter) {
			t.Fatalf("metadata changed: got %#v, want %#v", parsed.FrontMatter, doc.FrontMatter)
		}
		if parsed.Body != string(doc.bodyRaw) {
			t.Fatal("body changed")
		}
	})
}
