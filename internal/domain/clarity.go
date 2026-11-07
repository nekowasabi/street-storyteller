package domain

import (
	"fmt"
	"strings"
)

// Disclosure is one entry of a manuscript's reader_shows list: the author
// showed proposition P to the reader, leaving them in stance S.
type Disclosure struct {
	PropositionID string
	Stance        Stance
}

// Requirement is one entry of reader_requires. Stance nil means "any prior
// disclosure of this proposition, including withheld, satisfies it".
type Requirement struct {
	PropositionID string
	Stance        *Stance
}

// ParseDisclosure reads "propId:stance".
func ParseDisclosure(s string) (Disclosure, error) {
	id, st, err := splitIDStance(s)
	if err != nil {
		return Disclosure{}, err
	}
	if st == nil {
		return Disclosure{}, fmt.Errorf("reader_shows %q: stance is required (write id:stance)", s)
	}
	return Disclosure{PropositionID: id, Stance: *st}, nil
}

// ParseRequirement reads "propId:stance" or "propId".
func ParseRequirement(s string) (Requirement, error) {
	id, st, err := splitIDStance(s)
	if err != nil {
		return Requirement{}, err
	}
	return Requirement{PropositionID: id, Stance: st}, nil
}

func splitIDStance(s string) (string, *Stance, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return "", nil, fmt.Errorf("empty clarity entry")
	}
	id, rest, hasColon := strings.Cut(s, ":")
	if id == "" {
		return "", nil, fmt.Errorf("clarity entry %q: proposition id is empty", s)
	}
	if !hasColon {
		return id, nil, nil
	}
	st := Stance(strings.TrimSpace(rest))
	if !IsValidStance(st) {
		return "", nil, fmt.Errorf("clarity entry %q: unknown stance %q (valid: %s)", s, rest, stanceList())
	}
	return id, &st, nil
}

func stanceList() string {
	parts := make([]string, len(AllStances))
	for i, v := range AllStances {
		parts[i] = string(v)
	}
	return strings.Join(parts, ", ")
}

func (d Disclosure) String() string { return d.PropositionID + ":" + string(d.Stance) }

func (r Requirement) String() string {
	if r.Stance == nil {
		return r.PropositionID
	}
	return r.PropositionID + ":" + string(*r.Stance)
}
