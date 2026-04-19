# Process 12: element subplot CLI テスト

## Overview
storyteller element subplot コマンドの引数パース・バリデーション・ファイル生成テスト。CLI インターフェースが正しくサブプロットを作成し、フォーカスキャラクターの CSV パースが機能することを確認します。

## Affected Files
- 新規: tests/cli/modules/element/subplot_test.ts (~300行)
- 参考: tests/cli/modules/element/foreshadowing_test.ts:1-302

## Implementation Notes
コマンドパスが ["element", "subplot"] であること。--name 必須、空文字エラー。--type 必須、valid types 内のみ。--summary 必須。--focus-characters CSV パース ("hero:primary,heroine:secondary")。一時ディレクトリで実行し src/subplots/{id}.ts が生成されることを確認。JSON 出力モード (--json) のテスト。

---

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] "rejects missing --name"
- [ ] "rejects invalid --type value 'invalid'"
- [ ] "creates src/subplots/{id}.ts on success"
- [ ] "parses --focus-characters CSV correctly"
- [ ] テストを実行して失敗確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] 対応する Process 12 (impl) を実装後、`deno test tests/cli/modules/element/subplot_test.ts` で全テスト成功

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] テストの命名・構造を改善
- [ ] テストヘルパー関数を抽出

✅ **Phase Complete**

---

## Dependencies
- Requires: 03
- Blocks: -
