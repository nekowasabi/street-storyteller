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

// StanceMeanings explains each Stance on editor hover; keep in step with docs/glossary.md.
var StanceMeanings = map[Stance]string{
	StanceShown:     "見せた。読者はこの命題を本文で受け取った。",
	StanceInferring: "推論中。読者は手がかりからこの命題を推し量っているが、まだ確かめていない。",
	StanceConvinced: "確信。読者はこの命題を確かなものとして持っている。",
	StanceMisled:    "誤信。読者は作者の意図どおり、この命題について誤った考えを持っている。",
	StanceCorrected: "訂正済み。先に誤信させた命題を、読者が正しく持ち直した。同じ命題の misled が提示順でより前に要る（RDR-103）。",
	StanceWithheld:  "意図して伏せた。この命題はまだ明かさないと宣言する。宣言のある未開示は検査で落ちない。",
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
