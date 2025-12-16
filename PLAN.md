# title: LSPセマンティックトークン スクロール時ハイライト崩れ修正

## 概要

- Neovim（nvim-lspconfig）でスクロール時にセマンティックトークンのハイライトが崩れる問題を修正し、LSP仕様に準拠した正しいハイライト表示を実現する

### goal

- Neovimでマークダウンファイルをスクロールしても、キャラクター名・設定名のハイライトが正しい位置に表示される
- ハイライトの位置ずれ、長さの違い、ハイライト消失が発生しない

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール

- `textDocument/semanticTokens/range`のレスポンスがLSP仕様に準拠する
- スクロール時にハイライトが崩れない

## 実装仕様

### LSP仕様（根拠）

LSP 3.17仕様によると、セマンティックトークンは以下のルールに従う：

- [LSP Specification - Semantic Tokens](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_semanticTokens)

#### 相対位置エンコーディング

トークンは5つの整数の配列としてエンコードされる：

```
[deltaLine, deltaStartChar, length, tokenType, tokenModifiers]
```

- `deltaLine`: 前のトークンからの行数差分（最初のトークンは0行目からの差分）
- `deltaStartChar`:
  - 同じ行の場合: 前のトークンからの文字位置差分
  - 新しい行の場合: 行頭からの絶対位置

#### semanticTokens/range の仕様

**重要**:
`semanticTokens/range`は「計算の最適化」のためのリクエストであり、レスポンスのフォーマットは`semanticTokens/full`と**完全に同じ**である必要がある。

> The request to request semantic tokens for a range. The response can be a
> SemanticTokens or a SemanticTokensPartialResult.
>
> Note: the data is returned in an **unchanged format** from the full request.

つまり、トークンの位置はドキュメントの**絶対位置**をベースにした相対エンコーディングで返す必要がある。

### 問題の根本原因

現在の実装（`semantic_tokens_provider.ts:91-94`）:

```typescript
// 範囲の開始行を基準にline_deltaを再計算
const adjustedTokens = filteredTokens.map((token) => ({
  ...token,
  line: token.line - range.start.line, // ← LSP仕様違反
}));
```

この実装では、範囲の開始行を基準に行番号を調整している。例えば、行10〜20をリクエストすると、行10のトークンが行0として返される。Neovimは行10の位置にハイライトを適用しようとするが、行0として情報が来るため、ハイライトが行0にずれてしまう。

## 生成AIの学習用コンテキスト

### 実装対象

- `src/lsp/providers/semantic_tokens_provider.ts`
  - `getSemanticTokensRange()`メソッドの修正
  - `encodeTokens()`メソッドの動作確認

### テスト対象

- `tests/lsp/providers/semantic_tokens_provider_test.ts`
  - 既存テストの期待値修正
  - 新規テストケース追加

### 参照ファイル

- `src/lsp/server/capabilities.ts`
  - セマンティックトークンのcapabilities定義
- `src/lsp/server/server.ts`
  - `handleSemanticTokensRange()`ハンドラー（行475-493）
- `src/lsp/detection/positioned_detector.ts`
  - トークン位置検出ロジック

## Process

### process1 テスト期待値の修正（Red Phase準備）

既存のテストがLSP仕様違反の実装に合わせた期待値になっているため、まずLSP仕様準拠の期待値に修正する。

#### sub1 範囲リクエストテストの期待値修正

@target: `tests/lsp/providers/semantic_tokens_provider_test.ts` @ref: LSP 3.17
Specification

##### TDD Step 1: Red（期待値を仕様準拠に変更）

@test: `tests/lsp/providers/semantic_tokens_provider_test.ts`

- [ ] `getSemanticTokensRange excludes out-of-range tokens`テストの期待値を修正
  - 現在: `assertEquals(result.data[0], 0)` （範囲の開始行を基準）
  - 修正後: `assertEquals(result.data[0], 1)` （ドキュメントの絶対位置）
  - この時点でテストは失敗する（現在の実装はLSP仕様違反のため）

##### TDD Step 2: Green（このステップはprocess2で実施）

- process2で実装を修正し、このテストを通過させる

##### TDD Step 3: Refactor & Verify

- [ ] テスト実行コマンド:
      `deno test tests/lsp/providers/semantic_tokens_provider_test.ts --filter "getSemanticTokensRange"`
- [ ] テストが失敗することを確認（Red状態）

---

### process2 semantic_tokens_provider.tsの修正

#### sub1 行調整ロジックの削除

@target: `src/lsp/providers/semantic_tokens_provider.ts` @ref: LSP 3.17
Specification

