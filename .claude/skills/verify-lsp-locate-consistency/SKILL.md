---
name: verify-lsp-locate-consistency
description: LSP の entity 解決（internal/lsp/server の Locate / Definition）が、プロジェクト loader（internal/project）が読んだ entity と id キー・走査ディレクトリの両面で一致しているかを検証するスキル。internal/lsp/server/factories.go の entityFiles / newProjectAdapter / projectAdapter.Locate、manifest の paths 設定（internal/project/manifest）、または loader 側の読み込みディレクトリに触れる変更をしたら、コミット前に必ずこのスキルを開き、go test ./internal/lsp/server/ を実行して V1–V7 と照合すること。
---

# verify-lsp-locate-consistency スキル

LSP の定義ジャンプが「検出側（store / loader）」と「ジャンプ側（Locate）」で
同じ entity を同じファイルへ解決できることを守る検証スキル。
由来: Issue #21（`textDocument/definition` が entity id ではなくファイル名で
ジャンプ先を引いていた問題）。

## プロパティ（1文）

store が見つけられるすべての entity について、`Locate` はその entity が
読み込まれたファイルを返す。ファイル名が何であっても、プロジェクトの
manifest がどのディレクトリを設定していても。

## 壊れると何が起きるか

検出は store を読むためハイライトとホバーは効くのに、定義ジャンプだけが
何も返さなくなる。`Locate` が loader とは違うキー空間、あるいは違う
ディレクトリを見ているためである。書き手は、名前にファイル名へできない
文字（中黒「・」など）を含む entity についてだけジャンプ機能が壊れている
と結論づける。

## ツール選択

実コードに対する Go テストを使う。対象は1つのアダプタ
（`internal/lsp/server/factories.go` の `projectAdapter`）の決定的な整合性
プロパティであり、状態機械も並行性も入力空間の爆発もない。モデル検査は
コードではなく手作りのモデルを検証することになる。この repo の既存の
仕組み（`go test ./internal/lsp/server/`）が、実コードを走らせる最も
安いチェックである。

## 対象コード（変更が触れるかの判定）

次のいずれかに触れる変更はこの検証の対象である。

- `internal/lsp/server/factories.go` の `entityFiles`、`newProjectAdapter`、
  `projectAdapter.Locate`
- loader 側の錨: `internal/project/project.go` の `project.Load`、
  `internal/project/manifest/manifest.go` の `manifest.PathConfig`
- entity ファイルの除外規則（`index.ts`、`*.test.ts`、`*.d.ts`、
  `*_test.ts` を Locate 対象から外すフィルタ）

## チェックの実行

```sh
go test ./internal/lsp/server/
```

全項目（V1–V7）はこのパッケージのテストとして実装されている。
個別の項目だけを確認したい場合は `-run <テスト名>` を使う。

## 結果の読み方

このチェックは実コードへのテストなので、失敗はモデルとの齟齬ではなく
振る舞いの不一致である。切り分けは次のとおり。

- **意図しない失敗 = バグ。** loader と Locate のキー（パース済み id）や
  ディレクトリ集合（manifest の `paths`）が再び乖離している。
  実装側を直し、項目やテストを弱めて合わせない。
- **意図した変更で失敗した場合**（例: manifest の `paths` の意味や
  デフォルト配置を変えた）は、項目・テスト・このスキルのカバレッジ記録を
  同じコミットで更新し、下記の sync commit を新しいコミットへ進める。
  sync commit は「検証がそのコミットのコードを正しく記述している」と
  確認した後にだけ進めること。

## 検証項目

### V1. manifest で設定したディレクトリのキャラクター（id ≠ ファイル名）

- 主張: `paths.characters` に非デフォルトのディレクトリを設定したとき、
  パース済み `id` がファイル名 stem と異なるキャラクターが、設定先
  ディレクトリのファイルを指して、パース済み id で `Locate` できる。
  ファイル名 stem では解決できない。
- チェック: `TestLocate_UsesManifestConfiguredPaths`
  （`internal/lsp/server/factories_test.go`）
- 修正前に fail する理由: `entityFiles` が存在しない `src/characters` を
  走査するため対応表が空になり、`Locate` が false を返す。

### V2. manifest で設定したディレクトリの設定と伏線

- 主張: V1 と同じことが `paths.settings` と `paths.foreshadowings`
  についても成り立つ。
- チェック: `TestLocate_UsesManifestConfiguredPathsForSettingAndForeshadowing`
- 修正前に fail する理由: V1 と同じ仕組み。

### V3. 報告された再現手順が直ったままであること（デフォルト配置）

- 主張: デフォルト配置で、`src/characters/ビッグママ.ts`（`id`/`name` は
  `ビッグ・マム`）が、パース済み id で `Locate` とエンドツーエンドの
  `Definition` の両方から解決でき、stem では解決できない。
