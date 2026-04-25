package meta

import (
	"errors"
	"reflect"
	"strings"
	"testing"

	apperrors "github.com/takets/street-storyteller/internal/errors"
)

// Why: Table-driven test で 4 種 preset の validate string が TS 元実装の
// キーワード ("戦"/"恋"/"「"/"TODO") を保持していることを保証する。
func TestGetPreset_AllKnownPresets(t *testing.T) {
	cases := []struct {
		name        PresetType
		wantSubstrs []string
	}{
		{"battle-scene", []string{"戦", "剣"}},
		{"romance-scene", []string{"恋", "愛"}},
		{"dialogue", []string{"「", "」"}},
		{"exposition", []string{"TODO"}},
	}

	for _, tc := range cases {
		t.Run(string(tc.name), func(t *testing.T) {
			p, err := GetPreset(tc.name)
			if err != nil {
				t.Fatalf("GetPreset(%q) returned error: %v", tc.name, err)
			}
			if p.Type != tc.name {
				t.Errorf("Preset.Type = %q, want %q", p.Type, tc.name)
			}
			if len(p.Validations) == 0 {
				t.Fatalf("Preset.Validations is empty")
			}
			v := p.Validations[0]
			if v.Type != ValidationPlotAdvancement {
				t.Errorf("Validation.Type = %q, want %q", v.Type, ValidationPlotAdvancement)
			}
			for _, sub := range tc.wantSubstrs {
				if !strings.Contains(v.Validate, sub) {
					t.Errorf("Validation.Validate does not contain %q\n got: %s", sub, v.Validate)
				}
			}
			if v.Message == "" {
				t.Errorf("Validation.Message is empty")
			}
		})
	}
}

func TestGetPreset_Unknown(t *testing.T) {
	_, err := GetPreset("unknown")
	if err == nil {
		t.Fatal("GetPreset(\"unknown\") returned nil error, want error")
	}
	var appErr *apperrors.Error
	if !errors.As(err, &appErr) {
		t.Fatalf("error is not *apperrors.Error: %T", err)
	}
	if appErr.Code != apperrors.CodeValidation {
		t.Errorf("error code = %q, want %q", appErr.Code, apperrors.CodeValidation)
	}
}

func TestListPresets_AlphabeticalOrder(t *testing.T) {
	got := ListPresets()
	want := []PresetType{"battle-scene", "dialogue", "exposition", "romance-scene"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("ListPresets() = %v, want %v", got, want)
	}
}
