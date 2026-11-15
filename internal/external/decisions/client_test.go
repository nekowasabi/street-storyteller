package decisions_test

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/takets/street-storyteller/internal/external/decisions"
	"github.com/takets/street-storyteller/internal/service/review"
)

// R14: the request to the decision model must equal the golden request, and
// every failure shape must be an error.

type goldenCell struct {
	Model string `json:"model"`
	Judge []struct {
		Question string   `json:"question"`
		Must     []string `json:"must"`
		Extra    string   `json:"extra"`
		Answer   string   `json:"answer"`
		Queries  []struct {
			Instructions string          `json:"instructions"`
			Request      json.RawMessage `json:"request"`
		} `json:"queries"`
	} `json:"judge"`
}

// goldenQuery rebuilds the first judge query of the golden file without going
// through the proposition loader.
func goldenQuery(t *testing.T) (review.Query, string, json.RawMessage) {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("..", "..", "service", "review", "testdata", "rainkey", "golden-queries.json"))
	if err != nil {
		t.Fatal(err)
	}
	var g goldenCell
	if err := json.Unmarshal(b, &g); err != nil {
		t.Fatal(err)
	}
	c := g.Judge[0]
	q := review.Query{State: c.Answer, KeyState: c.Answer, Instructions: c.Queries[0].Instructions}
	return q, g.Model, asQ0(t, c.Queries[0].Request)
}

// asQ0 renames the golden request's single question to q0, the name a bundled
// request gives its first question.
func asQ0(t *testing.T, request json.RawMessage) json.RawMessage {
	t.Helper()
	var r map[string]any
	if err := json.Unmarshal(request, &r); err != nil {
		t.Fatal(err)
	}
	qs := r["questions"].(map[string]any)
	for name, q := range qs {
		delete(qs, name)
		qs["q0"] = q
	}
	b, _ := json.Marshal(r)
	return b
}

func canonical(t *testing.T, b []byte) any {
	t.Helper()
	var v any
	if err := json.Unmarshal(b, &v); err != nil {
		t.Fatalf("not JSON: %v\n%s", err, b)
	}
	return v
}

type capture struct {
	auth, contentType string
	body              []byte
	method, path      string
	calls             int
}

func server(t *testing.T, status int, response string, c *capture) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c.calls++
		c.auth = r.Header.Get("Authorization")
		c.contentType = r.Header.Get("Content-Type")
		c.method, c.path = r.Method, r.URL.Path
		c.body, _ = io.ReadAll(r.Body)
		w.WriteHeader(status)
		io.WriteString(w, response)
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestDecisions_SendsGoldenRequestWithBearerAndReadsNoul(t *testing.T) {
	q, model, want := goldenQuery(t)
	var c capture
	srv := server(t, 200, `{"answers":{"q0":{"noul":0.731}}}`, &c)
	client := &decisions.Client{HTTPClient: srv.Client(), URL: srv.URL, APIKey: "sk-test"}
	v, err := client.Decide(context.Background(), model, []review.Query{q})
	if err != nil || len(v) != 1 || v[0] != 0.731 {
		t.Fatalf("Decide = %v, %v", v, err)
	}
	if c.method != http.MethodPost || c.auth != "Bearer sk-test" || c.contentType != "application/json" {
		t.Errorf("method %s auth %q content-type %q", c.method, c.auth, c.contentType)
	}
	if !reflect.DeepEqual(canonical(t, c.body), canonical(t, want)) {
		t.Errorf("body differs\n got: %s\nwant: %s", c.body, want)
	}
}

func TestDecisions_BundleSendsQNamesAndReadsInOrder(t *testing.T) {
	q, model, _ := goldenQuery(t)
	q2, q3 := q, q
	q2.Instructions, q3.Instructions = "二つ目の問い", "三つ目の問い"
	var c capture
	srv := server(t, 200, `{"answers":{"q2":{"noul":0.3},"q0":{"noul":0.1},"q1":{"noul":0.2}}}`, &c)
	client := &decisions.Client{HTTPClient: srv.Client(), URL: srv.URL, APIKey: "k"}
	v, err := client.Decide(context.Background(), model, []review.Query{q, q2, q3})
	if err != nil || !reflect.DeepEqual(v, []float64{0.1, 0.2, 0.3}) {
		t.Fatalf("Decide = %v, %v", v, err)
	}
	var body struct {
		State     string `json:"state"`
		Questions map[string]struct {
			Instructions string `json:"instructions"`
		} `json:"questions"`
	}
	if err := json.Unmarshal(c.body, &body); err != nil {
		t.Fatal(err)
	}
	if c.calls != 1 || body.State != q.State || len(body.Questions) != 3 ||
		body.Questions["q0"].Instructions != q.Instructions || body.Questions["q1"].Instructions != "二つ目の問い" || body.Questions["q2"].Instructions != "三つ目の問い" {
		t.Errorf("calls=%d body=%s", c.calls, c.body)
	}
}

