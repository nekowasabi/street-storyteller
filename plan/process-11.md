# Process 11: Plugin テスト

## Overview
src/plugins/core/subplot/plugin.ts と validator.ts の単体テスト。特に preconditionBeatIds 循環検出。Subplot プラグインが正しくエレメントファイルを生成し、循環参照を検出できることを確認します。

## Affected Files
- 新規: tests/plugins/core/subplot/plugin_test.ts
- 新規: tests/plugins/core/subplot/validator_test.ts
- 参考: tests/plugins/core/foreshadowing/

## Implementation Notes
createElementFile が src/subplots/{id}.ts を返すことを確認。generateTypeScriptFile が `import type { Subplot } from "@storyteller/types/v2/subplot.ts";` を含むことを確認。validator: 必須フィールド欠如時のエラー、type 不正値、status 不正値。**重要**: 循環検出テスト 「beat_a.preconditionBeatIds=[beat_b], beat_b.preconditionBeatIds=[beat_a] → エラー」、自己参照「beat_a.preconditionBeatIds=[beat_a] → エラー」

---

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] "validateSubplot rejects missing name"
- [ ] "validateSubplot rejects invalid type value"
- [ ] "detectBeatPreconditionCycles detects A→B→A cycle"
- [ ] "detectBeatPreconditionCycles detects self-reference"
- [ ] "detectBeatPreconditionCycles allows linear DAG"
- [ ] テストを実行して失敗確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] 対応する Process 11 (impl) を実装後、`deno test tests/plugins/core/subplot/plugin_test.ts tests/plugins/core/subplot/validator_test.ts` で全テスト成功

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] テストの命名・構造を改善
- [ ] テストヘルパー関数を抽出

✅ **Phase Complete**

---

## Dependencies
- Requires: 02
- Blocks: -
