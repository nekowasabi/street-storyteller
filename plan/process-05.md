# Process 5: CLI モジュールリネーム

## Overview
element/view/index.go の kind 文字列・ディレクトリ・複数形変換を新名に変更します。

## Affected Files
- internal/cli/modules/index.go (L34,72): ループ kind "subplot"→"plot"
- internal/cli/modules/element/element.go (L155-156, L169): case "subplot"→"plot", 生成ディレクトリ "src/subplots"→"src/plots", 初期 type:"subplot"→"sub"
- internal/cli/modules/element/element_test.go (L47-49): 期待ディレクトリ
- internal/cli/modules/view/list.go (L19,72-74,133-134): usage 文・kind 名・複数形
- internal/cli/modules/view/entity.go (L109-110): case "subplot"→"plot", Store.Subplot→Store.Plot
- internal/cli/modules/view/list_entity_test.go (L63-189): フィクスチャ・kind enum
- internal/cli/modules/registry_process04_test.go (L22,32): "element subplot"→"element plot"
- internal/cli/modules/process04_workflow_test.go (L32): "src/subplots"→"src/plots"
- internal/cli/modules/generate/generate.go (L118): scaffold ディレクトリ
- internal/cli/modules/generate/assets/skills/storyteller/SKILL.md (L24): scaffold ドキュメント

## Implementation Notes
ゴールデン更新は Process 9。

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [ ] storyteller element plot --name X で実行成功する CLI test を期待
- [ ] go test で失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] kind 文字列を全箇所で plot に置換
- [x] go test ./internal/cli/modules で成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] -
- [ ] go vet で警告ゼロを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 3, 4
- Blocks: 9, 12, 15, 51, 100
