# title: 伏線アノテーションのセマンティックハイライト機能

## 概要

- HTMLコメント行上アノテーション `<!-- @foreshadowing:ID -->`
  を、伏線の状態（planted/resolved）に応じた色でハイライト表示
- 物語の品質チェック時に、伏線が回収されているかを視覚的に即座に判別可能にする

### goal

- 作家がNeovimで執筆中、アノテーション行がコメントグレーではなく**状態に応じた色**で表示される
- 未回収の伏線（planted）はオレンジ、回収済み（resolved）は緑で表示

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール

- `PositionedDetector`がHTMLコメントアノテーションを検出し、セマンティックトークンとして登録
- Neovimでステータス別の色分けハイライトが動作

## 実装仕様

### 色分け仕様

| ステータス           | 色       | Hex     | 意味                 |
| -------------------- | -------- | ------- | -------------------- |
| `planted`            | オレンジ | #e67e22 | 伏線設置済み・未回収 |
| `partially_resolved` | 黄色     | #f1c40f | 部分的に回収         |
| `resolved`           | 緑       | #27ae60 | 完全回収済み         |
| `abandoned`          | グレー   | #7f8c8d | 放棄                 |

### 期待される動作

**Before（現状）**:

```markdown
<!-- @foreshadowing:ガラスの靴の伏線 -->  ← グレー（HTMLコメント）

「ただし、この魔法は真夜中の12時に解けてしまいます...」
```

**After（実装後）**:

```markdown
<!-- @foreshadowing:ガラスの靴の伏線 -->  ← オレンジ（planted）または 緑（resolved）

「ただし、この魔法は真夜中の12時に解けてしまいます...」
```

## 生成AIの学習用コンテキスト

### 既存実装（調査結果）

#### SemanticTokensProvider

- `src/lsp/providers/semantic_tokens_provider.ts`
  - `getSemanticTokens()`: ドキュメント全体のトークン取得
  - `convertMatchesToTokens()`: PositionedMatchをTokenPositionに変換
  - `getStatusModifierMask()`:
    foreshadowingステータス→ビットマスク変換（**既存実装を活用**）

#### セマンティックトークン定義

- `src/lsp/server/capabilities.ts`
  - `SEMANTIC_TOKEN_TYPES = ["character", "setting", "foreshadowing"]` (index 2)
  - `SEMANTIC_TOKEN_MODIFIERS = ["highConfidence", "mediumConfidence", "lowConfidence", "planted", "resolved"]`
  - `planted`: bit 3 = 8
  - `resolved`: bit 4 = 16

#### PositionedDetector

- `src/lsp/detection/positioned_detector.ts`
  - `detectWithPositions()`: エンティティ検出のエントリポイント
  - `getPatternsWithConfidence()`: 検出パターンと信頼度の取得
  - `findAllPositions()`: パターン位置の検出

### テストファイル

- `tests/lsp/providers/semantic_tokens_provider_test.ts`
  - 既存テスト: `detects foreshadowing token`,
    `foreshadowing planted status modifier`,
    `foreshadowing resolved status modifier`

### ドキュメント

- `docs/lsp.md:285-322`
  - Neovim設定例: `@lsp.mod.planted`, `@lsp.mod.resolved`ハイライト設定

### 調査根拠

**現在の課題**:

1. `PositionedDetector`は本文中のエンティティ名を検出するが、`<!-- @foreshadowing:ID -->`自体は検出対象外
2. Markdownのシンタックスハイライトでは、HTMLコメントはグレー（目立たない）
3. アノテーションからIDを抽出し、Foreshadowing定義のステータスを参照する必要あり

**解決策**:

- `PositionedDetector`にアノテーション行検出メソッドを追加
- 検出したアノテーションに対してforeshadowingトークンとステータスモディファイアを適用

---

## Process

### process1 アノテーション検出機能の追加

#### sub1 PositionedDetectorにアノテーション検出メソッドを追加