##### TDD Step 1: Red（process1で作成済み）

- process1で修正したテストがRed状態

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `getSemanticTokensRange()`メソッドの修正（行90-96）
  - 現在のコード:
    ```typescript
    const adjustedTokens = filteredTokens.map((token) => ({
      ...token,
      line: token.line - range.start.line,
    }));
    const data = this.encodeTokens(adjustedTokens);
    ```
  - 修正後:
    ```typescript
    // LSP仕様: 位置はドキュメントの絶対位置を維持
    // 相対エンコーディングは encodeTokens 内で行われる
    const data = this.encodeTokens(filteredTokens);
    ```
  - `adjustedTokens`変数の削除
  - `filteredTokens`を直接`encodeTokens`に渡す

##### TDD Step 3: Refactor & Verify

- [ ] テスト実行:
      `deno test tests/lsp/providers/semantic_tokens_provider_test.ts`
- [ ] すべてのテストが通過することを確認（Green状態）
  - **テストが失敗した場合**: 修正 → テスト実行を繰り返す
- [ ] コードレビュー: 不要なコメントや変数がないか確認

---

### process10 ユニットテスト（追加・統合テスト）

#### sub1 絶対位置維持の確認テスト

@target: `tests/lsp/providers/semantic_tokens_provider_test.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/providers/semantic_tokens_provider_test.ts`

- [ ] テストケース: `getSemanticTokensRange maintains absolute positions`
  - 3行目にトークンがある場合、行2-3を要求すると行2（絶対位置）が返される
  ```typescript
  Deno.test("SemanticTokensProvider - getSemanticTokensRange maintains absolute positions", async () => {
    const content = "あいう\nかきく\n城に行った\nたちつ";
    const range = {
      start: { line: 2, character: 0 },
      end: { line: 3, character: 100 },
    };
    const result = provider.getSemanticTokensRange(
      "file:///test.md",
      content,
      range,
      "/project",
    );
    // 「城」は絶対行番号2
    assertEquals(result.data[0], 2); // line_delta = 2
    assertEquals(result.data[1], 0); // character
  });
  ```

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] process2の実装で既にGreen状態になっているはず

##### TDD Step 3: Refactor & Verify

- [ ] テスト実行し、通過することを確認
- [ ] 必要に応じてテストケースを追加

#### sub2 複数トークンの相対エンコーディングテスト

@target: `tests/lsp/providers/semantic_tokens_provider_test.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/providers/semantic_tokens_provider_test.ts`

- [ ] テストケース:
      `getSemanticTokensRange with multiple tokens preserves relative encoding`
  - 複数行に複数トークンがある場合、相対エンコーディングが正しいか確認
  ```typescript
  Deno.test("SemanticTokensProvider - getSemanticTokensRange with multiple tokens preserves relative encoding", async () => {
    const content = "はじめに\n勇者が登場\n城に到着\n終わり";
    const range = {
      start: { line: 1, character: 0 },
      end: { line: 2, character: 100 },
    };
    const result = provider.getSemanticTokensRange(
      "file:///test.md",
      content,
      range,
      "/project",
    );
    // 2つのトークン
    assertEquals(result.data.length, 10);
    // 1つ目: 勇者（絶対行1）
    assertEquals(result.data[0], 1); // line_delta from 0
    // 2つ目: 城（絶対行2、前のトークンから1行下）
    assertEquals(result.data[5], 1); // line_delta from previous
  });
  ```

##### TDD Step 2: Green

- [ ] process2の実装で既にGreen状態になっているはず

##### TDD Step 3: Refactor & Verify

- [ ] テスト実行し、通過することを確認

---

### process50 フォローアップ

（実装後に仕様変更などが発生した場合は、ここにProcessを追加する）

---

### process100 リファクタリング

- [ ] `getSemanticTokensRange`メソッドのコメント更新
  - LSP仕様準拠であることを明記
- [ ] 不要なコード（adjustedTokens関連）が完全に削除されていることを確認
- [ ] 全テスト実行: `deno test tests/lsp/`

---

### process200 ドキュメンテーション

- [ ] `docs/lsp.md`に修正内容を追記（必要に応じて）
- [ ] `CLAUDE.md`の関連セクションに問題と解決策を記録（必要に応じて）

---

## 検証手順（手動テスト）

1. LSPサーバーを再起動
2. Neovimでマークダウンファイルを開く
3. キャラクター名・設定名が正しくハイライトされることを確認
4. スクロールしてもハイライトが崩れないことを確認
5. 複数行にわたるファイルで上下にスクロールし、ハイライトが正しく表示されることを確認
