package domain_test

import (
	"testing"

	"github.com/takets/street-storyteller/internal/domain"
)

func TestCharacterStateSnapshot_ZeroValue(t *testing.T) {
	var s domain.CharacterStateSnapshot
	if s.CharacterID != "" {
		t.Fatalf("zero value CharacterID should be empty, got %q", s.CharacterID)
	}
	if s.PhaseID != nil {
		t.Fatalf("zero value PhaseID should be nil, got %v", *s.PhaseID)
	}
}

func TestCharacterStateSnapshot_RequiredFields(t *testing.T) {
	phaseID := "awakening"
	s := domain.CharacterStateSnapshot{
		CharacterID:   "hero",
		PhaseID:       &phaseID,
		PhaseName:     "覚醒期",
		ResolvedAt:    "2026-04-25T22:00:00Z",
		Traits:        []string{"勇敢"},
		Beliefs:       []string{"正義"},
		Abilities:     []string{"剣術"},
		Relationships: map[string]domain.RelationType{"mentor1": domain.RelationMentor},
		Appearance:    []string{"短い髪"},
		Status:        domain.StatusDelta{Physical: "健康"},
		Goals:         []string{"修行"},
		Summary:       "覚醒後の主人公",
		BaseCharacter: domain.BaseCharacterRef{
			ID:   "hero",
			Name: "勇者",
			Role: domain.RoleProtagonist,
		},
	}
	if s.CharacterID != "hero" {
		t.Errorf("CharacterID mismatch")
	}
	if s.PhaseID == nil || *s.PhaseID != "awakening" {
		t.Errorf("PhaseID mismatch")
	}
	if s.BaseCharacter.Role != domain.RoleProtagonist {
		t.Errorf("BaseCharacter.Role mismatch")
	}
}

func TestCharacterStateSnapshot_NilPhaseIDForInitial(t *testing.T) {
	// Why: TS の `phaseId: string | null` で初期状態を表すため、Go では *string=nil を採用
	s := domain.CharacterStateSnapshot{
		CharacterID: "hero",
		PhaseID:     nil,
		PhaseName:   "initial",
	}
	if s.PhaseID != nil {
		t.Errorf("PhaseID should be nil for initial state")
	}
}

func TestPhaseDiffResult_Fields(t *testing.T) {
	from := "phase_a"
	r := domain.PhaseDiffResult{
		FromPhaseID:   &from,
		ToPhaseID:     "phase_b",
		FromPhaseName: "A",
		ToPhaseName:   "B",
		Changes: domain.PhaseDiffChanges{
			Traits:    domain.StringDiff{Added: []string{"new"}, Removed: []string{"old"}},
			Beliefs:   domain.StringDiff{},
			Abilities: domain.StringDiff{},
			Relationships: domain.RelationshipsDiff{
				Added:   map[string]domain.RelationType{"x": domain.RelationAlly},
				Removed: []string{"y"},
				Changed: map[string]domain.RelationChange{
					"z": {From: domain.RelationNeutral, To: domain.RelationEnemy},
				},
			},
			Appearance: domain.StringDiff{},
			Status: domain.StatusDiff{
				Physical: &domain.StringFromTo{From: stringPtr("健康"), To: stringPtr("負傷")},
			},
			Goals: domain.StringDiff{},
			Summary: &domain.StringFromTo{
				From: stringPtr("旧サマリー"),
				To:   stringPtr("新サマリー"),
			},
		},
	}
	if r.ToPhaseID != "phase_b" {
		t.Errorf("ToPhaseID mismatch")
	}
	if len(r.Changes.Traits.Added) != 1 {
		t.Errorf("Traits.Added mismatch")
	}
	if r.Changes.Status.Physical == nil || r.Changes.Status.Physical.To == nil {
		t.Fatalf("Status.Physical.To mismatch")
	}
	if *r.Changes.Status.Physical.To != "負傷" {
		t.Errorf("Status.Physical.To value mismatch")
	}
}

func TestPhaseTimelineEntry_Fields(t *testing.T) {
	transition := "turning_point"
	importance := "major"
	startCh := "chapter_03"
	trigger := "event_001"
	phaseID := "awakening"
	e := domain.PhaseTimelineEntry{
		PhaseID:        &phaseID,
		PhaseName:      "覚醒期",
		Order:          1,
		Summary:        "勇者が力に目覚める",
		TransitionType: &transition,
		Importance:     &importance,
		StartChapter:   &startCh,
		TriggerEventID: &trigger,
		KeyChanges:     []string{"力の覚醒"},
	}
	if e.Order != 1 {
		t.Errorf("Order mismatch")
	}
	if len(e.KeyChanges) != 1 {
		t.Errorf("KeyChanges length mismatch")
	}
}

func stringPtr(s string) *string { return &s }
