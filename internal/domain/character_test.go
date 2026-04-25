package domain_test

import (
	"testing"

	"github.com/takets/street-storyteller/internal/domain"
)

func TestCharacter_ZeroValue(t *testing.T) {
	var c domain.Character
	if c.ID != "" || c.Name != "" {
		t.Fatalf("zero value should have empty strings, got ID=%q Name=%q", c.ID, c.Name)
	}
	if c.Traits != nil {
		t.Fatalf("zero value Traits should be nil, got %#v", c.Traits)
	}
	if c.Details != nil {
		t.Fatalf("zero value Details should be nil pointer, got %#v", c.Details)
	}
}

func TestCharacter_RequiredFields(t *testing.T) {
	c := domain.Character{
		ID:                "hero",
		Name:              "勇者",
		Role:              domain.RoleProtagonist,
		Traits:            []string{"勇敢", "正義感"},
		Relationships:     map[string]domain.RelationType{"villain": domain.RelationEnemy},
		AppearingChapters: []string{"chapter_01", "chapter_02"},
		Summary:           "物語の主人公",
	}
	if c.ID != "hero" {
		t.Errorf("ID mismatch: %q", c.ID)
	}
	if c.Role != domain.RoleProtagonist {
		t.Errorf("Role mismatch: %q", c.Role)
	}
	if len(c.Traits) != 2 {
		t.Errorf("Traits length mismatch: %d", len(c.Traits))
	}
	if c.Relationships["villain"] != domain.RelationEnemy {
		t.Errorf("Relationships missing villain entry")
	}
	if len(c.AppearingChapters) != 2 {
		t.Errorf("AppearingChapters length mismatch: %d", len(c.AppearingChapters))
	}
}

func TestCharacterRole_Constants(t *testing.T) {
	cases := []struct {
		role domain.CharacterRole
		want string
	}{
		{domain.RoleProtagonist, "protagonist"},
		{domain.RoleAntagonist, "antagonist"},
		{domain.RoleSupporting, "supporting"},
		{domain.RoleGuest, "guest"},
	}
	for _, tc := range cases {
		if string(tc.role) != tc.want {
			t.Errorf("CharacterRole %q: got %q want %q", tc.want, string(tc.role), tc.want)
		}
	}
}

func TestRelationType_Constants(t *testing.T) {
	cases := []struct {
		rel  domain.RelationType
		want string
	}{
		{domain.RelationAlly, "ally"},
		{domain.RelationEnemy, "enemy"},
		{domain.RelationNeutral, "neutral"},
		{domain.RelationRomantic, "romantic"},
		{domain.RelationRespect, "respect"},
		{domain.RelationCompetitive, "competitive"},
		{domain.RelationMentor, "mentor"},
	}
	for _, tc := range cases {
		if string(tc.rel) != tc.want {
			t.Errorf("RelationType %q: got %q want %q", tc.want, string(tc.rel), tc.want)
		}
	}
}

func TestCharacter_OptionalDetails(t *testing.T) {
	details := &domain.CharacterDetails{
		Development: &domain.CharacterDevelopment{
			Initial:  "村の青年",
			Goal:     "魔王を倒す",
			Obstacle: "未熟な力",
		},
	}
	details.Description.Value = "総合的な紹介文"
	details.Appearance.File = "details/hero/appearance.md"
	details.Personality.Value = "正義感が強い"
	details.Backstory.File = "details/hero/backstory.md"

	c := domain.Character{
		ID:      "hero",
		Name:    "勇者",
		Role:    domain.RoleProtagonist,
		Summary: "概要",
		Details: details,
	}
	if c.Details == nil {
		t.Fatal("Details should not be nil")
	}
	if c.Details.Description.Value != "総合的な紹介文" {
		t.Errorf("Description.Value mismatch: %q", c.Details.Description.Value)
	}
	if c.Details.Appearance.File == "" {
		t.Errorf("Appearance.File should be set")
	}
	if c.Details.Development == nil || c.Details.Development.Goal != "魔王を倒す" {
		t.Errorf("Development.Goal mismatch")
	}
}

func TestCharacter_OptionalSlicesAndHints(t *testing.T) {
	c := domain.Character{
		ID:           "hero",
		Name:         "勇者",
		Role:         domain.RoleProtagonist,
		Summary:      "概要",
		DisplayNames: []string{"勇者", "若者"},
		Aliases:      []string{"剣の使い手"},
		Pronouns:     []string{"彼"},
		DetectionHints: &domain.CharacterDetectionHints{
			CommonPatterns:  []string{"勇者は", "勇者が"},
			ExcludePatterns: []string{"伝説の勇者"},
			Confidence:      0.9,
		},
	}
	if len(c.DisplayNames) != 2 {
		t.Errorf("DisplayNames length mismatch")
	}
	if c.DetectionHints == nil {
		t.Fatal("DetectionHints should not be nil")
	}
	if c.DetectionHints.Confidence != 0.9 {
		t.Errorf("Confidence mismatch: %v", c.DetectionHints.Confidence)
	}
}

func TestCharacter_OptionalNilDetails(t *testing.T) {
	// Why: ハイブリッド方式では Details なしでも有効な Character として成立すること
	c := domain.Character{
		ID:      "hero",
		Name:    "勇者",
		Role:    domain.RoleProtagonist,
		Summary: "概要",
	}
	if c.Details != nil {
		t.Errorf("Details should remain nil when not set")
	}
	if c.DisplayNames != nil {
		t.Errorf("DisplayNames should remain nil when not set")
	}
}
