package service

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"sort"

	"github.com/takets/street-storyteller/internal/domain"
	apperrors "github.com/takets/street-storyteller/internal/errors"
	"github.com/takets/street-storyteller/internal/meta"
	"github.com/takets/street-storyteller/internal/project"
)

// ClarityViolation is one failed Clarity rule, located in a manuscript.
// Codes follow docs/clarity.md: RDR-101 reference, RDR-102 prerequisite,
// RDR-103 correction, RDR-104 policy.
type ClarityViolation struct {
	File    string `json:"file"`
	Line    int    `json:"line"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (v ClarityViolation) String() string {
	return fmt.Sprintf("%s:%d %s %s", v.File, v.Line, v.Code, v.Message)
}

// ReaderPrereqResult reports the Clarity check over one manuscripts directory.
type ReaderPrereqResult struct {
	ChaptersChecked int
	Violations      []ClarityViolation
}

// ReaderPrereqService walks manuscripts in file-name order and checks that
// every reader_requires entry was disclosed by an earlier chapter, that every
// corrected stance follows a misled one, and that must-correct-if-false
// propositions end corrected. Presentation order is file-name order, and the
// reader_shows list order inside a chapter (docs/clarity.md 決めたこと).
type ReaderPrereqService struct{}

func NewReaderPrereqService() *ReaderPrereqService { return &ReaderPrereqService{} }

type disclosureKey struct {
	prop   string
	stance domain.Stance
}

// Run checks manuscriptsDir. projectRoot locates src/propositions; when the
// project cannot be loaded, proposition ids are not validated (RDR-101 is
// skipped) but the ordering rules still run on whatever the frontmatter says.
func (s *ReaderPrereqService) Run(manuscriptsDir, projectRoot string) (ReaderPrereqResult, error) {
	files, err := collectMarkdown(manuscriptsDir)
	if err != nil {
		return ReaderPrereqResult{}, err
	}
	sort.Strings(files)

	props, propsKnown, err := loadPropositions(projectRoot)
	if err != nil {
		return ReaderPrereqResult{}, err
	}

	res := ReaderPrereqResult{}
	seenBefore := map[disclosureKey]bool{}
	last := map[string]domain.Stance{}
	anyClarity := false

	for _, f := range files {
		data, err := os.ReadFile(f)
		if err != nil {
			return ReaderPrereqResult{}, fmt.Errorf("read %s: %w", f, err)
		}
		doc, err := meta.Parse(data)
		if err != nil {
			return ReaderPrereqResult{}, fmt.Errorf("%s: %w", f, err)
		}
		if doc.Kind() != meta.DocumentKindManuscript {
			continue
		}
		res.ChaptersChecked++
		fm := doc.FrontMatter
		if len(fm.ReaderShows) > 0 || len(fm.ReaderRequires) > 0 {
			anyClarity = true
		}
		add := func(code, entry, msg string) {
			res.Violations = append(res.Violations, ClarityViolation{
				File: f, Line: lineOf(data, entry), Code: code, Message: msg,
			})
		}

		for _, raw := range fm.ReaderRequires {
			req, err := domain.ParseRequirement(raw)
			if err != nil {
				add("RDR-101", raw, err.Error())
				continue
			}
			if propsKnown && props[req.PropositionID] == nil {
				add("RDR-101", raw, fmt.Sprintf("命題 %s は src/propositions に無い", req.PropositionID))
				continue
			}
			if !satisfied(req, seenBefore) {
				if req.Stance == nil {
					add("RDR-102", raw, fmt.Sprintf("命題 %s が前の章で開示されていない", req.PropositionID))
				} else {
					add("RDR-102", raw, fmt.Sprintf("命題 %s の前提 %s が前の章に無い", req.PropositionID, *req.Stance))
				}
			}
		}

		inChapter := map[disclosureKey]bool{}
		for _, raw := range fm.ReaderShows {
			d, err := domain.ParseDisclosure(raw)
			if err != nil {
				add("RDR-101", raw, err.Error())
				continue
			}
			if propsKnown && props[d.PropositionID] == nil {
				add("RDR-101", raw, fmt.Sprintf("命題 %s は src/propositions に無い", d.PropositionID))
				continue
			}
			if d.Stance == domain.StanceCorrected {
				k := disclosureKey{d.PropositionID, domain.StanceMisled}
				if !seenBefore[k] && !inChapter[k] {
					add("RDR-103", raw, fmt.Sprintf("命題 %s は誤信させる前に訂正されている", d.PropositionID))
				}
			}
			inChapter[disclosureKey{d.PropositionID, d.Stance}] = true
			last[d.PropositionID] = d.Stance
		}
		for k := range inChapter {
			seenBefore[k] = true
		}
	}

	if propsKnown && anyClarity && len(files) > 0 {
		lastFile := files[len(files)-1]
		ids := make([]string, 0, len(props))
		for id := range props {
			ids = append(ids, id)
		}
		sort.Strings(ids)
		for _, id := range ids {
			p := props[id]
			if p.ResolutionPolicy != domain.ResolutionMustCorrectIfFalse {
				continue
			}
			if last[id] != domain.StanceCorrected {
				res.Violations = append(res.Violations, ClarityViolation{
					File: lastFile, Line: 1, Code: "RDR-104",
					Message: fmt.Sprintf("命題 %s は must-correct-if-false だが最終章で corrected になっていない（最後の態度: %s）", id, stanceOrUnshown(last[id])),
				})
			}
		}
	}
	return res, nil
}

func satisfied(req domain.Requirement, seen map[disclosureKey]bool) bool {
	if req.Stance != nil {
		return seen[disclosureKey{req.PropositionID, *req.Stance}]
	}
	for k := range seen {
		if k.prop == req.PropositionID {
			return true
		}
	}
	return false
}

func stanceOrUnshown(s domain.Stance) string {
	if s == "" {
		return "unshown"
	}
	return string(s)
}

// loadPropositions returns the project's propositions. A missing manifest
// means "not a storyteller project here", so ids are not validated. Any other
// load failure is returned: a gate must not pass quietly on a project it
// could not read (same stance as lsp/server.LoadCatalog).
func loadPropositions(root string) (map[string]*domain.Proposition, bool, error) {
	if root == "" {
		return nil, false, nil
	}
	proj, err := project.Load(root)
	if err != nil {
		var ae *apperrors.Error
		if errors.As(err, &ae) && ae.Code == apperrors.CodeNotFound {
			return nil, false, nil
		}
		return nil, false, fmt.Errorf("clarity: load project at %s: %w", root, err)
	}
	out := map[string]*domain.Proposition{}
	for _, p := range proj.Store.AllPropositions() {
		out[p.ID] = p
	}
	return out, true, nil
}

// lineOf returns the 1-based line that first contains entry, or 1.
func lineOf(data []byte, entry string) int {
	idx := bytes.Index(data, []byte(entry))
	if idx < 0 {
		return 1
	}
	return bytes.Count(data[:idx], []byte("\n")) + 1
}
