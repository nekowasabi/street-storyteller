package tsparse

import (
	"reflect"
	"strings"
	"testing"
)

// Why: Red Phase first — these tests pin down the public contract of
// ParseExportConst before any implementation exists. The shape covers both the
// success surface (literal types we accept) and the rejection surface (TS-only
// constructs we deliberately refuse, see doc.go).

func TestParseExportConst_Success(t *testing.T) {
	type tc struct {
		name     string
		source   string
		wantName string
		want     Value
	}
	cases := []tc{
		{
			name:     "object with string and array",
			source:   `export const Hero = { name: "勇者", traits: ["brave", "kind"] };`,
			wantName: "Hero",
			want: map[string]Value{
				"name":   "勇者",
				"traits": []Value{"brave", "kind"},
			},
		},
		{
			name:     "nested object",
			source:   `export const X = { details: { description: "long text" } };`,
			wantName: "X",
			want: map[string]Value{
				"details": map[string]Value{
					"description": "long text",
				},
			},
		},
		{
			name:     "mixed primitives",
			source:   `export const Stats = { count: 42, ratio: 0.5, active: true, missing: null };`,
			wantName: "Stats",
			want: map[string]Value{
				"count":   float64(42),
				"ratio":   0.5,
				"active":  true,
				"missing": nil,
			},
		},
		{
			name: "trailing commas and comments",
			source: `
				// leading comment
				export const C = {
					/* block comment */
					a: 1, // inline
					b: [2, 3,], // trailing comma in array
				}; // tail
			`,
			wantName: "C",
			want: map[string]Value{
				"a": float64(1),
				"b": []Value{float64(2), float64(3)},
			},
		},
		{
			name:     "identifier and quoted keys mixed",
			source:   `export const M = { foo: 1, "bar-baz": 2, 'qux': 3 };`,
			wantName: "M",
			want: map[string]Value{
				"foo":     float64(1),
				"bar-baz": float64(2),
				"qux":     float64(3),
			},
		},
		{
			name:     "single quoted string",
			source:   `export const S = { msg: 'hello' };`,
			wantName: "S",
			want: map[string]Value{
				"msg": "hello",
			},
		},
		{
			name:     "plain backtick string without interpolation",
			source:   "export const S = { msg: `hello world` };",
			wantName: "S",
			want: map[string]Value{
				"msg": "hello world",
			},
		},
		{
			name:     "negative number",
			source:   `export const N = { temp: -10, ratio: -0.25 };`,
			wantName: "N",
			want: map[string]Value{
				"temp":  float64(-10),
				"ratio": -0.25,
			},
		},
		{
			name:     "empty object and array",
			source:   `export const E = { items: [], meta: {} };`,
			wantName: "E",
			want: map[string]Value{
				"items": []Value{},
				"meta":  map[string]Value{},
			},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := ParseExportConst([]byte(c.source))
			if err != nil {
				t.Fatalf("ParseExportConst() unexpected error: %v", err)
			}
			if got.Name != c.wantName {
				t.Errorf("Name = %q, want %q", got.Name, c.wantName)
			}
			if !reflect.DeepEqual(got.Value, c.want) {
				t.Errorf("Value mismatch:\n got = %#v\nwant = %#v", got.Value, c.want)
			}
		})
	}
}

func TestParseExportConst_Rejections(t *testing.T) {
	type tc struct {
		name      string
		source    string
		wantErrIn string // substring expected to appear in error message
	}
	cases := []tc{
		{
			name:      "template literal interpolation",
			source:    "export const X = { msg: `hello ${name}` };",
			wantErrIn: "template",
		},
		{
			name:      "as const assertion",
			source:    `export const X = { kind: "a" } as const;`,
			wantErrIn: "as const",
		},
		{
			name:      "satisfies assertion",
			source:    `export const X = { a: 1 } satisfies Foo;`,
			wantErrIn: "satisfies",
		},
		{
			name:      "as type assertion",
			source:    `export const X = { a: 1 } as Foo;`,
			wantErrIn: "as ",
		},
		{
			name:      "function call as value",
			source:    `export const X = { a: makeThing() };`,
			wantErrIn: "function",
		},
		{
			name:      "spread operator",
			source:    `export const X = { ...base, a: 1 };`,
			wantErrIn: "spread",
		},
		{
			name:      "missing export keyword",
			source:    `const X = { a: 1 };`,
			wantErrIn: "export",
		},
		{
			name:      "missing const keyword",
			source:    `export let X = { a: 1 };`,
			wantErrIn: "const",
		},
		{
			name:      "missing equals",
			source:    `export const X { a: 1 };`,
			wantErrIn: "=",
		},
		{
			name:      "non-literal identifier value",
			source:    `export const X = { ref: someVariable };`,
			wantErrIn: "identifier",
		},
		{
			name:      "unterminated string",
			source:    `export const X = { a: "unterminated };`,
			wantErrIn: "string",
		},
		{
			name:      "unclosed object",
			source:    `export const X = { a: 1 ;`,
			wantErrIn: "}",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, err := ParseExportConst([]byte(c.source))
			if err == nil {
				t.Fatalf("ParseExportConst() error = nil, want error containing %q", c.wantErrIn)
			}
			if !strings.Contains(err.Error(), c.wantErrIn) {
				t.Errorf("error %q does not contain %q", err.Error(), c.wantErrIn)
			}
		})
	}
}
