package service

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/takets/street-storyteller/internal/domain"
)

// Observed is how a simulated reader holds a proposition at a chapter.
type Observed string

const (
	ObservedAbsent   Observed = "absent"
	ObservedStated   Observed = "stated"
	ObservedInferred Observed = "inferred"
	ObservedWrong    Observed = "wrong"
)

// readerRules is the RDR-201..206 table of docs/clarity.md: the code raised
// when the declared stance meets an observation. A missing entry is fine, and
// an undeclared proposition has no row, so the reader may guess ahead freely.
var readerRules = map[domain.Stance]map[Observed]string{
	domain.StanceShown:     {ObservedAbsent: "RDR-201", ObservedWrong: "RDR-202", ObservedInferred: "RDR-205"},
	domain.StanceConvinced: {ObservedAbsent: "RDR-201", ObservedWrong: "RDR-202", ObservedInferred: "RDR-205"},
	domain.StanceCorrected: {ObservedAbsent: "RDR-201", ObservedWrong: "RDR-202", ObservedInferred: "RDR-205"},
	domain.StanceInferring: {ObservedAbsent: "RDR-201"},
	domain.StanceMisled:    {ObservedStated: "RDR-203", ObservedAbsent: "RDR-206"},
	domain.StanceWithheld:  {ObservedStated: "RDR-204"},
}

// informational codes are reported but never fail the check.
var informational = map[string]bool{"RDR-205": true, "RDR-206": true}

// claimRank orders claim states for one proposition in one chapter
// (wrong > stated > inferred); it doubles as the set of valid claim states.
var claimRank = map[string]int{"dropped": 1, "inferred": 2, "stated": 3, "wrong": 4}

// Stumble boxes, in output order.
const (
	BoxProposition = "Proposition"
	BoxMisled      = "誘導"
	BoxWithheld    = "意図"
	BoxEarly       = "早すぎ"
	BoxLedgerGap   = "台帳の穴"
	BoxExpression  = "表現"
)

var Boxes = []string{BoxProposition, BoxMisled, BoxWithheld, BoxEarly, BoxLedgerGap, BoxExpression}

const (
	factNone = "-"
	factNew  = "NEW"
)

// Observation is one row of the reader observations TSV.
type Observation struct {
	Kind     string // claim or event
	Persona  string
	Chapter  int
	Ref      string
	Fact     string // proposition id, "-" or "NEW"
	State    string // claim: stated, inferred, wrong or dropped; event: "-"
	Where    string
	Category string
	Words    string
}

type MatrixCell struct {
	Chapter  int      `json:"chapter"`
	Expected string   `json:"expected"`
	Observed Observed `json:"observed"`
}

type MatrixRow struct {
	Persona string       `json:"persona"`
	Fact    string       `json:"fact"`
	Cells   []MatrixCell `json:"cells"`
}

type Stumble struct {
	Persona  string `json:"persona"`
	Where    string `json:"where"`
	Chapter  int    `json:"chapter"`
	Box      string `json:"box"`
	Fact     string `json:"fact"`
	Cause    string `json:"cause"`
	Category string `json:"category"`
	Words    string `json:"words"`
}

// ReaderCheckResult compares reader observations with the body's markers.
// OK is false when any RDR-201..204 is found; MainFailed only when one is on
// a proposition named by --main.
type ReaderCheckResult struct {
	ChaptersChecked int
	// ChaptersRead is, per persona, the last chapter with any of its rows;
	// findings and the matrix stop there.
	ChaptersRead map[string]int
	Observations int
	Findings     []ClarityViolation
	Matrix       []MatrixRow
	Stumbles     []Stumble
	OK           bool
	MainFailed   bool
}

// ReaderCheckService matches a reader's per-chapter picture against the
// author's declared stances. Observations are candidates (docs/clarity.md
// 候補として出す), so the service never loads src/propositions.
type ReaderCheckService struct{}

