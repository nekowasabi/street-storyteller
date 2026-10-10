package tsparse

import (
	"reflect"
	"strings"
	"testing"
)

func TestImportPreprocessingPreservesAuthoredText(t *testing.T) {
	want := "First line\nimport precious goods from the harbor.\nLast line"
	source := "import type { Character } from './character.ts';\n" +
		"export const hero: Character = { summary: `" + want + "` };"
	got, err := ParseExportConst([]byte(source))
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(got.Value, map[string]Value{"summary": want}) {
		t.Fatalf("authored text changed: got %#v, want %q", got.Value, want)
	}
}

func TestImportPreprocessingAcceptsMultilineDeclarations(t *testing.T) {
	for _, declaration := range []string{
		"import type {\n  Character,\n  Setting,\n} from './types.ts';\n",
		"/* authoring types */ import type { Character } from './types.ts';\n",
		"import type { Character } from './types.ts'; ",
		"import type { Character }\nfrom './types.ts'\n",
		"import { type Character } from './semi;colon.ts';\r\n",
		"import './side-effect.ts';\nimport * as Types from './types.ts';\n",
		"import { 'quoted-name' as Character } from './types.ts';\n",
		"import type { Character /* comment */ } from /* comment */ './types.ts';\n",
	} {
		t.Run(declaration, func(t *testing.T) {
			got, err := ParseExportConst([]byte(declaration + "export const hero: Character = { name: 'Hero' };"))
			if err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(got.Value, map[string]Value{"name": "Hero"}) {
				t.Fatalf("unexpected parsed value: %#v", got.Value)
			}
		})
	}
}

func TestPreprocessingPreservesErrorLineNumbers(t *testing.T) {
	_, err := ParseExportConst([]byte("import type { Character } from './types.ts';\n\nexport const hero: Character = {\n  summary: invalid,\n};"))
	if err == nil || !strings.Contains(err.Error(), "line 4,") {
		t.Fatalf("expected original line 4 in parse error, got %v", err)
	}
}
