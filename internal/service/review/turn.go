package review

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

type Step struct {
	Kind    string
	File    string
	Content string
	Asks    []string
}

func BuildSteps(spec Spec, raw []string, kind Kind) []Step {
	if kind != Clarity {
		return []Step{{Kind: "notes", File: "README.md"}}
	}
	var out []Step
	for i, c := range spec.Chapters {
		out = append(out, Step{Kind: "chapter", File: filepath.Base(c.File), Content: ReaderCopy(raw[i])})
		ask := Step{Kind: "ask", File: fmt.Sprintf("ask-%02d.md", c.Number), Content: fmt.Sprintf("# %d章を読み終えたあとの問い\n", c.Number)}
		for _, f := range spec.Asks {
			if f.Deadline == c.Number {
				ask.Asks = append(ask.Asks, f.ID)
				ask.Content += "\n" + f.ID + ". " + f.Ask.Question + "\n"
			}
		}
		if len(ask.Asks) > 0 {
			out = append(out, ask)
		}
	}
	final := Step{Kind: "reask", File: "ask-final.md", Content: "# 全章を読み終えたあとの再問\n"}
	for _, f := range spec.Asks {
		if f.Ask.Main {
			final.Asks = append(final.Asks, f.ID)
			final.Content += "\n" + f.ID + "（再）. " + spec.Question(f, ReaskRef) + "\n"
		}
	}
	if len(final.Asks) > 0 {
		out = append(out, final)
	}
	return out
}

var answerLine = regexp.MustCompile(`^[-*|\s\p{Z}\x{000b}\x{0085}]*([^\s\p{Z}.．:：]+?)(（再）)?[.．:：]\s*(.+)`)

func ParseAnswers(text string, reask bool) map[string]string {
	plain, again := map[string]string{}, map[string]string{}
	for _, line := range strings.Split(text, "\n") {
		m := answerLine.FindStringSubmatch(line)
		if m == nil {
			continue
		}
		target := plain
		if m[2] != "" {
			target = again
		}
		if _, exists := target[m[1]]; !exists {
			target[m[1]] = strings.TrimSpace(m[3])
		}
	}
	if reask {
		for id, answer := range again {
			plain[id] = answer
		}
	}
	return plain
}
func placeStep(dir string, s Step) error {
	return os.WriteFile(filepath.Join(dir, s.File), []byte(s.Content), 0600)
}
func nextReply(steps []Step, completed int) TurnReply {
	if completed == len(steps) {
		return TurnReply{Done: true, Step: completed, Of: len(steps)}
	}
	s := steps[completed]
	return TurnReply{Step: completed + 1, Of: len(steps), File: s.File, Asks: s.Asks}
}
func Turn(ctx context.Context, req TurnRequest, deps Deps) TurnReply {
	fail := func(code int, err error) TurnReply { return TurnReply{Error: err.Error(), Code: code} }
	if !validRun.MatchString(req.Run) || !validAgent.MatchString(req.Agent) {
		return fail(4, fmt.Errorf("run または読者の名前が不正です"))
	}
	d := defaults(deps)
	var mapping runMap
	if err := readJSON(filepath.Join(d.MapRoot, req.Run+".json"), &mapping); err != nil {
		return fail(4, err)
	}
	p, err := loadProject(mapping.Path)
	if err != nil {
		return fail(4, err)
	}
	if err := p.prepare(mapping.Kind); err != nil {
		return fail(4, err)
	}
	if p.root != mapping.Root || p.readID(mapping.Kind, mapping.Instruction) != mapping.ReadID {
		return fail(4, fmt.Errorf("今の本文または止まる条件と run が違います"))
	}
	var current runMap
	if err := readJSON(currentPath(p.root, mapping.Kind), &current); err != nil || current.Run != req.Run {
		return fail(4, fmt.Errorf("現在の run ではありません"))
	}
	found := false
	for _, a := range p.spec.Agents {
		if a.Agent == req.Agent {
			found = true
		}
	}
	if !found {
		return fail(4, fmt.Errorf("名簿に無い読者です"))
	}
	if mapping.Kind == Clarity {
		report := p.structure()
		if report.Verdict != "" {
			return fail(4, fmt.Errorf("工程1 を通っていません"))
		}
		cache := NewCache(filepath.Join(reviewDir(p.root), "judge-cache.jsonl"), nil)
		for _, q := range ProbeQueries(p.spec, p.text) {
			v, err := cache.Decide(ctx, p.spec.profile().JudgeModel, q)
			if err != nil || v < p.spec.profile().ProbeMin {
				return fail(4, fmt.Errorf("工程2 の合格がキャッシュにありません"))
			}
		}
	}
	unlock, ok, err := acquireLock(transcriptPath(p.root, req.Run, req.Agent)+".lock", d.Now())
	if err != nil {
		return fail(4, err)
	}
	if !ok {
		return fail(1, fmt.Errorf("同じ読者の返答を処理中です"))
	}
	defer unlock()
	records, err := readRecords(transcriptPath(p.root, req.Run, req.Agent))
	if err != nil {
		return fail(4, err)
	}
	steps := BuildSteps(p.spec, p.raw, mapping.Kind)
	if req.Step < 1 || req.Step > len(steps) || req.Step > len(records)+1 {
		return fail(1, fmt.Errorf("先のステップや範囲外のステップは受け取れません"))
	}
	if req.Step <= len(records) {
		if req.Step < len(steps) {
			if err := placeStep(workDir(d, req.Run, req.Agent), steps[req.Step]); err != nil {
				return fail(4, err)
			}
		}
		return nextReply(steps, req.Step)
	}
	step := steps[req.Step-1]
	if req.AnswersText != "" {
		req.Answers = ParseAnswers(req.AnswersText, step.Kind == "reask")
	}
	if step.Kind == "chapter" || step.Kind == "notes" {
		if strings.TrimSpace(req.Notes) == "" || len(req.Answers) > 0 {
			return fail(1, fmt.Errorf("空でない章の記録（--notes）が必要です"))
		}
	} else {
		if req.Notes != "" {
			return fail(1, fmt.Errorf("問いには --answers で答えてください"))
		}
		var missing []string
		for _, id := range step.Asks {
			if strings.TrimSpace(req.Answers[id]) == "" {
				missing = append(missing, id)
			}
		}
		if len(missing) > 0 {
			return fail(1, fmt.Errorf("答えの無い問い: %s", strings.Join(missing, ", ")))
		}
	}
	accepted := map[string]string{}
	for _, id := range step.Asks {
		accepted[id] = req.Answers[id]
	}
	record := StepRecord{Step: req.Step, Kind: step.Kind, File: step.File, Notes: req.Notes, Answers: accepted, At: d.Now()}
	if err := appendRecord(transcriptPath(p.root, req.Run, req.Agent), record); err != nil {
		return fail(4, err)
	}
	if req.Step < len(steps) {
		if err := placeStep(workDir(d, req.Run, req.Agent), steps[req.Step]); err != nil {
			return fail(4, err)
		}
	}
	return nextReply(steps, req.Step)
}

var validRun = regexp.MustCompile(`^r-[0-9a-f]{8}$`)
var validAgent = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)
