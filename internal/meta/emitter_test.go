package meta

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// fixedTime は Golden test 用の deterministic な生成時刻。
// Why: time.Now() を引数化することで OS / TZ 非依存のテストが可能。
var fixedTime = time.Date(2025, 12, 15, 16, 0, 13, 0, time.UTC)

func readGolden(t *testing.T, name string) string {
	t.Helper()
	path := filepath.Join("testdata", "emitter_golden", name)
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read golden %s: %v", path, err)
	}
	return string(b)
}

func cinderellaChapter01Input() ChapterMetaInput {
	return ChapterMetaInput{
		ID:    "chapter01",
		Title: "灰かぶり姫の日常",
		Order: 1,
		Characters: []EntityImport{
			{ID: "cinderella", ImportPath: "../src/characters/cinderella.ts", VarName: "cinderella"},
		},
		Settings: []EntityImport{
			{ID: "mansion", ImportPath: "../src/settings/mansion.ts", VarName: "mansion"},
		},
		References: map[string]string{
			"シンデレラ": "cinderella",
			"屋敷":    "mansion",
		},
	}
}

func TestEmitNew_Cinderella(t *testing.T) {
	got := EmitNew(cinderellaChapter01Input(), fixedTime)
	want := readGolden(t, "new_chapter01.expected.ts")
	if got != want {
		t.Errorf("EmitNew mismatch.\n--- got ---\n%s\n--- want ---\n%s", got, want)
	}
}

func TestEmitNew_EmptyEntities(t *testing.T) {
	in := ChapterMetaInput{
		ID:         "chapter02",
		Title:      "空の章",
		Order:      2,
		Characters: nil,
		Settings:   nil,
		References: nil,
	}
	got := EmitNew(in, fixedTime)
	want := readGolden(t, "empty_entities.expected.ts")
	if got != want {
		t.Errorf("EmitNew empty mismatch.\n--- got ---\n%s\n--- want ---\n%s", got, want)
	}
}

func TestEmitNew_References_AlphabeticalOrder(t *testing.T) {
	in := ChapterMetaInput{
		ID:    "chapter03",
		Title: "並び順テスト",
		Order: 3,
		Characters: []EntityImport{
			{ID: "alpha", ImportPath: "../src/characters/alpha.ts", VarName: "alpha"},
			{ID: "beta", ImportPath: "../src/characters/beta.ts", VarName: "beta"},
		},
		// 意図的に逆順で投入。出力は UTF-8 byte order でソートされること。
		References: map[string]string{
			"ベータ":  "beta",
			"アルファ": "alpha",
			"猫":    "alpha",
			"犬":    "beta",
		},
	}
	got := EmitNew(in, fixedTime)

	// references 内の出現順を抽出
	startIdx := strings.Index(got, "// storyteller:auto:references:start")
	endIdx := strings.Index(got, "// storyteller:auto:references:end")
	if startIdx < 0 || endIdx < 0 {
		t.Fatalf("references markers not found in output:\n%s", got)
	}
	block := got[startIdx:endIdx]
	keys := []string{"アルファ", "ベータ", "犬", "猫"} // sort.Strings 順 (UTF-8 byte order)
	prev := -1
	for _, k := range keys {
		idx := strings.Index(block, "\""+k+"\":")
		if idx < 0 {
			t.Errorf("key %q not found in references block", k)
			continue
		}
		if idx <= prev {
			t.Errorf("key %q appeared out of expected sorted order (idx=%d <= prev=%d)", k, idx, prev)
		}
		prev = idx
	}
}

func TestEmitNew_ImportsAlphabetical(t *testing.T) {
	in := ChapterMetaInput{
		ID:    "chapter04",
		Title: "import順テスト",
		Order: 4,
		// 意図的に逆順
		Characters: []EntityImport{
			{ID: "zoe", ImportPath: "../src/characters/zoe.ts", VarName: "zoe"},
			{ID: "alice", ImportPath: "../src/characters/alice.ts", VarName: "alice"},
		},
	}
	got := EmitNew(in, fixedTime)
	idxAlice := strings.Index(got, "import { alice }")
	idxZoe := strings.Index(got, "import { zoe }")
	if idxAlice < 0 || idxZoe < 0 {
		t.Fatalf("expected both imports to appear; got:\n%s", got)
	}
	if idxAlice >= idxZoe {
		t.Errorf("expected alice import before zoe; got alice=%d zoe=%d", idxAlice, idxZoe)
	}
	// import type が先頭にあること
	idxType := strings.Index(got, "import type { ChapterMeta }")
	if idxType < 0 || idxType >= idxAlice {
		t.Errorf("expected `import type { ChapterMeta }` at top of imports block")
	}
}

func TestUpdateOrEmit_PreservesManualSection(t *testing.T) {
	input := readGolden(t, "update_with_validations.input.ts")
	want := readGolden(t, "update_with_validations.expected.ts")

	got, err := UpdateOrEmit(input, cinderellaChapter01Input(), fixedTime)
	if err != nil {
		t.Fatalf("UpdateOrEmit: unexpected error: %v", err)
	}
	if got != want {
		t.Errorf("UpdateOrEmit mismatch.\n--- got ---\n%s\n--- want ---\n%s", got, want)
	}
}

func TestUpdateOrEmit_NewFile(t *testing.T) {
	got, err := UpdateOrEmit("", cinderellaChapter01Input(), fixedTime)
	if err != nil {
		t.Fatalf("UpdateOrEmit empty: unexpected error: %v", err)
	}
	want := EmitNew(cinderellaChapter01Input(), fixedTime)
	if got != want {
		t.Errorf("UpdateOrEmit(\"\") should equal EmitNew.\n--- got ---\n%s\n--- want ---\n%s", got, want)
	}
}

func TestUpdateOrEmit_MalformedBlock(t *testing.T) {
	// imports start のみ存在し end が無い malformed なケース
	malformed := `// 自動生成: storyteller meta generate
// 生成日時: 2025-01-01 00:00:00

// storyteller:auto:imports:start
import type { ChapterMeta } from "../src/types/chapter.ts";
// (no end marker here)

export const chapter01Meta: ChapterMeta = {
  id: "chapter01",
  // storyteller:auto:core:start
  title: "x",
  order: 1,
  // storyteller:auto:core:end
  // storyteller:auto:entities:start
  characters: [],
  settings: [],
  // storyteller:auto:entities:end
  // storyteller:auto:references:start
  references: {},
  // storyteller:auto:references:end
};
`
	_, err := UpdateOrEmit(malformed, cinderellaChapter01Input(), fixedTime)
	if err == nil {
		t.Fatal("UpdateOrEmit: expected error for malformed block, got nil")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "malformed") &&
		!strings.Contains(strings.ToLower(err.Error()), "missing") {
		t.Errorf("expected error containing 'malformed' or 'missing', got: %v", err)
	}
}

func TestUpdateOrEmit_MalformedReverseOrder(t *testing.T) {
	// end が start より前に出現する malformed
	malformed := `// storyteller:auto:imports:end
// storyteller:auto:imports:start
// storyteller:auto:core:start
title: "x",
order: 1,
// storyteller:auto:core:end
// storyteller:auto:entities:start
characters: [],
settings: [],
// storyteller:auto:entities:end
// storyteller:auto:references:start
references: {},
// storyteller:auto:references:end
`
	_, err := UpdateOrEmit(malformed, cinderellaChapter01Input(), fixedTime)
	if err == nil {
		t.Fatal("expected error for reversed markers, got nil")
	}
}
