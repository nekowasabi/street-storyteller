package resources

import "strings"

type Resource struct {
	URI  string
	Name string
}

func List() []Resource {
	return []Resource{
		{URI: "storyteller://project", Name: "project"},
		{URI: "storyteller://characters", Name: "characters"},
		{URI: "storyteller://settings", Name: "settings"},
		{URI: "storyteller://timelines", Name: "timelines"},
		{URI: "storyteller://foreshadowings", Name: "foreshadowings"},
		{URI: "storyteller://plots", Name: "plots"},
	}
}

func ParseURI(uri string) (kind string, id string, expandDetails bool) {
	parts := strings.Split(strings.TrimPrefix(uri, "storyteller://"), "?")
	if len(parts) > 1 && strings.Contains(parts[1], "expand=details") {
		expandDetails = true
	}
	path := strings.Split(parts[0], "/")
	kind = path[0]
	if len(path) > 1 {
		id = path[1]
	}
	return kind, id, expandDetails
}
