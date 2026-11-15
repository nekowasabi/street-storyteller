package review

import (
	"context"
	"time"

	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/external/textlint"
	"github.com/takets/street-storyteller/internal/project/manifest"
	"github.com/takets/street-storyteller/internal/service"
	"github.com/takets/street-storyteller/internal/testkit/process"
)

type Kind string

const (
	Clarity  Kind = "clarity"
	Typo     Kind = "typo"
	Interest Kind = "interest"
	Consult  Kind = "consult"
)

type Verdict string

const (
	Pass    Verdict = "pass"
	Done    Verdict = "done"
	Edit    Verdict = "edit"
	Author  Verdict = "author"
	Error   Verdict = "error"
	Usage   Verdict = "usage"
	Reading Verdict = "reading"
)

func (v Verdict) ExitCode() int {
	switch v {
	case Pass, Done:
		return 0
	case Edit:
		return 1
	case Usage:
		return 2
	case Author:
		return 3
	case Reading:
		return 5
	default:
		return 4
	}
}

type Request struct {
	Kind        Kind
	Path        string
	Team        bool
	Criteria    string
	DryRun      bool
	Wait        time.Duration
	Instruction string
}
type Deps struct {
	Decider           Decider
	Launcher          Launcher
	Now               func() time.Time
	Wait              func(context.Context, time.Duration) error
	WorkRoot, MapRoot string
	Textlint          textlint.Worker
	TextlintAvailable func(context.Context) (bool, string)
	Runner            process.Runner
}
type Report struct {
	Kind     Kind            `json:"kind"`
	Verdict  Verdict         `json:"verdict"`
	Stage    string          `json:"stage,omitempty"`
	Criteria string          `json:"criteria,omitempty"`
	Findings []Finding       `json:"findings"`
	Holds    []Hold          `json:"holds,omitempty"`
	Cells    *Tally          `json:"cells,omitempty"`
	Sent     *Sent           `json:"sent,omitempty"`
	Run      string          `json:"run,omitempty"`
	Agents   []AgentProgress `json:"agents,omitempty"`
	Replies  []AgentReply    `json:"replies,omitempty"`
	Turn     *TurnReply      `json:"turn,omitempty"`
	Error    string          `json:"error,omitempty"`
}

func (r Report) ExitCode() int { return r.Verdict.ExitCode() }

type Finding struct {
	Code     string `json:"code"`
	Severity string `json:"severity"`
	File     string `json:"file,omitempty"`
	Line     int    `json:"line,omitempty"`
	Quote    string `json:"quote,omitempty"`
	Message  string `json:"message"`
	Fact     string `json:"fact,omitempty"`
	Blocking bool   `json:"blocking"`
}
type Tally struct {
	Declared int `json:"declared"`
	Stated   int `json:"stated"`
	Resolved int `json:"resolved"`
	Hold     int `json:"hold"`
	Missing  int `json:"missing"`
	Unknown  int `json:"unknown"`
}
type Sent struct {
	Judge        string  `json:"judge,omitempty"`
	Probe        int     `json:"probe"`
	JudgeQueries int     `json:"judge_queries"`
	Calls        int     `json:"calls"`
	Bytes        int     `json:"bytes"`
	CacheHits    int     `json:"cache_hits"`
	Destinations []Agent `json:"destinations,omitempty"`
}
type Agent = manifest.ReviewAgent
type AgentProgress struct {
	Agent   string `json:"agent"`
	Runtime string `json:"runtime"`
	Model   string `json:"model"`
	Step    int    `json:"step"`
	Of      int    `json:"of"`
	Done    bool   `json:"done"`
}
type AgentReply struct {
	Agent   string `json:"agent"`
	Runtime string `json:"runtime"`
	Model   string `json:"model"`
	Notes   string `json:"notes"`
}
type Ref string

const (
	AskRef   Ref = "ask"
	ReaskRef Ref = "reask"
)

type Cell struct {
	Agent string `json:"agent"`
	Fact  string `json:"fact"`
	Ref   Ref    `json:"ref"`
}
type Key = domain.AnswerKey
type Ask = domain.Ask
type FactAsk struct {
	ID               string                  `json:"id"`
	Statement        string                  `json:"statement"`
	AuthorTruth      *bool                   `json:"authorTruth"`
	ResolutionPolicy domain.ResolutionPolicy `json:"resolutionPolicy"`
	Ask              domain.Ask              `json:"ask"`
	Deadline         int                     `json:"deadline"`
}
type Profile struct {
	Name, JudgeModel            string
	ProbeMin, WholeMin, ItemMin float64
}

func DefaultProfile() Profile {
	return Profile{"gemini-decision-1", "google/gemini-decision-1", 0.2, 0.6, 0.5}
}

type Spec struct {
	Agents   []Agent
	Asks     []FactAsk
	Chapters []service.ChapterStances
	Profile  Profile
	Prompts  map[string]string
	Resolved []Resolution
}
type ReaderText []string
type Answers map[Cell]string
type Values map[string]float64
type Hold struct {
	Cell     Cell      `json:"cell"`
	Question string    `json:"question"`
	Answer   string    `json:"answer"`
	Key      Key       `json:"key"`
	Whole    float64   `json:"whole"`
	Items    []float64 `json:"items"`
}
type CellDecision struct {
	Cell     Cell
	Status   string
	Whole    float64
	Items    []float64
	Resolved bool
}
type Matrix struct {
	Verdict Verdict
	Cells   []CellDecision
	Holds   []Hold
	Tally   Tally
}
type Decider interface {
	Decide(context.Context, string, Query) (float64, error)
}
type Launcher interface {
	Launch(ctx context.Context, id, dir string, agent AgentLaunch) (LaunchHandle, error)
	Close(context.Context, LaunchHandle) error
}
type AgentLaunch struct {
	Agent, Runtime, Model, Effort string
	Prompt                        string
}
type LaunchHandle struct {
	ID    string `json:"id"`
	RunID string `json:"run_id"`
}
type TurnRequest struct {
	AnswersText string
	Run, Agent  string
	Step        int
	Notes       string
	Answers     map[string]string
}
type TurnReply struct {
	Step  int      `json:"step"`
	Of    int      `json:"of"`
	File  string   `json:"file,omitempty"`
	Asks  []string `json:"asks,omitempty"`
	Done  bool     `json:"done"`
	Error string   `json:"error,omitempty"`
	Code  int      `json:"code,omitempty"`
}
type ResolveRequest struct {
	Path   string
	Cell   Cell
	Accept bool
	Reject bool
	Why    string
}
type Resolution struct {
	Agent, Fact       string
	Ref               Ref
	AnswerSHA, KeySHA string
	Decision, Reason  string
}
