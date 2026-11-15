package review

import (
	"encoding/json"
	"strings"
)

type Query struct {
	Name         string
	State        any
	KeyState     string
	Instructions string
}

func (q Query) Key(model string) string {
	return hash(model + "\n" + q.KeyState + "\n" + q.Instructions)
}
func (q Query) Request(model string) any {
	return struct {
		Model     string         `json:"model"`
		State     any            `json:"state"`
		Questions map[string]any `json:"questions"`
	}{model, q.State, map[string]any{q.Name: struct {
		Type         string `json:"type"`
		Instructions string `json:"instructions"`
	}{"noul", q.Instructions}}}
}
func ProbeQueries(spec Spec, text ReaderText) []Query {
	var out []Query
	for _, f := range spec.Asks {
		if !f.Ask.Main || f.Deadline < 1 || f.Deadline > len(text) {
			continue
		}
		state := []string(text[:f.Deadline])
		key, _ := json.Marshal(state)
		out = append(out, Query{"fact", state, string(key), "あなたは state の本文だけを、ここまで初めて読んだ読者である。後の章や本文に無い知識で補わない。この時点の本文の記述だけから、次の事実を成り立つものとして言えるか: " + f.Statement})
	}
	return out
}
func AnswerQueries(spec Spec, f FactAsk, ref Ref, answer string) []Query {
	question := spec.Question(f, ref)
	prefix := "state はある読者が次の問いに答えたものである。問い: " + question
	expected := "必須: " + strings.Join(f.Ask.Answer.Must, "。")
	if f.Ask.Answer.Extra != "" {
		expected += "。補足（無くてよい）: " + f.Ask.Answer.Extra
	}
	out := []Query{{"f", answer, answer, prefix + " 期待する答え: " + expected + " 答えは期待する答えの必須の部分を言えているか。言い換えは認める。補足は無くてよい。"}}
	for _, item := range f.Ask.Answer.Must {
		out = append(out, Query{"f", answer, answer, prefix + " この答えは、次のことを言っているか（言い換えは認める）: " + item})
	}
	return out
}
func JudgeQueries(spec Spec, answers Answers) []Query {
	var out []Query
	for _, cell := range spec.Cells() {
		f, _ := spec.fact(cell.Fact)
		out = append(out, AnswerQueries(spec, f, cell.Ref, answers[cell])...)
	}
	return out
}