@target: `src/lsp/detection/positioned_detector.ts` @ref:
`src/lsp/server/capabilities.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/positioned_detector_test.ts` (追記)

- [ ] アノテーション行検出テストを作成
  - `<!-- @foreshadowing:ガラスの靴の伏線 -->` が検出されること
- [ ] 短縮形式のテスト
  - `<!-- @fs:伏線ID -->` も検出されること
- [ ] 複数アノテーションのテスト
  - `<!-- @fs:伏線A @fs:伏線B -->` で2つ検出されること
- [ ] 存在しないIDのテスト
  - 定義されていないIDはスキップされること

```typescript
Deno.test("PositionedDetector - detects foreshadowing annotation comment", async () => {
  const entities: DetectableEntity[] = [
    {
      kind: "foreshadowing",
      id: "ガラスの靴の伏線",
      name: "ガラスの靴の伏線",
      displayNames: ["ガラスの靴"],
      filePath: "src/foreshadowings/glass_slipper.ts",
      status: "planted",
    },
  ];
  const detector = new PositionedDetector(entities);
  const content = `<!-- @foreshadowing:ガラスの靴の伏線 -->
「魔法は真夜中に解けます」`;

  const results = detector.detectWithPositions(content);

  assertEquals(results.length, 1);
  assertEquals(results[0].kind, "foreshadowing");
  assertEquals(results[0].status, "planted");
  assertEquals(results[0].positions[0].line, 0);
});
```

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `detectAnnotations`プライベートメソッドを追加
  ```typescript
  private detectAnnotations(content: string): PositionedMatch[] {
    const matches: PositionedMatch[] = [];
    const pattern = /<!--\s*@(?:foreshadowing|fs):([^\s>@]+)/g;
    const lines = content.split("\n");

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const id = match[1];
        const entity = this.entities.find(
          e => e.kind === "foreshadowing" && (e.id === id || e.name === id)
        );
        if (entity) {
          // アノテーション全体の長さを計算
          const fullMatch = line.match(/<!--\s*@(?:foreshadowing|fs):[^\s>]+(?:\s+@(?:foreshadowing|fs):[^\s>]+)*\s*-->/);
          matches.push({
            entity,
            kind: "foreshadowing",
            confidence: 1.0,
            status: (entity as any).status,
            positions: [{
              line: lineIndex,
              character: 0,
              length: fullMatch ? fullMatch[0].length : match[0].length,
            }],
          });
        }
      }
    }
    return matches;
  }
  ```

- [ ] `detectWithPositions`で`detectAnnotations`の結果をマージ
  ```typescript
  detectWithPositions(content: string): PositionedMatch[] {
    // 既存のエンティティ名検出
    const nameMatches = this.detectEntityNames(content);
    // アノテーション検出（新規）
    const annotationMatches = this.detectAnnotations(content);
    // マージして重複除去
    return this.mergeMatches([...nameMatches, ...annotationMatches]);
  }
  ```

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認
  - **テストが失敗した場合**: 修正 → テスト実行を繰り返す

---

### process2 SemanticTokensProviderの拡張

#### sub1 アノテーショントークンの生成確認

@target: `src/lsp/providers/semantic_tokens_provider.ts` @ref:
`src/lsp/detection/positioned_detector.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/providers/semantic_tokens_provider_test.ts` (追記)

- [ ] アノテーションからセマンティックトークンが生成されるテスト
  ```typescript
  Deno.test("SemanticTokensProvider - detects foreshadowing annotation comment", async () => {
    const entities: DetectableEntity[] = [
      createForeshadowingEntity("ガラスの靴の伏線", "planted"),
    ];
    const detector = new PositionedDetector(entities);
    const provider = new SemanticTokensProvider(detector);

    const content = `<!-- @foreshadowing:ガラスの靴の伏線 -->
  ```

「魔法は真夜中に解けます」`;

    const result = provider.getSemanticTokens(content);

    // data配列が存在すること
    assert(result.data.length > 0);
    // tokenType = 2 (foreshadowing)
    assertEquals(result.data[3], 2);
    // modifier includes planted (bit 3 = 8)
    assert((result.data[4] & 8) !== 0);

});

