package store

import (
	stderrors "errors"
	"testing"

	"github.com/takets/street-storyteller/internal/domain"
	apperrors "github.com/takets/street-storyteller/internal/errors"
)

func mustErrorCode(t *testing.T, err error, code apperrors.Code) {
	t.Helper()
	if err == nil {
		t.Fatalf("expected error with code %q, got nil", code)
	}
	var ae *apperrors.Error
	if !stderrors.As(err, &ae) {
		t.Fatalf("expected *apperrors.Error, got %T (%v)", err, err)
	}
	if ae.Code != code {
		t.Fatalf("expected code %q, got %q (msg=%s)", code, ae.Code, ae.Message)
	}
}

func TestStore_AddAndGet_Character(t *testing.T) {
	s := New()
	c := &domain.Character{ID: "hero", Name: "勇者"}
	if err := s.AddCharacter(c); err != nil {
		t.Fatalf("AddCharacter: %v", err)
	}
	got, err := s.Character("hero")
	if err != nil {
		t.Fatalf("Character: %v", err)
	}
	if got != c {
		t.Fatalf("expected same pointer back, got %p vs %p", got, c)
	}
}

func TestStore_AddAndGet_Setting(t *testing.T) {
	s := New()
	v := &domain.Setting{ID: "royal_capital", Name: "王都"}
	if err := s.AddSetting(v); err != nil {
		t.Fatalf("AddSetting: %v", err)
	}
	got, err := s.Setting("royal_capital")
	if err != nil {
		t.Fatalf("Setting: %v", err)
	}
	if got != v {
		t.Fatalf("pointer mismatch")
	}
}

func TestStore_AddAndGet_Foreshadowing(t *testing.T) {
	s := New()
	f := &domain.Foreshadowing{ID: "ancient_sword", Name: "古びた剣"}
	if err := s.AddForeshadowing(f); err != nil {
		t.Fatalf("AddForeshadowing: %v", err)
	}
	got, err := s.Foreshadowing("ancient_sword")
	if err != nil {
		t.Fatalf("Foreshadowing: %v", err)
	}
	if got != f {
		t.Fatalf("pointer mismatch")
	}
}

func TestStore_AddAndGet_Timeline(t *testing.T) {
	s := New()
	tl := &domain.Timeline{ID: "main", Name: "メインストーリー"}
	if err := s.AddTimeline(tl); err != nil {
		t.Fatalf("AddTimeline: %v", err)
	}
	got, err := s.Timeline("main")
	if err != nil {
		t.Fatalf("Timeline: %v", err)
	}
	if got != tl {
		t.Fatalf("pointer mismatch")
	}
}

func TestStore_AddAndGet_Plot(t *testing.T) {
	s := New()
	p := &domain.Plot{ID: "love_story", Name: "恋愛軸"}
	if err := s.AddPlot(p); err != nil {
		t.Fatalf("AddPlot: %v", err)
	}
	got, err := s.Plot("love_story")
	if err != nil {
		t.Fatalf("Plot: %v", err)
	}
	if got != p {
		t.Fatalf("pointer mismatch")
	}
}

func TestStore_AddAndGet_CharacterPhase(t *testing.T) {
	s := New()
	ph := &domain.CharacterPhase{ID: "phase_awakening", Name: "覚醒"}
	if err := s.AddCharacterPhase(ph); err != nil {
		t.Fatalf("AddCharacterPhase: %v", err)
	}
	got, err := s.CharacterPhase("phase_awakening")
	if err != nil {
		t.Fatalf("CharacterPhase: %v", err)
	}
	if got != ph {
		t.Fatalf("pointer mismatch")
	}
}

func TestStore_DuplicateID_ReturnsEntityConflict(t *testing.T) {
	s := New()
	if err := s.AddCharacter(&domain.Character{ID: "hero", Name: "勇者"}); err != nil {
		t.Fatal(err)
	}
	err := s.AddCharacter(&domain.Character{ID: "hero", Name: "別の勇者"})
	mustErrorCode(t, err, apperrors.CodeEntityConflict)

	if err := s.AddSetting(&domain.Setting{ID: "city", Name: "都"}); err != nil {
		t.Fatal(err)
	}
	mustErrorCode(t, s.AddSetting(&domain.Setting{ID: "city", Name: "別都"}), apperrors.CodeEntityConflict)

	if err := s.AddForeshadowing(&domain.Foreshadowing{ID: "f", Name: "f"}); err != nil {
		t.Fatal(err)
	}
	mustErrorCode(t, s.AddForeshadowing(&domain.Foreshadowing{ID: "f", Name: "f2"}), apperrors.CodeEntityConflict)

	if err := s.AddTimeline(&domain.Timeline{ID: "t", Name: "t"}); err != nil {
		t.Fatal(err)
	}
	mustErrorCode(t, s.AddTimeline(&domain.Timeline{ID: "t", Name: "t2"}), apperrors.CodeEntityConflict)

	if err := s.AddPlot(&domain.Plot{ID: "p", Name: "p"}); err != nil {
		t.Fatal(err)
	}
	mustErrorCode(t, s.AddPlot(&domain.Plot{ID: "p", Name: "p2"}), apperrors.CodeEntityConflict)

	if err := s.AddCharacterPhase(&domain.CharacterPhase{ID: "ph", Name: "ph"}); err != nil {
		t.Fatal(err)
	}
	mustErrorCode(t, s.AddCharacterPhase(&domain.CharacterPhase{ID: "ph", Name: "ph2"}), apperrors.CodeEntityConflict)
}