func NewReaderCheckService() *ReaderCheckService { return &ReaderCheckService{} }

// Run reads manuscriptsDir, the observations TSV, and the optional main file
// (one proposition id per line) and judges every persona.
func (s *ReaderCheckService) Run(manuscriptsDir, observationsPath, mainPath string) (ReaderCheckResult, error) {
	chapters, err := WalkStances(manuscriptsDir)
	if err != nil {
		return ReaderCheckResult{}, err
	}
	f, err := os.Open(observationsPath)
	if err != nil {
		return ReaderCheckResult{}, err
	}
	defer f.Close()
	obs, err := ParseObservations(f, len(chapters))
	if err != nil {
		return ReaderCheckResult{}, fmt.Errorf("%s: %w", observationsPath, err)
	}
	main := map[string]bool{}
	if mainPath != "" {
		if main, err = readMainFile(mainPath); err != nil {
			return ReaderCheckResult{}, err
		}
	}
	return CheckReader(chapters, obs, main), nil
}

// ParseObservations reads the 9-column TSV. chapters bounds the chapter
// column, since a stance is only known for chapters that exist.
func ParseObservations(r io.Reader, chapters int) ([]Observation, error) {
	var out []Observation
	sc := bufio.NewScanner(r)
	for n := 1; sc.Scan(); n++ {
		line := strings.TrimSuffix(sc.Text(), "\r")
		if strings.TrimSpace(line) == "" || strings.HasPrefix(line, "#") {
			continue
		}
		cols := strings.Split(line, "\t")
		if cols[0] == "kind" {
			continue
		}
		if len(cols) != 9 {
			return nil, fmt.Errorf("line %d: want 9 tab-separated columns, got %d", n, len(cols))
		}
		o := Observation{Kind: cols[0], Persona: cols[1], Ref: cols[3], Fact: cols[4], State: cols[5],
			Where: cols[6], Category: cols[7], Words: cols[8]}
		ch, err := strconv.Atoi(cols[2])
		if err != nil || ch < 1 || ch > chapters {
			return nil, fmt.Errorf("line %d: chapter %q is not between 1 and %d", n, cols[2], chapters)
		}
		o.Chapter = ch
		if o.Persona == "" || o.Fact == "" {
			return nil, fmt.Errorf("line %d: persona and fact are required", n)
		}
		switch o.Kind {
		case "claim":
			if claimRank[o.State] == 0 {
				return nil, fmt.Errorf("line %d: claim state %q is not stated, inferred, wrong or dropped", n, o.State)
			}
		case "event":
			if o.State != "-" {
				return nil, fmt.Errorf("line %d: event state must be -, got %q", n, o.State)
			}
		default:
			return nil, fmt.Errorf("line %d: kind %q is not claim or event", n, o.Kind)
		}
		out = append(out, o)
	}
	return out, sc.Err()
}

func readMainFile(path string) (map[string]bool, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	out := map[string]bool{}
	for _, l := range strings.Split(string(data), "\n") {
		l = strings.TrimSpace(l)
		if l != "" && !strings.HasPrefix(l, "#") {
			out[l] = true
		}
	}
	return out, nil
}

func isPropositionFact(fact string) bool { return fact != factNone && fact != factNew }