````
- [ ] resolvedステータスのテスト
- [ ] 複数アノテーションのテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] 既存の`convertMatchesToTokens`がアノテーション由来のマッチも正しく処理することを確認
- 既存ロジックで対応可能なはず（`getStatusModifierMask`が既に実装済み）

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 再度テストを実行し、通過を確認

---

### process3 Neovim設定の提供

#### sub1 ハイライト設定ファイルの作成

@target: `docs/lsp.md` (更新)
@target: `samples/cinderella/nvim-config-example.lua` (新規)

##### TDD Step 1: Red（失敗するテストを作成）

_このプロセスはドキュメント/設定なのでテストなし_

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `docs/lsp.md`のNeovim設定例を更新
- アノテーション行のハイライト設定を追加
```lua
-- ~/.config/nvim/after/ftplugin/markdown.lua

-- storyteller LSP用セマンティックトークンハイライト
-- アノテーション行をステータス別に色分け
vim.api.nvim_set_hl(0, "@lsp.type.foreshadowing.markdown", {
  fg = "#e67e22",
  bold = true,
  italic = true
})

-- ステータス別ハイライト（typemod形式）
vim.api.nvim_set_hl(0, "@lsp.typemod.foreshadowing.planted.markdown", {
  fg = "#e67e22",  -- オレンジ（未回収）
  bold = true
})
vim.api.nvim_set_hl(0, "@lsp.typemod.foreshadowing.resolved.markdown", {
  fg = "#27ae60",  -- グリーン（回収済み）
  bold = true
})
vim.api.nvim_set_hl(0, "@lsp.typemod.foreshadowing.lowConfidence.markdown", {
  underdotted = true
})
````

- [ ] サンプル設定ファイルを作成
  - `samples/cinderella/nvim-config-example.lua`

##### TDD Step 3: Refactor & Verify

- [ ] サンプルプロジェクトで動作確認
- [ ] ドキュメントの整合性確認

---

### process10 ユニットテスト（追加・統合テスト）

@test: `tests/lsp/annotation_semantic_tokens_test.ts` (新規)

- [ ] エンドツーエンドの統合テスト
  - 原稿ファイル読み込み → アノテーション検出 → セマンティックトークン生成
- [ ] plantedとresolvedの混在テスト
- [ ] 日本語IDのテスト

---

### process50 フォローアップ

_実装後に仕様変更などが発生した場合は、ここにProcessを追加する_

---

### process100 リファクタリング

- [ ] `PositionedDetector`のアノテーション検出ロジックを別クラスに分離検討
- [ ] 正規表現パターンの共通化

---

### process200 ドキュメンテーション

- [ ] `docs/lsp.md` のセマンティックトークンセクションを更新
  - アノテーション行のハイライトについて追記
- [ ] `CLAUDE.md` の「進行中の機能開発」セクションを更新
- [ ] Serena Memoryに実装知見を保存
  - `foreshadowing_semantic_highlight`

---

## 見積もり

| Process    | 推定工数    |
| ---------- | ----------- |
| process1   | 1-2時間     |
| process2   | 30分-1時間  |
| process3   | 30分        |
| process10  | 30分-1時間  |
| process100 | 30分        |
| process200 | 30分        |
| **合計**   | **3-5時間** |

---

## 調査ソース

- 既存実装: `src/lsp/providers/semantic_tokens_provider.ts`
- 既存定義: `src/lsp/server/capabilities.ts`
- 既存テスト: `tests/lsp/providers/semantic_tokens_provider_test.ts`
- ドキュメント: `docs/lsp.md`
- Memory: `foreshadowing_annotation_research`
