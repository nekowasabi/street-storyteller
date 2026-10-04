package meta

import "strings"

// SplitFrontmatter splits a markdown document into frontmatter YAML text and body.
// Returns (fmText, bodyText, hasFrontmatter).
// fmText is the raw content between the --- delimiters (without the delimiters themselves).
// bodyText is everything after the closing --- (including the leading newline if present).
func SplitFrontmatter(content string) (fm, body string, hasFM bool) {
	if !strings.HasPrefix(content, "---\n") {
		return "", content, false
	}
	rest := content[4:] // skip opening "---\n"
	idx := strings.Index(rest, "\n---\n")
	if idx < 0 {
		// Closing delimiter not found — treat whole file as body.
		return "", content, false
	}
	fm = rest[:idx+1]   // include trailing newline of last FM line
	body = rest[idx+5:] // skip "\n---\n"
	return fm, body, true
}

// ParseList extracts the YAML sequence for key from a frontmatter string.
// It handles both block sequences (- item) and inline sequences ([a,b]).
// Why: a minimal bespoke parser avoids adding a YAML dependency while covering
// the subset of YAML that storyteller manuscripts use.
func ParseList(fm, key string) []string {
	lines := strings.Split(fm, "\n")
	var result []string

	inList := false
	for _, line := range lines {
		if inList {
			stripped := strings.TrimSpace(line)
			if strings.HasPrefix(stripped, "- ") {
				result = append(result, unquote(strings.TrimSpace(strings.TrimPrefix(stripped, "- "))))
				continue
			}
			// Another top-level key or empty — list ended.
			break
		}
		// Check for "key:" or "key: [...]"
		prefix := key + ":"
		if strings.HasPrefix(strings.TrimSpace(line), prefix) {
			val := strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(line), prefix))
			if val == "" {
				// Block sequence follows.
				inList = true
				continue
			}
			// Inline sequence: [a, b, c]
			val = strings.Trim(val, "[]")
			for _, part := range strings.Split(val, ",") {
				part = strings.TrimSpace(part)
				if part != "" {
					result = append(result, unquote(part))
				}
			}
			return result
		}
	}
	return result
}
