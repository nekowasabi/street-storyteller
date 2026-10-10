package tools

import (
	"context"
	"encoding/json"
	"regexp"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/mcp/protocol"
)

func TestCreateToolsNonASCIIIDs(t *testing.T) {
	type handler interface {
		Handle(context.Context, json.RawMessage, ExecutionContext) (*protocol.CallToolResult, error)
	}
	for _, tc := range []struct {
		name string
		tool handler
		args map[string]string
	}{
		{"element", ElementCreateTool{}, map[string]string{"kind": "character", "summary": "説明"}},
		{"timeline", TimelineCreateTool{}, map[string]string{"scope": "story", "summary": "説明"}},
		{"beat", BeatCreateTool{}, map[string]string{"plot_id": "main", "summary": "説明"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			seen := map[string]string{}
			for _, name := range []string{"勇者", "魔王", "😀", "!!!", strings.Repeat("物語", 30) + "甲", strings.Repeat("物語", 30) + "乙"} {
				tc.args["name"], tc.args["title"] = name, name
				raw, _ := json.Marshal(tc.args)
				readID := func() string {
					t.Helper()
					res, err := tc.tool.Handle(context.Background(), raw, ExecutionContext{})
					if err != nil || res == nil || res.IsError {
						t.Fatalf("Handle: %v, %+v", err, res)
					}
					text := res.Content[0].Text
					if tc.name == "element" {
						_, tail, _ := strings.Cut(text, " id=")
						id, _, _ := strings.Cut(tail, " name=")
						return id
					}
					_, body, _ := strings.Cut(text, "\n")
					var obj struct {
						ID string `json:"id"`
					}
					if err := json.Unmarshal([]byte(body), &obj); err != nil {
						t.Fatal(err)
					}
					return obj.ID
				}
				id := readID()
				if !regexp.MustCompile(`^[a-z0-9_]+$`).MatchString(id) {
					t.Errorf("%q generated invalid ID %q", name, id)
				}
				if previous, ok := seen[id]; ok {
					t.Errorf("%q and %q generated same ID %q", previous, name, id)
				}
				seen[id] = name
				if again := readID(); again != id {
					t.Errorf("unstable ID: %q then %q", id, again)
				}
			}
		})
	}
}

func TestCreateIDFallbackPreservesASCIISlugs(t *testing.T) {
	for _, tc := range []struct {
		name string
		slug func(string) string
		want string
	}{
		{"element", slugify, "great_hero"},
		{"timeline", timelineSlugify, "great_hero"},
		{"beat", sanitizeID, "great_hero"},
	} {
		if got := tc.slug("Great Hero"); got != tc.want {
			t.Errorf("%s: got %q, want %q", tc.name, got, tc.want)
		}
	}
	if got := sanitizeID("abcdefghijklmnopqrstuvwxyz"); got != "abcdefghijklmnopqrst" {
		t.Errorf("ASCII truncation changed: %q", got)
	}
}
