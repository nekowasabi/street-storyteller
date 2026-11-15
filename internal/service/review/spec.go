package review

import (
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/project"
	"github.com/takets/street-storyteller/internal/project/manifest"
	"github.com/takets/street-storyteller/internal/service"
)

//go:embed prompts/*.md
var bundledPrompts embed.FS
var frontmatter = regexp.MustCompile(`(?s)\A---\n.*?\n---\n`)
var comments = regexp.MustCompile(`(?s)<!--.*?-->`)

func BodyOf(s string) string {
	return strings.TrimSpace(comments.ReplaceAllString(frontmatter.ReplaceAllString(s, ""), ""))
}
func ReaderCopy(s string) string {
	blank := func(s string) string { return strings.Repeat("\n", strings.Count(s, "\n")) }
	return comments.ReplaceAllStringFunc(frontmatter.ReplaceAllStringFunc(s, blank), blank)
}
func digest(v any, n int) string {
	b, _ := json.Marshal(v)
	return hash(string(b))[:n]
}
func hash(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}
func (s Spec) profile() Profile {
	if s.Profile.JudgeModel == "" {
		return DefaultProfile()
	}
	return s.Profile
}
func (s Spec) Cells() []Cell {
	var out []Cell
	for _, a := range s.Agents {
		for _, f := range s.Asks {
			if !f.Ask.Main {
				continue
			}
			for _, r := range []Ref{AskRef, ReaskRef} {
				out = append(out, Cell{a.Agent, f.ID, r})
			}
		}
	}
	return out
}
func (s Spec) Criteria() string { return digest(s.criteriaData(), 8) }
func (s Spec) criteriaData() any {
	type chapter struct{ Markers, Requires []string }
	type fact struct {
		ID               string                  `json:"id"`
		Statement        string                  `json:"statement"`
		AuthorTruth      *bool                   `json:"authorTruth"`
		ResolutionPolicy domain.ResolutionPolicy `json:"resolutionPolicy"`
		Ask              domain.Ask              `json:"ask"`
	}
	fs := make([]fact, 0, len(s.Asks))
	for _, f := range s.Asks {
		fs = append(fs, fact{f.ID, f.Statement, f.AuthorTruth, f.ResolutionPolicy, f.Ask})
	}
	sort.Slice(fs, func(i, j int) bool { return fs[i].ID < fs[j].ID })
	cs := make([]chapter, 0, len(s.Chapters))
	for _, c := range s.Chapters {
		cs = append(cs, chapter{c.Markers(), c.ReaderRequires()})
	}
	prompts := map[string]string{}
	for k, v := range s.Prompts {
		prompts[k] = hash(v)
	}
	for i, q := range ProbeQueries(s, make(ReaderText, len(s.Chapters))) {
		prompts[fmt.Sprintf("probe-%d", i)] = hash(q.Instructions)
	}
	for _, f := range s.Asks {
		if !f.Ask.Main {
			continue
		}
		for _, ref := range []Ref{AskRef, ReaskRef} {
			for i, q := range AnswerQueries(s, f, ref, "") {
				prompts[fmt.Sprintf("judge-%s-%s-%d", f.ID, ref, i)] = hash(q.Instructions)
			}
		}
	}
	return struct {
		Facts    []fact
		Chapters []chapter
		Agents   []Agent
		Prompts  map[string]string
		Profile  Profile
		Resolved []Resolution
	}{fs, cs, s.Agents, prompts, s.profile(), s.Resolved}
}
func (s Spec) Defects() []Finding {
	var out []Finding
	for _, f := range s.Asks {
		if !f.Ask.Main {
			continue
		}
		if f.Deadline == 0 || strings.TrimSpace(f.Ask.Question) == "" || len(f.Ask.Answer.Must) == 0 || (f.Ask.Reask != domain.ReaskNow && f.Ask.Reask != domain.ReaskAtDeadline) {
			out = append(out, Finding{Code: "REV-301", Severity: "error", Fact: f.ID, Message: "本筋の問いには shown の印・問い・必須項目・再問の時点が必要です", Blocking: true})
		}
	}
	if len(s.Asks) == 0 {
		out = append(out, Finding{Code: "REV-301", Severity: "error", Message: "ask を持つ命題がありません", Blocking: true})
	}
	return out
}
func (s Spec) Question(f FactAsk, ref Ref) string {
	if ref == ReaskRef && f.Ask.Reask == domain.ReaskAtDeadline {
		return fmt.Sprintf("（%d章を読み終えた時点で）%s", f.Deadline, f.Ask.Question)
	}
	return f.Ask.Question
}
func (s Spec) fact(id string) (FactAsk, bool) {
	for _, f := range s.Asks {
		if f.ID == id {
			return f, true
		}
	}
	return FactAsk{}, false
}
func FindProjectRoot(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	for {
		if _, err := os.Stat(filepath.Join(abs, manifest.ManifestFileName)); err == nil {
			return abs, nil
		} else if !os.IsNotExist(err) {
			return "", err
		}
		parent := filepath.Dir(abs)
		if parent == abs {
			return "", fmt.Errorf(".storyteller.json が見つかりません")
		}
		abs = parent
	}
}
func LoadSpec(path string) (Spec, ReaderText, error) {
	p, err := loadProject(path)
	if err != nil {
		return Spec{}, nil, err
	}
	if err := p.prepare(Clarity); err != nil {
		return Spec{}, nil, err
	}
	return p.spec, p.text, nil
}

