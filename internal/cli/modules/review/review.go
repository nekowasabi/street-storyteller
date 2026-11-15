package review

import (
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/external/ateam"
	"github.com/takets/street-storyteller/internal/external/decisions"
	"github.com/takets/street-storyteller/internal/project/manifest"
	svc "github.com/takets/street-storyteller/internal/service/review"
	"github.com/takets/street-storyteller/internal/testkit/process"
)

type command struct {
	kind string
	deps *svc.Deps
}

func New(kind ...string) cli.Command {
	c := &command{}
	if len(kind) > 0 {
		c.kind = kind[0]
	}
	return c
}
func NewWithDeps(kind string, deps svc.Deps) cli.Command { return &command{kind: kind, deps: &deps} }
func (c *command) Name() string {
	if c.kind == "" {
		return "review"
	}
	return "review " + c.kind
}
func (c *command) Description() string {
	return "原稿の分かりやすさ・誤字・面白さの確認と相談"
}
func (c *command) HandleParseError(cc cli.CommandContext, _ error) int {
	return present(cc, svc.Report{Kind: svc.Kind(c.kind), Verdict: svc.Usage, Findings: []svc.Finding{}, Error: "--path に値が必要です"}, cc.GlobalOpts.JSON)
}
func (c *command) Handle(cc cli.CommandContext) int {
	kind := c.kind
	args := cc.Args
	if kind == "" && len(args) > 0 {
		kind = args[0]
		args = args[1:]
	}
	jsonOutput := cc.GlobalOpts.JSON
	for _, a := range args {
		if a == "--json" {
			jsonOutput = true
		}
	}
	usage := func(message string) int {
		return present(cc, svc.Report{Kind: svc.Kind(kind), Verdict: svc.Usage, Findings: []svc.Finding{}, Error: message}, jsonOutput)
	}
	switch kind {
	case "clarity", "typo", "interest", "consult", "turn", "resolve":
	default:
		return usage("review clarity|typo|interest|consult|turn|resolve を指定してください")
	}
	values, flags, pos, err := parse(kind, args)
	if err != nil {
		return usage(err.Error())
	}
	path := cc.GlobalOpts.Path
	if values["--path"] != "" {
		path = values["--path"]
	}
	if path == "" {
		path = "manuscripts"
	}
	deps := svc.Deps{}
	if c.deps != nil {
		deps = *c.deps
	} else {
		deps.Decider = decisions.New()
		deps.Runner = process.RealRunner{}
		if root, err := svc.FindProjectRoot(path); err == nil {
			if m, err := manifest.Load(root); err == nil && m.Review != nil {
				deps.Launcher = ateam.New(m.Review.Launcher.Ateam, deps.Runner)
			}
		}
	}
	if kind == "turn" {
		if len(pos) > 0 || values["--run"] == "" || values["--agent"] == "" {
			return usage("turn には --run・--agent・--step が必要です")
		}
		step, err := strconv.Atoi(values["--step"])
		if err != nil || step < 1 {
			return usage("--step は 1 以上の整数が必要です")
		}
		notes, answers := values["--notes"], values["--answers"]
		if (notes != "-") == (answers != "-") {
			return usage("--notes - または --answers - の一方を指定してください")
		}
		if cc.Deps.Stdin == nil {
			return usage("標準入力がありません")
		}
		b, err := io.ReadAll(cc.Deps.Stdin)
		if err != nil {
			return usage(err.Error())
		}
		req := svc.TurnRequest{Run: values["--run"], Agent: values["--agent"], Step: step}
		if notes == "-" {
			req.Notes = string(b)
		} else {
			req.AnswersText = string(b)
		}
		reply := svc.Turn(cc.Ctx, req, deps)
		code := reply.Code
		if reply.Error != "" {
			verdict := svc.Error
			if code == 1 {
				verdict = svc.Edit
			}
			return present(cc, svc.Report{Kind: svc.Kind("turn"), Verdict: verdict, Findings: []svc.Finding{}, Error: reply.Error}, jsonOutput)
		}
		if jsonOutput {
			return present(cc, svc.Report{Kind: svc.Kind("turn"), Verdict: svc.Done, Findings: []svc.Finding{}, Run: req.Run, Turn: &reply, Agents: []svc.AgentProgress{{Agent: req.Agent, Step: reply.Step, Of: reply.Of, Done: reply.Done}}}, true)
		}
		if reply.Done {
			fmt.Fprintln(cc.Deps.Stdout, "DONE")
		} else {
			fmt.Fprintf(cc.Deps.Stdout, "STEP %d/%d\n%s\n", reply.Step, reply.Of, reply.File)
		}
		return 0
	}
	if kind == "resolve" {
		if len(pos) != 1 {
			return usage("解くセルを agent:fact:ask または agent:fact:reask で指定してください")
		}
		parts := strings.Split(pos[0], ":")
		if len(parts) != 3 {
			return usage("セルは agent:fact:ask または agent:fact:reask で指定してください")
		}
		return present(cc, svc.Resolve(cc.Ctx, svc.ResolveRequest{Path: path, Cell: svc.Cell{Agent: parts[0], Fact: parts[1], Ref: svc.Ref(parts[2])}, Accept: flags["--accept"], Reject: flags["--reject"], Why: values["--why"]}, deps), jsonOutput)
	}
	instruction := ""
	if len(pos) > 1 {
		return usage("指示は 1 つの引数にまとめてください")
	}
	if len(pos) == 1 {
		instruction = pos[0]
	}
	wait := 90 * time.Second
	if raw, ok := values["--wait"]; ok {
		seconds, err := strconv.ParseFloat(raw, 64)
		if err != nil || seconds < 0 || seconds > 86400 {
			return usage("--wait は 0 以上 86400 以下の秒数にしてください")
		}
		wait = time.Duration(seconds * float64(time.Second))
		if wait == 0 {
			wait = time.Nanosecond
		}
	}
	report := svc.Run(cc.Ctx, svc.Request{Kind: svc.Kind(kind), Path: path, Team: flags["--team"], Criteria: values["--criteria"], DryRun: flags["--dry-run"], Wait: wait, Instruction: instruction}, deps)
	return present(cc, report, jsonOutput)
}
func parse(kind string, args []string) (map[string]string, map[string]bool, []string, error) {
	values, flags := map[string]string{}, map[string]bool{}
	allowed := map[string]bool{"--json": true, "--path": false}
	switch kind {
	case "turn":
		for _, key := range []string{"--run", "--agent", "--step", "--notes", "--answers"} {
			allowed[key] = false
		}
	case "resolve":
		allowed["--accept"] = true
		allowed["--reject"] = true
		allowed["--why"] = false
	default:
		allowed["--team"] = true
		allowed["--criteria"] = false
		allowed["--dry-run"] = true
		allowed["--wait"] = false
	}
	var pos []string
	for i := 0; i < len(args); i++ {
		a := args[i]
		if a == "--" {
			pos = append(pos, args[i+1:]...)
			break
		}
		if !strings.HasPrefix(a, "-") {
			pos = append(pos, a)
			continue
		}
		key, value, equals := strings.Cut(a, "=")
		boolean, ok := allowed[key]
		if !ok {
			return nil, nil, nil, fmt.Errorf("不明なフラグです: %s", key)
		}
		if boolean {
			if equals {
				return nil, nil, nil, fmt.Errorf("%s に値は指定できません", key)
			}
			flags[key] = true
			continue
		}
		if !equals {
			if i+1 == len(args) || strings.HasPrefix(args[i+1], "--") {
				return nil, nil, nil, fmt.Errorf("%s に値が必要です", key)
			}
			i++
			value = args[i]
		}
		if value == "" {
			return nil, nil, nil, fmt.Errorf("%s に空の値は指定できません", key)
		}
		values[key] = value
	}
	return values, flags, pos, nil
}
func present(cc cli.CommandContext, r svc.Report, jsonOutput bool) int {
	if jsonOutput {
		if err := cc.Presenter.WriteJSON(r); err != nil {
			return 4
		}
		return r.ExitCode()
	}
	for _, f := range r.Findings {
		if f.File != "" {
			fmt.Fprintf(cc.Deps.Stdout, "%s:%d %s %s\n%s\n", f.File, f.Line, f.Code, f.Message, f.Quote)
		} else {
			fmt.Fprintf(cc.Deps.Stdout, "%s %s\n", f.Code, f.Message)
		}
	}
	if r.Error != "" {
		fmt.Fprintln(cc.Deps.Stdout, r.Error)
	}
	for _, a := range r.Agents {
		fmt.Fprintf(cc.Deps.Stdout, "%s %s %s %d/%d\n", a.Agent, a.Runtime, a.Model, a.Step, a.Of)
	}
	for _, reply := range r.Replies {
		fmt.Fprintf(cc.Deps.Stdout, "== %s（%s・%s）\n%s\n", reply.Agent, reply.Runtime, reply.Model, reply.Notes)
	}
	if r.Sent != nil {
		fmt.Fprintf(cc.Deps.Stdout, "送り先: 判定モデル %s、工程2 %d 問、工程3b %d 問、送信 %d 回、キャッシュ %d 件\n", r.Sent.Judge, r.Sent.Probe, r.Sent.JudgeQueries, r.Sent.Calls, r.Sent.CacheHits)
		for _, a := range r.Sent.Destinations {
			fmt.Fprintf(cc.Deps.Stdout, "読者 %s: %s（%s）\n", a.Agent, a.Runtime, a.Model)
		}
	}
	fmt.Fprintf(cc.Deps.Stdout, "RESULT %s exit=%d criteria=%s run=%s\n", strings.ToUpper(string(r.Verdict)), r.ExitCode(), r.Criteria, r.Run)
	return r.ExitCode()
}
