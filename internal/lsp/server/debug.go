package server

import (
	"fmt"
	"io"
	"os"
)

func debugEnabled() bool {
	return os.Getenv("STORYTELLER_LSP_DEBUG") != ""
}

func debugf(w io.Writer, format string, args ...any) {
	if !debugEnabled() || w == nil {
		return
	}
	_, _ = fmt.Fprintf(w, "[storyteller-lsp] "+format+"\n", args...)
}