func TestDecisions_PartialBundleIsError(t *testing.T) {
	q, model, _ := goldenQuery(t)
	var c capture
	srv := server(t, 200, `{"answers":{"q0":{"noul":0.1},"q1":{"noul":0.2}}}`, &c)
	client := &decisions.Client{HTTPClient: srv.Client(), URL: srv.URL, APIKey: "k"}
	if v, err := client.Decide(context.Background(), model, []review.Query{q, q, q}); err == nil {
		t.Errorf("accepted a response with 2 of 3 answers: %v", v)
	}
}

// R24: against the real endpoint, a bundled request gives each question the
// value it gets alone. Sends only the public sample. Opt-in.
func TestDecisions_LiveBundleEqualsSingles(t *testing.T) {
	if os.Getenv("STORYTELLER_REVIEW_LIVE") == "" || os.Getenv("OPENROUTER_API_KEY") == "" {
		t.Skip("set STORYTELLER_REVIEW_LIVE=1 and OPENROUTER_API_KEY to call the decision model")
	}
	b, err := os.ReadFile(filepath.Join("..", "..", "service", "review", "testdata", "rainkey", "golden-queries.json"))
	if err != nil {
		t.Fatal(err)
	}
	var g goldenCell
	if err := json.Unmarshal(b, &g); err != nil {
		t.Fatal(err)
	}
	cell := g.Judge[2]
	var qs []review.Query
	for _, q := range cell.Queries {
		qs = append(qs, review.Query{State: cell.Answer, KeyState: cell.Answer, Instructions: q.Instructions})
	}
	client := decisions.New()
	bundled, err := client.Decide(context.Background(), g.Model, qs)
	if err != nil || len(bundled) != len(qs) {
		t.Fatalf("bundled = %v, %v", bundled, err)
	}
	for i, q := range qs {
		single, err := client.Decide(context.Background(), g.Model, []review.Query{q})
		if err != nil || single[0] != bundled[i] {
			t.Errorf("question %d: alone %v, bundled %v, err %v", i, single, bundled[i], err)
		}
	}
	t.Logf("bundled values: %v", bundled)
}

func TestDecisions_NoKeyIsErrorWithoutRequest(t *testing.T) {
	q, model, _ := goldenQuery(t)
	var c capture
	srv := server(t, 200, `{"answers":{"q0":{"noul":0.5}}}`, &c)
	client := &decisions.Client{HTTPClient: srv.Client(), URL: srv.URL, APIKey: ""}
	if _, err := client.Decide(context.Background(), model, []review.Query{q}); err == nil {
		t.Fatal("no key accepted")
	}
	if c.calls != 0 {
		t.Errorf("request sent without a key")
	}
}

func TestDecisions_Non200IsError(t *testing.T) {
	q, model, _ := goldenQuery(t)
	for _, status := range []int{401, 429, 500} {
		var c capture
		srv := server(t, status, `{"answers":{"q0":{"noul":0.5}}}`, &c)
		client := &decisions.Client{HTTPClient: srv.Client(), URL: srv.URL, APIKey: "k"}
		if _, err := client.Decide(context.Background(), model, []review.Query{q}); err == nil {
			t.Errorf("HTTP %d accepted", status)
		}
	}
}

func TestDecisions_WrongShapeIsError(t *testing.T) {
	q, model, _ := goldenQuery(t)
	for _, body := range []string{
		`not json`,
		`{}`,
		`{"answers":{}}`,
		`{"answers":{"fact":{"noul":0.5}}}`,
		`{"answers":{"q0":{"noul":"0.5"}}}`,
		`{"answers":{"q0":{"noul":1.5}}}`,
		`{"answers":{"q0":{}}}`,
	} {
		var c capture
		srv := server(t, 200, body, &c)
		client := &decisions.Client{HTTPClient: srv.Client(), URL: srv.URL, APIKey: "k"}
		if _, err := client.Decide(context.Background(), model, []review.Query{q}); err == nil {
			t.Errorf("accepted %s", body)
		}
	}
}

func TestDecisions_DefaultEndpointAndEnvKey(t *testing.T) {
	t.Setenv("OPENROUTER_API_KEY", "from-env")
	c := decisions.New()
	if c.APIKey != "from-env" || c.URL != "https://openrouter.ai/api/alpha/decisions" {
		t.Errorf("New() = key %q url %q", c.APIKey, c.URL)
	}
}
