# Process 6: validate.ts に --strict フラグと err() 返却ロジック追加

## Overview

`--strict` フラグを追加。Low confidence (< 0.7) の参照が1件以上検出された場合に
err() で `{ code: "validation_errors", message: ... }` を返却し exit 1
させる。既定動作（パースエラー / ファイル未存在のみ exit 1）は維持。cli.ts:93-98
の制約により全エラーは exit 1 に集約される（別 Issue で細分化予定）。

## Affected Files

- @modify `src/cli/modules/lsp/validate.ts`
  - LSP_VALIDATE_OPTIONS に `--strict` (type: boolean) 追加
  - handle() 内で strict モード判定 → Low 件数 > 0 なら err() 返却
  - code: "validation_errors" を使用（lint の LINT_ERROR と並ぶ命名規約）
- cli.ts:93-98 の Deno.exit(1) 制約: 改修しない

## Implementation Notes

- err code 文字列は snake_case 規則（lint の "LINT_ERROR" から一貫性確認）
- message は "Low confidence references found in strict mode: {count}" など
- --strict + --json の挙動: err() でも JSON 出力をコンソールに出すか要設計 →
  既存 JSON 出力を err 前に出力、その後 err 返却
- 既存テスト: err() 返却時の messages 確認方法を process-12 で実装

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] Process 12 で詳細テスト作成

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] ブリーフィング確認
- [ ] --strict オプション追加
- [ ] Low confidence 検出時 err(code: "validation_errors") 返却
- [ ] --strict + --json 時の挙動確定（JSON 出力 → err 返却の順）
- [ ] Process 12 テスト Green

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] エラーメッセージの国際化準備（future work 用コメント）
- [ ] deno fmt / lint
- [ ] 既存テスト継続成功確認

✅ **Phase Complete**

---

## Dependencies

- Requires: 3, 5
- Blocks: 12, 50
