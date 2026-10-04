package meta

import (
	"reflect"
	"testing"
)

func TestParseList_Layouts(t *testing.T) {
	cases := map[string]string{
		"top-level block": "characters:\n  - hero\n  - \"勇者\"\nsettings: []\n",
		"nested block":    "storyteller:\n  characters:\n    - 'hero'\n    - \"勇者\"\n  settings: []\n",
		"inline":          "characters: [hero, \"勇者\"]\n",
	}
	for name, fm := range cases {
		if got := ParseList(fm, "characters"); !reflect.DeepEqual(got, []string{"hero", "勇者"}) {
			t.Errorf("%s: got %q", name, got)
		}
	}
}
