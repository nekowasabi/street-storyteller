package domain_test

import (
	"testing"

	"github.com/takets/street-storyteller/internal/domain"
)

func TestCharacterPhase_ZeroValue(t *testing.T) {
	var p domain.CharacterPhase
	if p.ID != "" || p.Name != "" || p.Order != 0 {
		t.Fatalf("zero value mismatch: %#v", p)
	}
	if p.Details != nil {
		t.Fatalf("zero value Details should be nil, got %#v", p.Details)
	}
}

func TestCharacterPhase_RequiredFields(t *testing.T) {
	p := domain.CharacterPhase{
		ID:      "awakening",
		Name:    "覚醒期",
		Order:   1,
		Summary: "勇者が力に目覚める段階",
		Delta: domain.CharacterStateDelta{
			Traits: &domain.ArrayDelta{
				Add: []string{"覚醒した力"},
			},
			Summary: "覚醒後の主人公",
		},
	}
	if p.ID != "awakening" {
		t.Errorf("ID mismatch: %q", p.ID)
	}
	if p.Order != 1 {
		t.Errorf("Order mismatch: %d", p.Order)
	}
	if p.Delta.Traits == nil || len(p.Delta.Traits.Add) != 1 {
		t.Errorf("Delta.Traits.Add mismatch")
	}
}

func TestPhaseImportance_Constants(t *testing.T) {
	cases := []struct {
		v    domain.PhaseImportance
		want string
	}{
		{domain.PhaseImportanceMajor, "major"},
		{domain.PhaseImportanceMinor, "minor"},
		{domain.PhaseImportanceSubtle, "subtle"},
	}
	for _, tc := range cases {
		if string(tc.v) != tc.want {
			t.Errorf("PhaseImportance %q: got %q", tc.want, string(tc.v))
		}
	}
}

func TestTransitionType_Constants(t *testing.T) {
	cases := []struct {
		v    domain.TransitionType
		want string
	}{
		{domain.TransitionGradual, "gradual"},
		{domain.TransitionTurningPoint, "turning_point"},
		{domain.TransitionRevelation, "revelation"},
		{domain.TransitionRegression, "regression"},
		{domain.TransitionTransformation, "transformation"},
	}
	for _, tc := range cases {
		if string(tc.v) != tc.want {
			t.Errorf("TransitionType %q: got %q", tc.want, string(tc.v))
		}
	}
}

func TestCharacterPhase_OptionalFields(t *testing.T) {
	importance := domain.PhaseImportanceMajor
	transition := domain.TransitionTurningPoint
	triggerEvent := "event_001"
	timelineID := "main_story"
	startCh := "chapter_03"
	endCh := "chapter_05"

	details := &domain.PhaseDetails{}
	details.Description.Value = "覚醒の詳細"
	details.InternalChange.File = "details/phases/awakening_internal.md"

	p := domain.CharacterPhase{
		ID:             "awakening",
		Name:           "覚醒期",
		Order:          1,
		Summary:        "勇者が力に目覚める段階",
		Delta:          domain.CharacterStateDelta{},
		TransitionType: &transition,
		Importance:     &importance,
		TriggerEventID: &triggerEvent,
		TimelineID:     &timelineID,
		StartChapter:   &startCh,
		EndChapter:     &endCh,
		Details:        details,
		DisplayNames:   []string{"覚醒者"},
	}
	if p.Importance == nil || *p.Importance != domain.PhaseImportanceMajor {
		t.Errorf("Importance mismatch")
	}
	if p.TransitionType == nil || *p.TransitionType != domain.TransitionTurningPoint {
		t.Errorf("TransitionType mismatch")
	}
	if p.Details == nil || p.Details.Description.Value != "覚醒の詳細" {
		t.Errorf("Details.Description mismatch")
	}
}

func TestArrayDelta_AllFields(t *testing.T) {
	d := domain.ArrayDelta{
		Add:    []string{"new"},
		Remove: []string{"old"},
		Modify: map[string]string{"foo": "bar"},
	}
	if len(d.Add) != 1 || len(d.Remove) != 1 || d.Modify["foo"] != "bar" {
		t.Errorf("ArrayDelta mismatch: %#v", d)
	}
}

func TestCharacterStateDelta_RelationshipsDelta(t *testing.T) {
	d := domain.CharacterStateDelta{
		Relationships: &domain.RelationshipsDelta{
			Add:    map[string]domain.RelationType{"ally1": domain.RelationAlly},
			Remove: []string{"ally2"},
			Change: map[string]domain.RelationType{"npc1": domain.RelationEnemy},
		},
	}
	if d.Relationships.Add["ally1"] != domain.RelationAlly {
		t.Errorf("RelationshipsDelta.Add mismatch")
	}
}

func TestCharacterInitialState_Fields(t *testing.T) {
	is := domain.CharacterInitialState{
		Traits:        []string{"勇敢"},
		Beliefs:       []string{"正義"},
		Abilities:     []string{"剣術"},
		Relationships: map[string]domain.RelationType{"mentor1": domain.RelationMentor},
		Appearance:    []string{"短い髪"},
		Status: &domain.StatusDelta{
			Physical: "健康",
			Mental:   "前向き",
		},
		Goals: []string{"修行"},
	}
	if len(is.Traits) != 1 {
		t.Errorf("Traits mismatch")
	}
	if is.Status == nil || is.Status.Physical != "健康" {
		t.Errorf("Status.Physical mismatch")
	}
}
