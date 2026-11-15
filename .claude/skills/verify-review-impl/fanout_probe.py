# verify-review-impl R24。見本（雨夜の鍵）の問いだけを判定モデルに送り、1 問ずつ送った値と束ねて送った値を比べる。
# 使い方: OPENROUTER_API_KEY=... python3 -I fanout_probe.py internal/service/review/testdata/rainkey/golden-queries.json [モデル名]
# モデル名を渡すと、そのモデルで同じ 12 問を測る（差し替える前に、値の出方を今のモデルと比べるため）。
import json, os, sys, urllib.request, time
URL = "https://openrouter.ai/api/alpha/decisions"
KEY = os.environ["OPENROUTER_API_KEY"]
g = json.load(open(sys.argv[1]))
MODEL = sys.argv[2] if len(sys.argv) > 2 else g["model"]
def call(state, questions):
    body = json.dumps({"model": MODEL, "state": state, "questions": questions}, ensure_ascii=False).encode()
    req = urllib.request.Request(URL, data=body, headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
    t = time.time()
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            d = json.load(r)
    except urllib.error.HTTPError as e:
        return {"_error": "HTTP %d %s" % (e.code, e.read()[:300].decode("utf-8", "replace"))}, time.time() - t
    return {k: v.get("noul") for k, v in d.get("answers", {}).items()}, time.time() - t
def noul(i): return {"type": "noul", "instructions": i}
SPEC = {"spec_unknown": noul("この答えは「不明」または「分からない」と述べているか。"), "spec_ja": noul("この答えは日本語で書かれているか。"), "spec_long": noul("この答えは 100 文字より長いか。")}
out = {"judge": [], "probe": [], "time": {}}
ts = {"single": [], "bundle": [], "bundle_spec": []}
for cell in g["judge"]:
    state = cell["queries"][0]["request"]["state"]
    ins = [q["instructions"] for q in cell["queries"]]
    a1, a2, b = [], [], []
    for i in ins:
        r, t = call(state, {"f": noul(i)}); a1.append(r.get("f", r)); ts["single"].append(t)
        r, _ = call(state, {"f": noul(i)}); a2.append(r.get("f", r))
        r, _ = call(state, {"q0": noul(i)}); b.append(r.get("q0", r))
    qs = {("whole" if n == 0 else "item%d" % n): noul(i) for n, i in enumerate(ins)}
    c, t = call(state, qs); ts["bundle"].append(t)
    d, t = call(state, {**qs, **SPEC}); ts["bundle_spec"].append(t)
    # 逆順でも同じか
    e, _ = call(state, dict(reversed(list(qs.items()))))
    names = list(qs)
    out["judge"].append({"cell": cell["fact"] + "/" + cell["ref"], "single1": a1, "single2": a2, "renamed": b,
        "bundle": [c.get(n, c) for n in names], "bundle_spec": [d.get(n, d) for n in names], "bundle_rev": [e.get(n, e) for n in names],
        "spec_answers": {k: d.get(k) for k in SPEC}})
for p in g["probe"]:
    state = p["request"]["state"]; i = p["request"]["questions"]["fact"]["instructions"]
    s1, _ = call(state, {"fact": noul(i)}); s2, _ = call(state, {"fact": noul(i)})
    rn, _ = call(state, {"q0": noul(i)})
    sp, _ = call(state, {"fact": noul(i), "spec": noul("state の本文に、人物の台詞が含まれているか。")})
    out["probe"].append({"fact": p["fact"], "single1": s1.get("fact", s1), "single2": s2.get("fact", s2), "renamed": rn.get("q0", rn), "with_spec": sp.get("fact", sp)})
# 別の事実の probe を同じ state に束ねられるか（loc の state に door の問いを足す）
p0, p1 = g["probe"][0], g["probe"][1]
x, _ = call(p1["request"]["state"], {"fact": noul(p1["request"]["questions"]["fact"]["instructions"]), "fact2": noul(p0["request"]["questions"]["fact"]["instructions"])})
out["probe_bundle_loc_state"] = x
# 1 回の送信に 20 問を載せても全部返るか
cell = g["judge"][2]; state = cell["queries"][0]["request"]["state"]
many = {"q%d" % n: noul(cell["queries"][n % len(cell["queries"])]["instructions"] + " " * (n // len(cell["queries"]))) for n in range(20)}
m, t = call(state, many)
out["many20"] = {"returned": sum(1 for k in many if isinstance(m.get(k), (int, float))), "seconds": round(t, 2), "error": m.get("_error")}
out["time"] = {k: round(sum(v) / max(len(v), 1), 2) for k, v in ts.items()}
print(json.dumps(out, ensure_ascii=False, indent=1))
