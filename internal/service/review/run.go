package review

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/takets/street-storyteller/internal/external/textlint"
	"github.com/takets/street-storyteller/internal/service"
	"github.com/takets/street-storyteller/internal/testkit/clock"
	"github.com/takets/street-storyteller/internal/testkit/process"
)

const LaunchPrompt = "作業ディレクトリの README.md を読んで、そのとおりに進めてください。"

func baseReport(kind Kind) Report { return Report{Kind: kind, Findings: []Finding{}} }
func failReport(r Report, verdict Verdict, stage, code, message string) Report {
	r.Verdict = verdict
	r.Stage = stage
	if code != "" {
		r.Findings = append(r.Findings, Finding{Code: code, Severity: "error", Message: message, Blocking: true})
	}
	if verdict == Error || verdict == Usage {
		r.Error = message
	}
	return r
}
func (p *reviewProject) prepare(kind Kind) error {
	if kind == Consult {
		seen := map[string]bool{}
		var agents []Agent
		for _, a := range p.spec.Agents {
			if !seen[a.Runtime] {
				agents = append(agents, a)
				seen[a.Runtime] = true
			}
		}
		p.spec.Agents = agents
	}
	if err := p.prompts(kind); err != nil {
		return err
	}
	answers := Answers{}
	var current runMap
	if err := readJSON(currentPath(p.root, kind), &current); err == nil {
		complete := kind == Clarity && current.ReadID == p.readID(kind, "")
		steps := len(BuildSteps(p.spec, p.raw, kind))
		for _, a := range p.spec.Agents {
			records, err := readRecords(transcriptPath(p.root, current.Run, a.Agent))
			if err != nil {
				return err
			}
			complete = complete && len(records) == steps
		}
		if complete {
			var err error
			answers, err = readAnswers(p, current.Run)
			if err != nil {
				return err
			}
		}
	} else if !os.IsNotExist(err) {
		return err
	}
	return p.resolutions(answers)
}
func (p *reviewProject) structure() Report {
	r := baseReport(Clarity)
	result, err := service.NewMetaCheckService().Run(p.path)
	if err != nil {
		return failReport(r, Error, "structure", "", err.Error())
	}
	for _, v := range result.Violations {
		r.Findings = append(r.Findings, Finding{Code: v.Code, Severity: "error", File: v.File, Line: v.Line, Quote: quoteLine(v.File, v.Line), Message: v.Message, Blocking: true})
	}
	if len(r.Findings) > 0 {
		r.Verdict = Edit
		r.Stage = "structure"
		return r
	}
	if defects := p.spec.Defects(); len(defects) > 0 {
		r.Verdict = Author
		r.Stage = "structure"
		r.Findings = defects
	}
	return r
}
func quoteLine(file string, line int) string {
	b, err := os.ReadFile(file)
	if err != nil {
		return ""
	}
	lines := strings.Split(string(b), "\n")
	if line < 1 || line > len(lines) {
		return ""
	}
	return lines[line-1]
}
func Run(ctx context.Context, req Request, deps Deps) Report {
	r := baseReport(req.Kind)
	switch req.Kind {
	case Clarity, Typo, Interest, Consult:
	default:
		return failReport(r, Usage, "", "", "レビューの種類が不正です")
	}
	if req.Wait < 0 {
		return failReport(r, Usage, "", "", "--wait は 0 以上の秒数にしてください")
	}
	if (req.Kind == Clarity || req.Kind == Typo) && req.Instruction != "" {
		return failReport(r, Usage, "", "", "この種類には指示を渡せません")
	}
	if req.Kind == Consult && strings.TrimSpace(req.Instruction) == "" {
		return failReport(r, Usage, "", "", "相談の指示が必要です")
	}
	d := defaults(deps)
	if req.Kind == Typo {
		return runTypo(ctx, req, d)
	}
	p, err := loadProject(req.Path)
	if err != nil {
		return failReport(r, Error, "structure", "", err.Error())
	}
	if err := p.prepare(req.Kind); err != nil {
		return failReport(r, Error, "structure", "", err.Error())
	}
	r.Criteria = p.spec.Criteria()
	r.Run = p.runID(req.Kind, req.Instruction)
	r.Sent = &Sent{Judge: p.config.Judge, Destinations: p.spec.Agents}
	if req.Kind == Clarity {
		s := p.structure()
		if s.Verdict != "" {
			s.Criteria = r.Criteria
			s.Run = r.Run
			s.Sent = r.Sent
			return s
		}
	}
	if req.Criteria != "" && req.Criteria != r.Criteria {
		return failReport(r, Author, "structure", "REV-302", "止まる条件の指紋が --criteria と違います。著者が確認してください")
	}
	if req.Kind == Clarity {
		r.Sent.Probe = len(ProbeQueries(p.spec, p.text))
		for _, c := range p.spec.Cells() {
			f, _ := p.spec.fact(c.Fact)
			r.Sent.JudgeQueries += 1 + len(f.Ask.Answer.Must)
		}
		if p.config.Judge != "openrouter:"+p.spec.profile().JudgeModel {
			return failReport(r, Author, "probe", "REV-303", "review.judge に openrouter:<モデル> を設定してください（例: openrouter:"+DefaultProfile().JudgeModel+"）")
		}
	}
	if req.DryRun {
		if req.Kind == Clarity {
			cache := NewCache(filepath.Join(reviewDir(p.root), "judge-cache.jsonl"), nil)
			for _, q := range ProbeQueries(p.spec, p.text) {
				_, ok, err := cache.lookup(q.Key(p.spec.profile().JudgeModel))
				if err != nil {
					return failReport(r, Error, "probe", "REV-401", err.Error())
				}
				if ok {
					r.Sent.CacheHits++
				}
			}
		}
		r.Verdict = Done
		return r
	}
	if err := validateRoots(p, d); err != nil {
		return failReport(r, Error, "read", "", err.Error())
	}
	unlock, ok, err := acquireLock(filepath.Join(runDir(p.root, r.Run), "lock"), d.Now())
	if err != nil {
		return failReport(r, Error, "read", "", err.Error())
	}
	if !ok {
		r.Verdict = Reading
		r.Stage = "read"
		return r
	}
	defer unlock()
	if err := switchCurrent(ctx, p, req, r.Run, d); err != nil {
		return failReport(r, Error, "read", "REV-403", err.Error())
	}
	cache := NewCache(filepath.Join(reviewDir(p.root), "judge-cache.jsonl"), d.Decider)
	if req.Kind == Clarity {
		probes := ProbeQueries(p.spec, p.text)
		cache.Plan(probes)
		for _, q := range probes {
			v, err := cache.Decide(ctx, p.spec.profile().JudgeModel, q)
			r.Sent.CacheHits = cache.Hits
			r.Sent.Calls = cache.Calls
			r.Sent.Bytes = cache.Bytes
			if err != nil {
				return failReport(r, Error, "probe", "REV-401", err.Error())
			}
			if v < p.spec.profile().ProbeMin {
				return failReport(r, Edit, "probe", "REV-201", fmt.Sprintf("期限章までの本文に事実が不足しています（%.3f < %.1f）", v, p.spec.profile().ProbeMin))
			}
		}
	}
	r = runReaders(ctx, p, req, r, d)
	if r.Verdict != Done {
		return r
	}
	if req.Kind != Clarity {
		return r
	}
	answers, err := readAnswers(p, r.Run)
	if err != nil {
		return failReport(r, Error, "judge", "REV-401", err.Error())
	}
	values := Values{}
	judges := JudgeQueries(p.spec, answers)
	cache.Plan(judges)
	for _, q := range judges {
		v, err := cache.Decide(ctx, p.spec.profile().JudgeModel, q)
		if err == nil {
			values[q.Key(p.spec.profile().JudgeModel)] = v
		}
	}
	r.Sent.CacheHits = cache.Hits
	r.Sent.Calls = cache.Calls
	r.Sent.Bytes = cache.Bytes
	matrix := Decide(p.spec, answers, values, p.spec.Resolved)
	r.Verdict = matrix.Verdict
	r.Stage = "judge"
	r.Cells = &matrix.Tally
	r.Holds = matrix.Holds
	switch r.Verdict {
	case Error:
		return failReport(r, Error, "judge", "REV-401", "判定の値を取得できませんでした")
	case Edit:
		return failReport(r, Edit, "judge", "REV-202", "不明と答えた読者、または著者が却下した答えがあります")
	case Author:
		return failReport(r, Author, "judge", "REV-306", "保留の答えと模範解答を著者が見比べてください")
	}
	return r
}
func switchCurrent(ctx context.Context, p *reviewProject, req Request, run string, d Deps) error {
	var current runMap
	if err := readJSON(currentPath(p.root, req.Kind), &current); err != nil && !os.IsNotExist(err) {
		return err
	}
	if current.Run != "" && current.Run != run {
		state, err := readLaunch(p.root, current.Run)
		if err != nil {
			return err
		}
		if err := closeLaunches(ctx, p.root, current.Run, state, d); err != nil {
			return err
		}
		if current.ReadID == p.readID(req.Kind, req.Instruction) {
			if err := inheritCompleted(p, current.Run, run, req.Kind); err != nil {
				return err
			}
		}
	}
	mapping := runMap{Root: p.root, Path: p.path, Kind: req.Kind, Instruction: req.Instruction, Run: run, ReadID: p.readID(req.Kind, req.Instruction)}
	if err := writeJSON(currentPath(p.root, req.Kind), mapping); err != nil {
		return err
	}
	return writeJSON(filepath.Join(d.MapRoot, run+".json"), mapping)
}