// CheckReader judges obs against chapters per persona and proposition.
func CheckReader(chapters []ChapterStances, obs []Observation, main map[string]bool) ReaderCheckResult {
	res := ReaderCheckResult{
		ChaptersChecked: len(chapters), Observations: len(obs), OK: true,
		Findings: []ClarityViolation{}, Matrix: []MatrixRow{}, Stumbles: []Stumble{},
		ChaptersRead: map[string]int{},
	}

	// claims[persona][fact][chapter] is the strongest claim state written there.
	claims := map[string]map[string]map[int]string{}
	personaSet, factSet := map[string]bool{}, map[string]bool{}
	firstFile := map[string]string{}
	for _, ch := range chapters {
		for id := range ch.Stances {
			factSet[id] = true
			if _, ok := firstFile[id]; !ok {
				firstFile[id] = filepath.Base(ch.File)
			}
		}
	}
	for _, o := range obs {
		personaSet[o.Persona] = true
		res.ChaptersRead[o.Persona] = max(res.ChaptersRead[o.Persona], o.Chapter)
		if o.Kind != "claim" || !isPropositionFact(o.Fact) {
			continue
		}
		factSet[o.Fact] = true
		if claims[o.Persona] == nil {
			claims[o.Persona] = map[string]map[int]string{}
		}
		if claims[o.Persona][o.Fact] == nil {
			claims[o.Persona][o.Fact] = map[int]string{}
		}
		if prev := claims[o.Persona][o.Fact][o.Chapter]; claimRank[o.State] > claimRank[prev] {
			claims[o.Persona][o.Fact][o.Chapter] = o.State
		}
	}

	type run struct {
		code     string
		at       StanceAt
		observed Observed
		end      ChapterStances
	}
	for _, p := range sortedKeys(personaSet) {
		// A reader who stopped at chapter n has not met later chapters, so
		// judging them would report every later proposition as absent.
		read := chapters[:res.ChaptersRead[p]]
		for _, fact := range sortedKeys(factSet) {
			row := MatrixRow{Persona: p, Fact: fact, Cells: make([]MatrixCell, 0, len(read))}
			cur := ObservedAbsent
			var open *run
			flush := func() {
				if open == nil {
					return
				}
				decl := chapters[open.at.Since-1]
				res.Findings = append(res.Findings, ClarityViolation{
					File: decl.File, Line: open.at.Line, Code: open.code,
					Message: fmt.Sprintf("命題 %s は %s で %s だが、読者 %s は %s まで %s",
						fact, chapterName(decl.File), open.at.Stance, p, chapterName(open.end.File), open.observed),
				})
				if !informational[open.code] {
					res.OK = false
					if main[fact] {
						res.MainFailed = true
					}
				}
				open = nil
			}
			for _, ch := range read {
				if s, ok := claims[p][fact][ch.Number]; ok {
					cur = Observed(s)
					if s == "dropped" {
						cur = ObservedAbsent
					}
				}
				at, declared := ch.Stances[fact]
				expected := "-"
				if declared {
					expected = string(at.Stance)
				}
				row.Cells = append(row.Cells, MatrixCell{Chapter: ch.Number, Expected: expected, Observed: cur})

				code := readerRules[at.Stance][cur]
				if open != nil && open.code != code {
					flush()
				}
				if code != "" {
					if open == nil {
						open = &run{code: code, at: at, observed: cur}
					}
					open.end = ch
				}
			}
			flush()
			res.Matrix = append(res.Matrix, row)
		}
	}

	for _, o := range obs {
		if o.Kind != "event" {
			continue
		}
		cause := firstFile[o.Fact]
		if cause == "" {
			cause = "-"
		}
		at, declared := chapters[o.Chapter-1].Stances[o.Fact]
		res.Stumbles = append(res.Stumbles, Stumble{
			Persona: o.Persona, Where: o.Where, Chapter: o.Chapter, Box: boxOf(o.Fact, at, declared),
			Fact: o.Fact, Cause: cause, Category: o.Category, Words: o.Words,
		})
	}
	return res
}

func boxOf(fact string, at StanceAt, declared bool) string {
	switch {
	case fact == factNew:
		return BoxLedgerGap
	case fact == factNone:
		return BoxExpression
	case !declared:
		return BoxEarly
	case at.Stance == domain.StanceMisled:
		return BoxMisled
	case at.Stance == domain.StanceWithheld:
		return BoxWithheld
	default:
		return BoxProposition
	}
}

func chapterName(file string) string { return strings.TrimSuffix(filepath.Base(file), ".md") }

func sortedKeys(m map[string]bool) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}
