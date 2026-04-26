package prompts

type Prompt struct {
	Name        string
	Description string
}

func List() []Prompt {
	return []Prompt{
		{Name: "character_brainstorm", Description: "Brainstorm a character"},
		{Name: "plot_suggestion", Description: "Suggest plot developments"},
		{Name: "scene_improvement", Description: "Improve a scene"},
		{Name: "project_setup_wizard", Description: "Guide project setup"},
		{Name: "chapter_review", Description: "Review a chapter"},
		{Name: "consistency_fix", Description: "Fix consistency issues"},
		{Name: "timeline_brainstorm", Description: "Brainstorm timeline events"},
		{Name: "event_detail_suggest", Description: "Suggest event details"},
		{Name: "causality_analysis", Description: "Analyze causality"},
		{Name: "timeline_consistency_check", Description: "Check timeline consistency"},
	}
}
