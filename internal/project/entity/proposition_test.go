package entity_test

import (
	"errors"
	"strings"
	"testing"

	apperrors "github.com/takets/street-storyteller/internal/errors"
	"github.com/takets/street-storyteller/internal/project/entity"
)

func TestLoadProposition_minimal(t *testing.T) {
	src := `export const loc = {
		id: "loc",
		statement: "鍵は店主が隠している",
		authorTruth: false,
		resolutionPolicy: "must-correct-if-false",
	};`
	got, err := entity.LoadProposition(strings.NewReader(src))
	if err != nil {
		t.Fatalf("LoadProposition: %v", err)
	}
	if got.ID != "loc" || got.Statement != "鍵は店主が隠している" {
		t.Errorf("got = %+v", got)
	}
	if got.AuthorTruth == nil || *got.AuthorTruth != false {
		t.Errorf("AuthorTruth = %v, want false", got.AuthorTruth)
	}
	if got.ResolutionPolicy != "must-correct-if-false" {
		t.Errorf("ResolutionPolicy = %q", got.ResolutionPolicy)
	}
}

func TestLoadProposition_nullTruthIsUndecided(t *testing.T) {
	src := `export const hist = {
		id: "hist",
		statement: "鍵の来歴は語られない",
		authorTruth: null,
		resolutionPolicy: "may-remain-withheld",
	};`
	got, err := entity.LoadProposition(strings.NewReader(src))
	if err != nil {
		t.Fatalf("LoadProposition: %v", err)
	}
	if got.AuthorTruth != nil {
		t.Errorf("AuthorTruth = %v, want nil", *got.AuthorTruth)
	}
}

func TestLoadProposition_unknownPolicy(t *testing.T) {
	src := `export const x = {
		id: "x",
		statement: "s",
		authorTruth: true,
		resolutionPolicy: "keep",
	};`
	_, err := entity.LoadProposition(strings.NewReader(src))
	var ae *apperrors.Error
	if !errors.As(err, &ae) || ae.Code != apperrors.CodeValidation {
		t.Fatalf("want validation error, got %v", err)
	}
}

func TestLoadProposition_missingTruth(t *testing.T) {
	src := `export const x = {
		id: "x",
		statement: "s",
		resolutionPolicy: "may-remain-misled",
	};`
	_, err := entity.LoadProposition(strings.NewReader(src))
	var ae *apperrors.Error
	if !errors.As(err, &ae) || ae.Code != apperrors.CodeValidation {
		t.Fatalf("want validation error, got %v", err)
	}
}