- チェック: 既存の `TestLocate_UsesParsedIDNotFilename` と
  `TestDefinition_ResolvesParsedIDToDifferentFilename`。
- 修正前後とも pass: PR #22 の修正に対する回帰ガード。

### V4. 設定パスでも stem フォールバックが効く

- 主張: 設定先のキャラクターディレクトリにある、entity としてパース
  できないファイルは、ファイル名 stem で到達可能なままである
  （コミット `8170126` 以来保たれているフォールバック）。プロジェクト
  読み込みが degrade し、アダプタが manifest を保持していない場合でも。
- チェック: `TestLocate_StemFallbackUsesManifestPaths`
- 修正前に fail する理由: degrade したアダプタがデフォルトの
  ディレクトリしか走査しないため、設定先ディレクトリの stem エントリが
  存在しない。

### V5. 非 entity ファイルが設定ディレクトリで場所を奪えない

- 主張: 設定先のキャラクターディレクトリにある、同じ id にパースされる
  `*_test.ts` ファイルが、本物の entity ファイルの `Locate` エントリを
  上書きしない（`index.ts`、`.test.ts`、`.d.ts` の除外は従来どおり）。
- チェック: `TestLocate_UsesManifestConfiguredPaths` 内のフィクスチャ。
- fail する条件: `isLocatedEntityFile` フィルタが退行すると、テスト
  ファイルが entity ファイルより後に並ぶため、フィルタなしの走査が
  エントリを上書きする。

### V6. 設定パスでのエンドツーエンドの定義ジャンプ

- 主張: 原稿中の `ビッグ・マム` への言及に対する `providers.Definition`
  が、本番の catalog と locator（`NewServerOptions` 経由）を使い、
  設定先ディレクトリのキャラクターファイルというちょうど1件の場所を返す。
- チェック: `TestDefinition_UsesManifestConfiguredPaths`
- 修正前に fail する理由: V1 と同じ仕組みを、利用者が実際に見る
  プロバイダ表面で観測する。

### V7. デフォルト配置の動作は不変

- 主張: パスをカスタマイズしないプロジェクトは sync commit 時点と
  まったく同じに振る舞う。空プロジェクト向けのフォールバック
  オプションも含む。
- チェック: 既存の `internal/lsp/server` スイート、とくに
  `TestNewServerOptions_EmptyProjectReturnsUsableFallback`、
  `TestNewServerOptions_LoadsProjectEntities`、
  `TestLocate_IgnoresTestAndIndexFiles`。
- 修正前後とも pass: 変更の巻き添えを防ぐガード。

## カバレッジ記録

- カバーするコード: `internal/lsp/server/factories.go` の `entityFiles`、
  `newProjectAdapter`、`projectAdapter.Locate`。loader 側の錨は
  `internal/project/project.go` の `project.Load` と
  `internal/project/manifest/manifest.go` の `manifest.PathConfig`。
- Sync commit: `e0dfa0d5bd73d939daffa7ed4210d9e16f99f412`
  （ブランチ `fix/issue-21-locate-manifest-paths` の HEAD）。
  テストは `0360fed2f123a94e195abd6c96ac3f81ce4a6d82`、修正は sync
  commit 本体。項目自体は main の `2872dc9114df86e574202d111dc7028d4f76c874`
  に対して書かれた。
- 実行確認: PR #61 の CI（test / lint / integration / coverage）が
  全て pass し、`go test ./internal/lsp/server/` が修正後コードで
  通ることは実行で確認済み。一方、V1・V2・V4・V6 の「修正前に fail
  する」は `2872dc9` 時点のコードからの静的な導出であり、修正前コード
  での実行確認はしていない。
- 項目を書く前に直っていたもの（回帰ガードのみ）: Issue #21 の id キー
  側。`entityFiles` はコミット
  `817012622f3417eda75e525dca140a863ca76939` 以来パース済み id をキーに
  しており、PR #22 で出荷され、PR #28 で main の実バイナリに対する
  検証済みと記録されている。Issue が引用する stem キーのコードは現行に
  残っていない。残件だったのは上記のディレクトリ側である。
- この sync commit より後に対象コードが変わったら、この項目を
  信頼する前に再確認すること。

## スコープ

検証済み: characters / settings / foreshadowings について、locate の
対応表と loader が id キーとディレクトリ集合で一致すること。
デフォルト配置と manifest 設定配置の両方、degrade した読み込みの
フォールバックを含む。

対象外: timelines と plots（LSP アダプタはこれらに `Locate` を
公開していない）、manifest 自体が不正なプロジェクト（locate 以前に
読み込みが失敗する）。
