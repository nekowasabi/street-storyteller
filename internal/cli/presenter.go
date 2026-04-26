package cli

import (
	"encoding/json"
	"fmt"
	"io"
)

// textPresenter writes human-readable lines, routing info/success to stdout
// and warning/error to stderr.
type textPresenter struct {
	stdout io.Writer
	stderr io.Writer
}

// NewTextPresenter constructs a Presenter that writes plain text.
func NewTextPresenter(stdout, stderr io.Writer) Presenter {
	return &textPresenter{stdout: stdout, stderr: stderr}
}

func (p *textPresenter) ShowInfo(msg string)    { fmt.Fprintln(p.stdout, msg) }
func (p *textPresenter) ShowSuccess(msg string) { fmt.Fprintln(p.stdout, msg) }
func (p *textPresenter) ShowWarning(msg string) { fmt.Fprintln(p.stderr, msg) }
func (p *textPresenter) ShowError(msg string)   { fmt.Fprintln(p.stderr, msg) }

// WriteJSON encodes payload as a single deterministic JSON line.
//
// Why: textPresenter still implements WriteJSON so callers can opt into
// structured output without switching presenter types — the underlying writer
// is stdout in both modes.
func (p *textPresenter) WriteJSON(payload any) error {
	return writeJSONLine(p.stdout, payload)
}

// jsonPresenter emits one JSON object per call to stdout.
type jsonPresenter struct {
	stdout io.Writer
}

// NewJSONPresenter constructs a Presenter that emits one JSON object per
// call, terminated by a newline.
func NewJSONPresenter(stdout io.Writer) Presenter {
	return &jsonPresenter{stdout: stdout}
}

// jsonMessage is the deterministic envelope for level/msg events.
//
// Why: an explicit struct (over map[string]any) gives us deterministic key
// ordering ("level" before "msg") via field declaration order — encoding/json
// emits struct fields in declaration order, while map iteration is unordered.
type jsonMessage struct {
	Level string `json:"level"`
	Msg   string `json:"msg"`
}

func (p *jsonPresenter) ShowInfo(msg string) {
	_ = writeJSONLine(p.stdout, jsonMessage{Level: "info", Msg: msg})
}
func (p *jsonPresenter) ShowSuccess(msg string) {
	_ = writeJSONLine(p.stdout, jsonMessage{Level: "success", Msg: msg})
}
func (p *jsonPresenter) ShowWarning(msg string) {
	_ = writeJSONLine(p.stdout, jsonMessage{Level: "warning", Msg: msg})
}
func (p *jsonPresenter) ShowError(msg string) {
	_ = writeJSONLine(p.stdout, jsonMessage{Level: "error", Msg: msg})
}

func (p *jsonPresenter) WriteJSON(payload any) error {
	return writeJSONLine(p.stdout, payload)
}

func writeJSONLine(w io.Writer, payload any) error {
	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	b = append(b, '\n')
	_, err = w.Write(b)
	return err
}
