package textlint

import (
	"encoding/json"

	apperrors "github.com/takets/street-storyteller/internal/errors"
)

// rawTextlintFile is the per-file shape produced by `textlint --format json`.
type rawTextlintFile struct {
	FilePath string    `json:"filePath"`
	Messages []Message `json:"messages"`
}

// Parse decodes textlint's --format json output into a flat []Message slice.
//
// Why: flatten across files at the parser layer — the LSP/MCP layers always
// operate per-document anyway, so callers shouldn't have to re-iterate the
// outer file array.
func Parse(output []byte) ([]Message, error) {
	if len(output) == 0 {
		return []Message{}, nil
	}
	var files []rawTextlintFile
	if err := json.Unmarshal(output, &files); err != nil {
		return nil, apperrors.Wrap(err, apperrors.CodeParse, "textlint json")
	}
	out := []Message{}
	for _, f := range files {
		out = append(out, f.Messages...)
	}
	return out, nil
}
