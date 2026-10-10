package meta

import (
	"reflect"
	"testing"
)

func TestParseFrontmatterInlineBindings(t *testing.T) {
	const content = "---\nstoryteller:\n  title: '[Chapter]'\n  characters: [チエ, アンジェリ, ビッグ・マム]\n  settings: [ビッグ・マムの食堂]\n  foreshadowings: [hint]\n  timeline_events: [event]\n  phases: [phase]\n  timelines: [timeline]\n---\nBody\n"
	doc, err := Parse([]byte(content))
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name      string
		got, want []string
	}{
		{"characters", doc.FrontMatter.Characters, []string{"チエ", "アンジェリ", "ビッグ・マム"}},
		{"settings", doc.FrontMatter.Settings, []string{"ビッグ・マムの食堂"}},
		{"foreshadowings", doc.FrontMatter.Foreshadowings, []string{"hint"}},
		{"timeline_events", doc.FrontMatter.TimelineEvents, []string{"event"}},
		{"phases", doc.FrontMatter.Phases, []string{"phase"}},
		{"timelines", doc.FrontMatter.Timelines, []string{"timeline"}},
	} {
		if !reflect.DeepEqual(tc.got, tc.want) {
			t.Errorf("%s: got %v, want %v", tc.name, tc.got, tc.want)
		}
	}
	if doc.FrontMatter.Title != "[Chapter]" || doc.Body != "Body\n" {
		t.Fatalf("unrelated content changed: %+v", doc)
	}
}

func TestParseListQuotedCommas(t *testing.T) {
	const fm = `characters: ["hero,friend", 'city, night', "plain"]`
	want := []string{"hero,friend", "city, night", "plain"}
	if got := ParseList(fm, "characters"); !reflect.DeepEqual(got, want) {
		t.Fatalf("got %q, want %q", got, want)
	}
}

func TestSplitInlineListQuotedSeparators(t *testing.T) {
	for _, tc := range []struct {
		input string
		want  []string
	}{
		{`"a\",b", c`, []string{`"a\",b"`, ` c`}},
		{`'a'',b', c`, []string{`'a'',b'`, ` c`}},
		{`O'Brien, friend`, []string{`O'Brien`, ` friend`}},
	} {
		if got := splitInlineList(tc.input); !reflect.DeepEqual(got, tc.want) {
			t.Errorf("%q: got %q, want %q", tc.input, got, tc.want)
		}
	}
}
