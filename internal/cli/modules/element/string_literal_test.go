package element

import (
	"github.com/takets/street-storyteller/internal/project/tsparse"
	"testing"
	"unicode/utf8"
)

func TestElementStringLiteralsRoundTrip(t *testing.T) {
	for _, value := range []string{`A "quote" and \ path`, "first\nsecond", "bell\aend", "vertical\vend", "format\U0001d173end", "勇者😀", "<tag> & text"} {
		for _, kind := range []string{"character", "setting", "timeline", "foreshadowing", "plot", "phase"} {
			t.Run(kind+"/"+value, func(t *testing.T) {
				_, _, body := elementTemplate(kind, options{id: value, name: value, summary: value, displayNames: []string{value}, aliases: []string{value}, pronouns: []string{value}})
				parsed, err := tsparse.ParseExportConst([]byte("export const hero = " + body + ";"))
				if err != nil {
					t.Fatal(err)
				}
				obj := parsed.Value.(map[string]tsparse.Value)
				if obj["id"] != value || obj["name"] != value || obj["summary"] != value {
					t.Errorf("authored text changed: %#v", obj)
				}
			})
		}
	}
}

func TestElementDetailLiteralsRoundTrip(t *testing.T) {
	for _, field := range []string{"backstory", "back-story", `quoted"field`, "line\nbreak", "bell\a", "勇者"} {
		for _, id := range []string{"hero", `hero"quoted`, "hero\nline"} {
			t.Run(id+"/"+field, func(t *testing.T) {
				literal := detailsLiteral(id, options{detailFields: []string{field}})
				parsed, err := tsparse.ParseExportConst([]byte("export const details = " + literal + ";"))
				if err != nil {
					t.Fatalf("invalid detail literal %s: %v", literal, err)
				}
				obj := parsed.Value.(map[string]tsparse.Value)
				detail, ok := obj[field].(map[string]tsparse.Value)
				if !ok || detail["file"] != "./"+id+"_"+field+".md" {
					t.Errorf("detail reference changed: %#v", obj)
				}
			})
		}
	}
}

func FuzzElementDetailLiterals(f *testing.F) {
	for _, value := range []string{"hero", `quote"`, "line\n---", "bell\a", "format\U0001d173", "勇者😀", ""} {
		f.Add(value, value)
	}
	f.Fuzz(func(t *testing.T, id, field string) {
		if len(id)+len(field) > 4096 || !utf8.ValidString(id) || !utf8.ValidString(field) {
			t.Skip()
		}
		literal := detailsLiteral(id, options{detailFields: []string{field}})
		parsed, err := tsparse.ParseExportConst([]byte("export const details = " + literal + ";"))
		if err != nil {
			t.Fatal(err)
		}
		obj := parsed.Value.(map[string]tsparse.Value)
		ref, ok := obj[field].(map[string]tsparse.Value)
		if !ok || ref["file"] != "./"+id+"_"+field+".md" {
			t.Fatalf("reference changed: %#v", obj)
		}
	})
}
