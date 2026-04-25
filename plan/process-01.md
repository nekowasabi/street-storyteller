# Process 1: 契約固定とデータ形式決定

## Overview
Go移行で最初に破壊しやすい入出力契約とデータ形式を固定する。現行 TypeScript `export const` を互換維持するか、中立形式へ移行するかを決め、以後の実装判断を安定させる。

## Affected Files
- `docs/migration/go-rearchitecture-requirements.md:31` - RAG/migrate のCLI登録差分を未確定事項として扱う
- `docs/migration/go-rearchitecture-requirements.md:48` - TypeScriptデータ形式の移行選択肢を決定事項へ更新する
- `src/type/v2/character.ts:95` - Character の Go struct 対応表を作る
- `src/type/v2/setting.ts:58` - Setting の Go struct 対応表を作る
- `src/type/v2/foreshadowing.ts:113` - Foreshadowing の Go struct 対応表を作る
- `src/type/v2/timeline.ts:92` - Timeline/Event の Go struct 対応表を作る
- `src/type/v2/subplot.ts:176` - Subplot/Beat/Intersection の Go struct 対応表を作る
- `samples/cinderella/.storyteller.json` - fixture の基準サンプルとして利用する

## Implementation Notes
- まず `samples/cinderella`, `samples/momotaro`, `samples/mistery/old-letter-mystery` を互換性検証の代表サンプルにする。
- TypeScript entity file を読む方針は次のいずれかに固定する。
  - Goで限定的な object literal parser を実装
  - `storyteller migrate-data` で JSON/YAML へ移行
  - 移行期間だけ Deno helper で JSON 抽出
- `.meta.ts` は現行互換出力として残すか、中立形式を併用するかを決める。
- `src/cli/modules/rag` と `src/cli/modules/migrate` が `registerCoreModules()` に未登録な点は、正式機能か実装漏れかを決める。

---

## Red Phase: テスト作成と失敗確認

- [x] ブリーフィング確認
- [x] fixture 方針を文書化し、未決定項目がある場合に失敗するチェックを作る
  - TypeScript形式/中立形式/抽出サブプロセスのどれかが明記されていること
  - v1維持対象コマンド一覧が確定していること
- [x] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [x] データ形式決定を `docs/migration/go-rearchitecture-requirements.md` に反映
- [x] entity type 対応表を追加
- [x] fixture 対象サンプルと契約ファイル一覧を固定
- [x] RAG/migrate の扱いを正式維持/後追い/登録漏れ修正のいずれかに分類
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [x] 決定事項と未決事項を分離
- [x] 後続 Process が参照する用語を統一
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: -
- Blocks: 2, 10