type reviewProject struct {
	root, path string
	config     manifest.ReviewConfig
	spec       Spec
	text       ReaderText
	raw        []string
}

func loadProject(path string) (*reviewProject, error) {
	if path == "" {
		path = "manuscripts"
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		return nil, err
	}
	root, err := FindProjectRoot(abs)
	if err != nil {
		return nil, err
	}
	p, err := project.Load(root)
	if err != nil {
		return nil, err
	}
	chapters, err := service.WalkStances(abs)
	if err != nil {
		return nil, err
	}
	if len(chapters) == 0 {
		return nil, fmt.Errorf("原稿の章がありません: %s", abs)
	}
	r := &reviewProject{root: root, path: abs, spec: Spec{Chapters: chapters, Profile: DefaultProfile()}}
	if p.Manifest.Review != nil {
		r.config = *p.Manifest.Review
	}
	if model, ok := strings.CutPrefix(r.config.Judge, "openrouter:"); ok && model != "" && model != r.spec.Profile.JudgeModel {
		// 閾値は google/gemini-decision-1 で測った値のまま。別のモデルでは測っていない。
		r.spec.Profile.Name, r.spec.Profile.JudgeModel = model, model
	}
	if r.config.StallMinutes == 0 {
		r.config.StallMinutes = 60
	}
	r.spec.Agents = r.config.Agents
	for _, prop := range p.Store.AllPropositions() {
		if prop.Ask == nil {
			continue
		}
		f := FactAsk{ID: prop.ID, Statement: prop.Statement, AuthorTruth: prop.AuthorTruth, ResolutionPolicy: prop.ResolutionPolicy, Ask: *prop.Ask}
		for _, c := range chapters {
			for _, raw := range c.Markers() {
				if raw == prop.ID+":shown" && f.Deadline == 0 {
					f.Deadline = c.Number
				}
			}
		}
		r.spec.Asks = append(r.spec.Asks, f)
	}
	sort.Slice(r.spec.Asks, func(i, j int) bool { return r.spec.Asks[i].ID < r.spec.Asks[j].ID })
	for _, c := range chapters {
		b, err := os.ReadFile(c.File)
		if err != nil {
			return nil, err
		}
		r.raw = append(r.raw, string(b))
		r.text = append(r.text, BodyOf(string(b)))
	}
	return r, nil
}
func (p *reviewProject) prompts(kind Kind) error {
	names := []string{string(kind) + "-readme.md"}
	if kind != Consult {
		for _, a := range p.spec.Agents {
			names = append(names, "persona-"+a.Agent+".md")
		}
	}
	p.spec.Prompts = map[string]string{}
	for _, name := range names {
		b, err := os.ReadFile(filepath.Join(p.root, "src", "reviews", "prompts", name))
		if os.IsNotExist(err) {
			b, err = bundledPrompts.ReadFile("prompts/" + name)
		}
		if err != nil {
			return fmt.Errorf("指示文 %s: %w", name, err)
		}
		p.spec.Prompts[name] = string(b)
	}
	return nil
}
func (p *reviewProject) runID(kind Kind, instruction string) string {
	copies := make([]string, len(p.raw))
	for i, raw := range p.raw {
		if kind == Clarity {
			copies[i] = ReaderCopy(raw)
		} else {
			copies[i] = raw
		}
	}
	return "r-" + digest(struct {
		Kind        Kind
		Criteria    any
		Copies      []string
		Instruction string
	}{kind, p.spec.criteriaData(), copies, instruction}, 8)
}

func (p *reviewProject) readID(kind Kind, instruction string) string {
	copy := *p
	copy.spec.Resolved = nil
	return copy.runID(kind, instruction)
}
