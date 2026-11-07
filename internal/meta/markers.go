package meta

import "regexp"

var showMarkerRe = regexp.MustCompile(`<!--\s*shows:\s*(\S+?)\s*-->`)

// ShowMarkers returns the entries of every `<!-- shows: loc:convinced -->`
// comment in body, in order of appearance, duplicates kept. The order is the
// order the reader actually meets them (docs/clarity.md).
func ShowMarkers(body string) []string {
	var out []string
	for _, m := range showMarkerRe.FindAllStringSubmatch(body, -1) {
		out = append(out, m[1])
	}
	return out
}