func inheritCompleted(p *reviewProject, previous, run string, kind Kind) error {
	steps := len(BuildSteps(p.spec, p.raw, kind))
	for _, a := range p.spec.Agents {
		records, err := readRecords(transcriptPath(p.root, previous, a.Agent))
		if err != nil {
			return err
		}
		if len(records) != steps {
			return nil
		}
	}
	// Why: Reuse completed records instead of rereading when only author resolutions changed; every reader input still matches.
	for _, a := range p.spec.Agents {
		data, err := os.ReadFile(transcriptPath(p.root, previous, a.Agent))
		if err != nil {
			return err
		}
		f, err := os.OpenFile(transcriptPath(p.root, run, a.Agent), os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
		if os.IsExist(err) {
			continue
		}
		if err != nil {
			return err
		}
		_, err = f.Write(data)
		closeErr := f.Close()
		if err != nil {
			return err
		}
		if closeErr != nil {
			return closeErr
		}
	}
	return nil
}
func closeLaunches(ctx context.Context, root, run string, state launchState, d Deps) error {
	for _, l := range state {
		if l.State != "active" && l.State != "pending" {
			continue
		}
		if d.Launcher == nil {
			return fmt.Errorf("起動済みの読者を終了する Launcher がありません")
		}
		if err := d.Launcher.Close(ctx, l.Handle); err != nil {
			return err
		}
		l.State = "closed"
		if err := saveLaunch(root, run, state); err != nil {
			return err
		}
	}
	return nil
}
func prepareWork(p *reviewProject, req Request, run string, a Agent, d Deps, reset bool) error {
	dir := workDir(d, run, a.Agent)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	steps := BuildSteps(p.spec, p.raw, req.Kind)
	if reset {
		for _, s := range steps {
			if err := os.Remove(filepath.Join(dir, s.File)); err != nil && !os.IsNotExist(err) {
				return err
			}
		}
		if err := os.WriteFile(transcriptPath(p.root, run, a.Agent), nil, 0600); err != nil {
			return err
		}
	}
	if !reset {
		f, err := os.OpenFile(transcriptPath(p.root, run, a.Agent), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
		if err != nil {
			return err
		}
		if err := f.Close(); err != nil {
			return err
		}
	}
	persona := ""
	if req.Kind != Consult {
		persona = p.spec.Prompts["persona-"+a.Agent+".md"]
	}
	command := fmt.Sprintf("storyteller review turn --run %s --agent %s", run, a.Agent)
	readme := strings.NewReplacer("{{persona}}", persona, "{{command}}", command, "{{instruction}}", req.Instruction).Replace(p.spec.Prompts[string(req.Kind)+"-readme.md"])
	if err := os.WriteFile(filepath.Join(dir, "README.md"), []byte(readme), 0600); err != nil {
		return err
	}
	if req.Kind == Clarity {
		return placeStep(dir, steps[0])
	}
	for i, c := range p.spec.Chapters {
		if err := os.WriteFile(filepath.Join(dir, filepath.Base(c.File)), []byte(p.raw[i]), 0600); err != nil {
			return err
		}
	}
	return nil
}
func runReaders(ctx context.Context, p *reviewProject, req Request, r Report, d Deps) Report {
	state, err := readLaunch(p.root, r.Run)
	if err != nil {
		return failReport(r, Error, "read", "REV-403", err.Error())
	}
	steps := BuildSteps(p.spec, p.raw, req.Kind)
	allow := req.Team || req.Kind == Interest || req.Kind == Consult
	if allow && (len(p.spec.Agents) == 0 || p.config.Launcher.Ateam == "") {
		return failReport(r, Author, "read", "REV-305", "review.agents と review.launcher.ateam が必要です")
	}
	if len(p.spec.Agents) == 0 {
		return failReport(r, Author, "read", "REV-304", "この本文を読者はまだ読んでいません。--team を付けて読ませてください")
	}
	elapsed := time.Duration(0)
	wait := req.Wait
	if wait == 0 {
		wait = 90 * time.Second
	}
	for {
		r.Agents = nil
		r.Replies = nil
		allDone := true
		unread := false
		for _, a := range p.spec.Agents {
			records, err := readRecords(transcriptPath(p.root, r.Run, a.Agent))
			if err != nil {
				return failReport(r, Error, "read", "REV-403", err.Error())
			}
			done := len(records) == len(steps)
			r.Agents = append(r.Agents, AgentProgress{a.Agent, a.Runtime, a.Model, len(records), len(steps), done})
			if done {
				if req.Kind != Clarity {
					r.Replies = append(r.Replies, AgentReply{a.Agent, a.Runtime, a.Model, records[len(records)-1].Notes})
				}
				continue
			}
			allDone = false
			l := state[a.Agent]
			if l != nil && (l.State == "active" || l.State == "pending") {
				last := l.At
				if len(records) > 0 {
					last = records[len(records)-1].At
				}
				if d.Now().Sub(last).Minutes() >= float64(p.config.StallMinutes) {
					if d.Launcher == nil {
						return failReport(r, Error, "read", "REV-403", "読者を終了する Launcher がありません")
					}
					if err := d.Launcher.Close(ctx, l.Handle); err != nil {
						return failReport(r, Error, "read", "REV-403", err.Error())
					}
					l.State = "stalled"
					if err := saveLaunch(p.root, r.Run, state); err != nil {
						return failReport(r, Error, "read", "REV-403", err.Error())
					}
					return failReport(r, Error, "read", "REV-402", "読者 "+a.Agent+" の記録が進んでいません")
				}
				if l.State == "active" {
					continue
				}
			}
			if !allow {
				unread = true
				continue
			}
			if d.Launcher == nil {
				return failReport(r, Error, "read", "REV-403", "Launcher がありません")
			}
			if l == nil || l.State != "pending" {
				attempts := 1
				if l != nil {
					attempts = l.Attempts + 1
				}
				if attempts > 3 {
					return failReport(r, Error, "read", "REV-402", "読者 "+a.Agent+" の再起動は 2 回までです")
				}
				if err := prepareWork(p, req, r.Run, a, d, l != nil); err != nil {
					return failReport(r, Error, "read", "REV-403", err.Error())
				}
				l = &launchRecord{Attempts: attempts, ID: fmt.Sprintf("%s-%s-a%d", r.Run, a.Agent, attempts), At: d.Now(), State: "pending"}
				l.Handle.ID = l.ID
				state[a.Agent] = l
				if err := saveLaunch(p.root, r.Run, state); err != nil {
					return failReport(r, Error, "read", "REV-403", err.Error())
				}
			}
			h, err := d.Launcher.Launch(ctx, l.ID, workDir(d, r.Run, a.Agent), AgentLaunch{a.Agent, a.Runtime, a.Model, a.Effort, LaunchPrompt})
			if err != nil {
				if ctx.Err() == nil && !errors.Is(err, context.Canceled) && !errors.Is(err, context.DeadlineExceeded) {
					l.State = "failed"
					if saveErr := saveLaunch(p.root, r.Run, state); saveErr != nil {
						return failReport(r, Error, "read", "REV-403", saveErr.Error())
					}
				}
				return failReport(r, Error, "read", "REV-403", err.Error())
			}
			if h.ID == "" {
				h.ID = l.ID
			}
			l.Handle = h
			l.State = "active"
			if err := saveLaunch(p.root, r.Run, state); err != nil {
				return failReport(r, Error, "read", "REV-403", err.Error())
			}
		}
		if allDone {
			if err := closeLaunches(ctx, p.root, r.Run, state, d); err != nil {
				return failReport(r, Error, "read", "REV-403", err.Error())
			}
			r.Verdict = Done
			r.Stage = "read"
			return r
		}
		if unread {
			return failReport(r, Author, "read", "REV-304", "この本文を読者はまだ読んでいません。--team を付けて読ませてください")
		}
		if elapsed >= wait {
			r.Verdict = Reading
			r.Stage = "read"
			return r
		}
		duration := time.Second
		if wait-elapsed < duration {
			duration = wait - elapsed
		}
		if d.Wait != nil {
			err = d.Wait(ctx, duration)
		} else {
			timer := time.NewTimer(duration)
			select {
			case <-ctx.Done():
				err = ctx.Err()
				timer.Stop()
			case <-timer.C:
			}
		}
		if err != nil {
			return failReport(r, Error, "read", "REV-403", err.Error())
		}
		elapsed += duration
	}
}
func runTypo(ctx context.Context, req Request, d Deps) Report {
	r := baseReport(Typo)
	runner := d.Runner
	if runner == nil {
		runner = process.RealRunner{}
	}
	available := d.TextlintAvailable
	if available == nil {
		available = func(ctx context.Context) (bool, string) { return textlint.IsAvailable(ctx, runner) }
	}
	if ok, reason := available(ctx); !ok {
		return failReport(r, Error, "", "REV-404", "textlint がありません: "+reason)
	}
	worker := d.Textlint
	if worker == nil {
		worker = textlint.NewRealWorker(runner, clock.RealClock{})
	}
	path := req.Path
	if path == "" {
		path = "manuscripts"
	}
	files, err := os.ReadDir(path)
	if err != nil {
		return failReport(r, Error, "", "", err.Error())
	}
	for _, f := range files {
		if f.IsDir() || !strings.HasSuffix(f.Name(), ".md") {
			continue
		}
		file := filepath.Join(path, f.Name())
		data, err := os.ReadFile(file)
		if err != nil {
			return failReport(r, Error, "", "", err.Error())
		}
		messages, err := worker.Lint(ctx, file, data)
		if err != nil {
			return failReport(r, Error, "", "REV-404", err.Error())
		}
		for _, m := range messages {
			r.Findings = append(r.Findings, Finding{Code: "REV-501", Severity: "error", File: file, Line: m.Line, Quote: quoteLine(file, m.Line), Message: m.RuleID + ": " + m.Message, Blocking: true})
		}
	}
	r.Verdict = Pass
	if len(r.Findings) > 0 {
		r.Verdict = Edit
	}
	return r
}