func TestStore_MissingID_ReturnsNotFound(t *testing.T) {
	s := New()
	_, err := s.Character("missing")
	mustErrorCode(t, err, apperrors.CodeNotFound)
	_, err = s.Setting("missing")
	mustErrorCode(t, err, apperrors.CodeNotFound)
	_, err = s.Foreshadowing("missing")
	mustErrorCode(t, err, apperrors.CodeNotFound)
	_, err = s.Timeline("missing")
	mustErrorCode(t, err, apperrors.CodeNotFound)
	_, err = s.Plot("missing")
	mustErrorCode(t, err, apperrors.CodeNotFound)
	_, err = s.CharacterPhase("missing")
	mustErrorCode(t, err, apperrors.CodeNotFound)
}

func TestStore_FindByName_PrimaryName(t *testing.T) {
	s := New()
	c := &domain.Character{ID: "hero", Name: "勇者"}
	if err := s.AddCharacter(c); err != nil {
		t.Fatal(err)
	}
	got, err := s.FindByName(KindCharacter, "勇者")
	if err != nil {
		t.Fatalf("FindByName: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("expected 1 hit, got %d", len(got))
	}
	if got[0].(*domain.Character) != c {
		t.Fatalf("pointer mismatch")
	}
}

func TestStore_FindByName_DisplayNameMatch(t *testing.T) {
	s := New()
	c := &domain.Character{ID: "hero", Name: "Hero", DisplayNames: []string{"勇者", "若き戦士"}}
	if err := s.AddCharacter(c); err != nil {
		t.Fatal(err)
	}
	got, err := s.FindByName(KindCharacter, "若き戦士")
	if err != nil {
		t.Fatalf("FindByName: %v", err)
	}
	if len(got) != 1 || got[0].(*domain.Character) != c {
		t.Fatalf("expected hero via displayName, got %v", got)
	}
}

func TestStore_FindByName_AliasMatch_Character(t *testing.T) {
	s := New()
	c := &domain.Character{ID: "hero", Name: "Hero", Aliases: []string{"勇さん"}}
	if err := s.AddCharacter(c); err != nil {
		t.Fatal(err)
	}
	got, err := s.FindByName(KindCharacter, "勇さん")
	if err != nil {
		t.Fatalf("FindByName: %v", err)
	}
	if len(got) != 1 || got[0].(*domain.Character) != c {
		t.Fatalf("expected match by alias")
	}
}

func TestStore_FindByName_MultipleHits(t *testing.T) {
	s := New()
	a := &domain.Character{ID: "a", Name: "光"}
	b := &domain.Character{ID: "b", Name: "光"}
	if err := s.AddCharacter(a); err != nil {
		t.Fatal(err)
	}
	if err := s.AddCharacter(b); err != nil {
		t.Fatal(err)
	}
	got, err := s.FindByName(KindCharacter, "光")
	if err != nil {
		t.Fatalf("FindByName: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("expected 2 hits, got %d", len(got))
	}
	// 挿入順保持を期待
	if got[0].(*domain.Character) != a || got[1].(*domain.Character) != b {
		t.Fatalf("expected insertion order [a, b]")
	}
}

func TestStore_FindByName_NoMatch_ReturnsEmpty(t *testing.T) {
	s := New()
	if err := s.AddCharacter(&domain.Character{ID: "hero", Name: "勇者"}); err != nil {
		t.Fatal(err)
	}
	got, err := s.FindByName(KindCharacter, "存在しない名前")
	if err != nil {
		t.Fatalf("FindByName should not error on no-match: %v", err)
	}
	if len(got) != 0 {
		t.Fatalf("expected empty slice, got %d", len(got))
	}
}

func TestStore_FindByName_Setting_NoAliasField(t *testing.T) {
	s := New()
	v := &domain.Setting{ID: "rc", Name: "王都", DisplayNames: []string{"王の都"}}
	if err := s.AddSetting(v); err != nil {
		t.Fatal(err)
	}
	got, err := s.FindByName(KindSetting, "王の都")
	if err != nil {
		t.Fatalf("FindByName: %v", err)
	}
	if len(got) != 1 || got[0].(*domain.Setting) != v {
		t.Fatalf("expected setting via displayName")
	}
}

func TestStore_FindByName_AcrossAllKinds(t *testing.T) {
	s := New()
	if err := s.AddForeshadowing(&domain.Foreshadowing{ID: "f", Name: "予言", DisplayNames: []string{"古き予言"}}); err != nil {
		t.Fatal(err)
	}
	if err := s.AddTimeline(&domain.Timeline{ID: "t", Name: "本編", DisplayNames: []string{"メイン"}}); err != nil {
		t.Fatal(err)
	}
	if err := s.AddPlot(&domain.Plot{ID: "p", Name: "恋愛", DisplayNames: []string{"ロマンス"}}); err != nil {
		t.Fatal(err)
	}
	if err := s.AddCharacterPhase(&domain.CharacterPhase{ID: "ph", Name: "覚醒", DisplayNames: []string{"目覚め"}}); err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		kind Kind
		name string
	}{
		{KindForeshadowing, "古き予言"},
		{KindTimeline, "メイン"},
		{KindPlot, "ロマンス"},
		{KindCharacterPhase, "目覚め"},
	}
	for _, tc := range cases {
		got, err := s.FindByName(tc.kind, tc.name)
		if err != nil {
			t.Fatalf("kind=%s name=%s: %v", tc.kind, tc.name, err)
		}
		if len(got) != 1 {
			t.Fatalf("kind=%s name=%s: expected 1 hit, got %d", tc.kind, tc.name, len(got))
		}
	}
}

func TestStore_FindByName_UnknownKind_ReturnsEmpty(t *testing.T) {
	s := New()
	got, err := s.FindByName(Kind("unknown"), "x")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 0 {
		t.Fatalf("expected empty slice for unknown kind")
	}
}

func TestStore_All_PreservesInsertionOrder(t *testing.T) {
	s := New()
	c1 := &domain.Character{ID: "a"}
	c2 := &domain.Character{ID: "b"}
	c3 := &domain.Character{ID: "c"}
	for _, c := range []*domain.Character{c1, c2, c3} {
		if err := s.AddCharacter(c); err != nil {
			t.Fatal(err)
		}
	}
	all := s.AllCharacters()
	if len(all) != 3 || all[0] != c1 || all[1] != c2 || all[2] != c3 {
		t.Fatalf("insertion order broken: %v", all)
	}

	v1 := &domain.Setting{ID: "s1"}
	v2 := &domain.Setting{ID: "s2"}
	if err := s.AddSetting(v1); err != nil {
		t.Fatal(err)
	}
	if err := s.AddSetting(v2); err != nil {
		t.Fatal(err)
	}
	settings := s.AllSettings()
	if len(settings) != 2 || settings[0] != v1 || settings[1] != v2 {
		t.Fatalf("settings order broken")
	}

	f1 := &domain.Foreshadowing{ID: "f1"}
	f2 := &domain.Foreshadowing{ID: "f2"}
	_ = s.AddForeshadowing(f1)
	_ = s.AddForeshadowing(f2)
	if all := s.AllForeshadowings(); len(all) != 2 || all[0] != f1 || all[1] != f2 {
		t.Fatalf("foreshadowings order broken")
	}

	t1 := &domain.Timeline{ID: "t1"}
	t2 := &domain.Timeline{ID: "t2"}
	_ = s.AddTimeline(t1)
	_ = s.AddTimeline(t2)
	if all := s.AllTimelines(); len(all) != 2 || all[0] != t1 || all[1] != t2 {
		t.Fatalf("timelines order broken")
	}

	p1 := &domain.Plot{ID: "p1"}
	p2 := &domain.Plot{ID: "p2"}
	_ = s.AddPlot(p1)
	_ = s.AddPlot(p2)
	if all := s.AllPlots(); len(all) != 2 || all[0] != p1 || all[1] != p2 {
		t.Fatalf("plots order broken")
	}

	ph1 := &domain.CharacterPhase{ID: "ph1"}
	ph2 := &domain.CharacterPhase{ID: "ph2"}
	_ = s.AddCharacterPhase(ph1)
	_ = s.AddCharacterPhase(ph2)
	if all := s.AllCharacterPhases(); len(all) != 2 || all[0] != ph1 || all[1] != ph2 {
		t.Fatalf("phases order broken")
	}
}

func TestStore_AddNil_ReturnsValidation(t *testing.T) {
	s := New()
	mustErrorCode(t, s.AddCharacter(nil), apperrors.CodeValidation)
	mustErrorCode(t, s.AddSetting(nil), apperrors.CodeValidation)
	mustErrorCode(t, s.AddForeshadowing(nil), apperrors.CodeValidation)
	mustErrorCode(t, s.AddTimeline(nil), apperrors.CodeValidation)
	mustErrorCode(t, s.AddPlot(nil), apperrors.CodeValidation)
	mustErrorCode(t, s.AddCharacterPhase(nil), apperrors.CodeValidation)
}

func TestStore_AddEmptyID_ReturnsValidation(t *testing.T) {
	s := New()
	mustErrorCode(t, s.AddCharacter(&domain.Character{ID: ""}), apperrors.CodeValidation)
}
