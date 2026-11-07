package domain

// Proposition is a statement the author wants the reader to hold, doubt, or
// never learn. It is the unit that Clarity checks track across manuscripts.
// See docs/glossary.md and docs/clarity.md.
type Proposition struct {
	ID        string
	Statement string
	// AuthorTruth is nil when the author leaves the truth undecided (TS null).
	AuthorTruth      *bool
	ResolutionPolicy ResolutionPolicy
}

// ResolutionPolicy says how a proposition may end.
type ResolutionPolicy string

const (
	ResolutionMustCorrectIfFalse ResolutionPolicy = "must-correct-if-false"
	ResolutionMayRemainMisled    ResolutionPolicy = "may-remain-misled"
	ResolutionMayRemainWithheld  ResolutionPolicy = "may-remain-withheld"
)

// Stance is how the reader holds a proposition at a point in the manuscript.
type Stance string

const (
	StanceShown     Stance = "shown"
	StanceInferring Stance = "inferring"
	StanceConvinced Stance = "convinced"
	StanceMisled    Stance = "misled"
	StanceCorrected Stance = "corrected"
	StanceWithheld  Stance = "withheld"
)

// AllStances lists every valid Stance in a stable order (used by completion).
var AllStances = []Stance{
	StanceShown, StanceInferring, StanceConvinced, StanceMisled, StanceCorrected, StanceWithheld,
}

func IsValidStance(s Stance) bool {
	for _, v := range AllStances {
		if v == s {
			return true
		}
	}
	return false
}

func IsValidResolutionPolicy(p ResolutionPolicy) bool {
	switch p {
	case ResolutionMustCorrectIfFalse, ResolutionMayRemainMisled, ResolutionMayRemainWithheld:
		return true
	}
	return false
}
