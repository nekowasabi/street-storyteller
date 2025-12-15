# title: street-storyteller v1.0 シナリオテスト

## 概要
- シンデレラを題材としたサンプルプロジェクトを`samples/cinderella/`に作成し、v1.0の全機能（CLI、メタデータ、LSP、View、MCP）の動作確認を行う
- 作業ログを`samples/cinderella/log.md`に記録し、エラー発生時は修正対象として記録する

### goal
- storytellerコマンドを使用して、シンデレラを題材にした物語プロジェクトを作成・検証できること
- 全8フェーズ（環境準備〜MCP検証）が正常に動作すること
- エラーがあれば原因を特定し、修正対象として文書化すること

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **動作検証駆動（Verification-Driven）を厳守すること**
  - 各プロセスは必ず期待結果を先に定義してから実行する
  - コマンド実行後、期待結果と実際の結果を比較検証する
  - プロセス完了の条件：成功基準を満たしていること
  - エラー発生時：エラーログに記録し、原因分析を行う

## 開発のゴール
- v1.0の全機能が実際に動作することを確認する
- 実際の使用シナリオでの問題点を洗い出す
- 次回修正対象のエラーリストを作成する

## 実装仕様

### CLI実装状況（2025-12-15更新）

**実装済みコマンド:**
- `storyteller generate` - プロジェクトスキャフォールド生成
- `storyteller meta check` - メタデータ生成可能性チェック
- `storyteller meta generate` - .meta.tsファイル生成
- `storyteller meta watch` - ファイル監視と自動更新
- `storyteller lsp start` - LSPサーバー起動
- `storyteller lsp install` - エディタ設定生成
- `storyteller lsp validate` - ✅ 原稿ファイルの検証（Issue #12で実装）
- `storyteller view` - HTML可視化
- `storyteller mcp start` - MCPサーバー起動
- `storyteller element character` - ✅ キャラクター要素作成（Issue #11で実装）
- `storyteller element setting` - ✅ 設定要素作成（Issue #11で実装）

**LLM機能（Issue #13で実装）:**
- OpenRouterプロバイダー（`src/llm/providers/openrouter.ts`）
- 設定ファイル形式（`storyteller.llm.json`）
- API呼び出し制限機能（SafeLLMProvider）

### テスト対象機能
| 機能 | コマンド/方法 | 確認項目 |
|-----|--------------|---------|
| プロジェクト生成 | `storyteller generate` | ディレクトリ構造、設定ファイル |
| キャラクター作成 | `storyteller element character` | Character型準拠、ファイル生成 |
| 設定作成 | `storyteller element setting` | Setting型準拠、ファイル生成 |
| 原稿執筆 | 手動作成（sample/参照） | frontmatter形式、LSPコメント |
| メタデータ検証 | `storyteller meta check` | 参照検出 |
| メタデータ生成 | `storyteller meta generate` | .meta.ts生成 |
| LSP検証 | `storyteller lsp validate` | 診断結果出力 |
| LSP起動 | `storyteller lsp start --stdio` | サーバー起動確認 |
| View生成 | `storyteller view` | HTML生成、サーバー起動 |
| MCP起動 | `storyteller mcp start` | サーバー起動、ツール応答 |

## 生成AIの学習用コンテキスト
### 参照ファイル
- `/home/takets/repos/street-storyteller/sample/src/characters/hero.ts`
  - キャラクター定義の形式（displayNames, aliases, detectionHints）
- `/home/takets/repos/street-storyteller/sample/manuscripts/chapter01.md`
  - 原稿のfrontmatter形式とLSPコメント記法
- `/home/takets/repos/street-storyteller/sample/src/settings/kingdom.ts`
  - 設定定義の形式
- `/home/takets/repos/street-storyteller/docs/cli.md`
  - CLIコマンドのリファレンス
- `/home/takets/repos/street-storyteller/docs/mcp.md`
  - MCP API仕様（Tools, Resources, Prompts）

### OpenRouter実装参考（geminitranslate）
- `/home/takets/repos/geminitranslate/src/background/apiClient.ts`
  - OpenRouter APIクライアント実装（リトライ、タイムアウト、エラーハンドリング）
- `/home/takets/repos/geminitranslate/src/shared/constants/config.ts`
  - API設定定数（エンドポイント、タイムアウト、リトライ設定）
- `/home/takets/repos/geminitranslate/src/shared/types/index.ts`
  - ストレージスキーマ型定義

---

## Process

### process1 環境準備
#### sub1 ディレクトリ作成とlog.md初期化
@target: `samples/cinderella/`
@ref: なし

##### 検証 Step 1: 期待結果の定義
- [ ] `samples/cinderella/` ディレクトリが存在すること
- [ ] `samples/cinderella/log.md` が初期化されていること

##### 検証 Step 2: 実行
- [ ] `mkdir -p samples/cinderella` を実行
- [ ] log.mdを作成し、テスト開始時刻を記録

##### 検証 Step 3: 結果確認
- [ ] ディレクトリ構造を `ls -la samples/cinderella/` で確認
- [ ] log.mdの内容を確認

---

### process2 プロジェクト初期化
#### sub1 storyteller generateコマンドでプロジェクト生成
@target: `samples/cinderella/`
@ref: `/home/takets/repos/street-storyteller/docs/cli.md`

##### 検証 Step 1: 期待結果の定義
- [ ] `src/characters/`, `src/settings/`, `manuscripts/` ディレクトリが生成される
- [ ] テンプレートファイルが配置される
- [ ] `.storyteller/` または設定ファイルが作成される

##### 検証 Step 2: 実行
- [ ] 以下のコマンドを実行:
  ```bash
  deno run -A main.ts generate --name "cinderella" --template novel --path samples/cinderella
  ```

##### 検証 Step 3: 結果確認・log.md記録
- [ ] 生成されたディレクトリ構造を確認
- [ ] コマンド出力と結果をlog.mdに記録
- [ ] **エラー発生時**: エラーログセクションに記録

---

### process3 キャラクター作成（7名）
**方法**: `storyteller element character` コマンド使用（Issue #11で実装済み）

#### コマンド形式
```bash
deno run -A main.ts element character \
  --name "<名前>" \
  --role "<protagonist|antagonist|supporting|guest>" \
  --summary "<概要>" \
  --traits "<特性1,特性2,...>" \
  --projectRoot samples/cinderella
```

#### sub1 シンデレラ（protagonist）
##### 検証 Step 1: 期待結果の定義
- [ ] `src/characters/cinderella.ts` が作成される
- [ ] Character型に準拠した形式であること

##### 検証 Step 2: コマンド実行
```bash
deno run -A main.ts element character \
  --id cinderella \
  --name "シンデレラ" \
  --role protagonist \
  --summary "継母にいじめられながらも優しさを失わない少女" \
  --traits "優しい,忍耐強い,美しい,夢見がち" \
  --projectRoot samples/cinderella
```

##### 検証 Step 3: 結果確認
- [ ] ファイルが正しく作成されたことを確認
- [ ] log.mdに記録

#### sub2 王子（protagonist）
```bash
deno run -A main.ts element character \
  --id prince \
  --name "王子" \
  --role protagonist \
  --summary "真実の愛を求める王国の王子" \
  --traits "誠実,優雅,ロマンチスト" \
  --projectRoot samples/cinderella
```

#### sub3 継母（antagonist）
```bash
deno run -A main.ts element character \
  --id stepmother \
  --name "継母" \
  --role antagonist \
  --summary "シンデレラを虐げる冷酷な継母" \
  --traits "冷酷,虚栄心が強い,計算高い" \
  --projectRoot samples/cinderella
```

#### sub4 姉義姉ドリゼラ（supporting）
```bash
deno run -A main.ts element character \
  --id stepsister_elder \
  --name "ドリゼラ" \
  --role supporting \
  --summary "傲慢な姉義姉" \
  --traits "傲慢,嫉妬深い" \
  --projectRoot samples/cinderella
```

#### sub5 妹義姉アナスタシア（supporting）
```bash
deno run -A main.ts element character \
  --id stepsister_younger \
  --name "アナスタシア" \
  --role supporting \
  --summary "わがままな妹義姉" \
  --traits "わがまま,短気" \
  --projectRoot samples/cinderella
```

#### sub6 妖精のおばあさん（supporting）
```bash
deno run -A main.ts element character \
  --id fairy_godmother \
  --name "妖精のおばあさん" \
  --role supporting \
  --summary "シンデレラを助ける魔法使い" \
  --traits "慈愛深い,魔法使い,神秘的" \
  --projectRoot samples/cinderella
```

#### sub7 国王（guest）
```bash
deno run -A main.ts element character \
  --id king \
  --name "国王" \
  --role guest \
  --summary "王子の父、威厳ある国王" \
  --traits "威厳がある,息子思い" \
  --projectRoot samples/cinderella
```

##### process3 完了検証
- [ ] 7つのキャラクターファイルが作成されていることを確認
- [ ] `ls -la samples/cinderella/src/characters/` で確認
- [ ] 型チェック: `deno check samples/cinderella/src/characters/*.ts`
- [ ] 全結果をlog.mdに記録

---

### process4 設定作成（5箇所）
**方法**: `storyteller element setting` コマンド使用（Issue #11で実装済み）

#### コマンド形式
```bash
deno run -A main.ts element setting \
  --name "<名前>" \
  --type "<location|world|culture|organization>" \
  --summary "<概要>" \
  --displayNames "<表示名1,表示名2,...>" \
  --relatedSettings "<関連設定1,関連設定2,...>" \
  --projectRoot samples/cinderella
```

#### sub1 王国設定
##### 検証 Step 1: 期待結果の定義
- [ ] `src/settings/kingdom.ts` が作成される
- [ ] Setting型に準拠した形式であること

##### 検証 Step 2: コマンド実行
```bash
deno run -A main.ts element setting \
  --id kingdom \
  --name "フェアリーテイル王国" \
  --type location \
  --summary "古き良き伝統と魔法が共存する王国。王子と姫の物語が生まれる舞台。" \
  --displayNames "王国,フェアリーテイル,王都" \
  --relatedSettings "castle,mansion" \
  --projectRoot samples/cinderella
```

#### sub2 王城設定
```bash
deno run -A main.ts element setting \
  --id castle \
  --name "王城" \
  --type location \
  --summary "王族が住む壮麗な城。舞踏会の会場。" \
  --displayNames "城,王城,お城" \
  --projectRoot samples/cinderella
```

#### sub3 シンデレラの屋敷設定
```bash
deno run -A main.ts element setting \
  --id mansion \
  --name "屋敷" \
  --type location \
  --summary "シンデレラが継母と暮らす屋敷。" \
  --displayNames "屋敷,邸宅,お屋敷" \
  --projectRoot samples/cinderella
```

#### sub4 妖精魔法システム設定
```bash
deno run -A main.ts element setting \
  --id magic_system \
  --name "妖精魔法" \
  --type world \
  --summary "妖精が使う魔法のシステム。真夜中に解ける制約がある。" \
  --displayNames "魔法,妖精魔法" \
  --projectRoot samples/cinderella
```

#### sub5 ガラスの靴設定
```bash
deno run -A main.ts element setting \
  --id glass_slipper \
  --name "ガラスの靴" \
  --type culture \
  --summary "妖精の魔法で作られた特別な靴。持ち主を証明する鍵。" \
  --displayNames "ガラスの靴,靴" \
  --projectRoot samples/cinderella
```

##### process4 完了検証
- [ ] 5つの設定ファイルが作成されていることを確認
- [ ] `ls -la samples/cinderella/src/settings/` で確認
- [ ] 型チェック: `deno check samples/cinderella/src/settings/*.ts`
- [ ] 結果をlog.mdに記録

---

### process5 原稿執筆（4章）
#### sub1 第1章「灰かぶり姫の日常」
@target: `samples/cinderella/manuscripts/chapter01.md`
@ref: `/home/takets/repos/street-storyteller/sample/manuscripts/chapter01.md`

##### 検証 Step 1: 期待結果の定義
- [ ] frontmatter（YAML）が正しい形式であること
- [ ] LSPコメント（`<!-- @id:implicit confidence:X.X -->`）が含まれること
- [ ] キャラクター・設定への参照が含まれること

##### 検証 Step 2: ファイル作成
- [ ] chapter01.md を作成:
  - chapter_id: chapter01
  - title: "灰かぶり姫の日常"
  - characters: [cinderella, stepmother, stepsister_elder, stepsister_younger]
  - settings: [mansion]
  - 本文にシンデレラ、継母、義姉たちへの参照を含める

#### sub2 第2章「舞踏会への招待」
@target: `samples/cinderella/manuscripts/chapter02.md`

##### 検証 Step 2: ファイル作成
- [ ] chapter02.md を作成:
  - chapter_id: chapter02
  - title: "舞踏会への招待"
  - characters: [cinderella, stepmother, stepsister_elder, stepsister_younger, fairy_godmother]
  - settings: [mansion, magic_system]
  - 本文に魔法使用シーンを含める

#### sub3 第3章「真夜中の魔法」
@target: `samples/cinderella/manuscripts/chapter03.md`

##### 検証 Step 2: ファイル作成
- [ ] chapter03.md を作成:
  - chapter_id: chapter03
  - title: "真夜中の魔法"
  - characters: [cinderella, prince, fairy_godmother]
  - settings: [castle, magic_system, glass_slipper]
  - 本文に舞踏会シーンを含める

#### sub4 第4章「ガラスの靴」
@target: `samples/cinderella/manuscripts/chapter04.md`

##### 検証 Step 2: ファイル作成
- [ ] chapter04.md を作成:
  - chapter_id: chapter04
  - title: "ガラスの靴"
  - characters: [cinderella, prince, stepmother, king]
  - settings: [kingdom, castle, glass_slipper]
  - 本文にハッピーエンドを含める

##### process5 完了検証
- [ ] 4つの原稿ファイルが作成されていることを確認
- [ ] frontmatter形式が正しいことを確認
- [ ] 結果をlog.mdに記録

---

### process6 メタデータ検証・生成
#### sub1 meta checkコマンド検証
@target: `samples/cinderella/manuscripts/*.meta.ts`
@ref: `/home/takets/repos/street-storyteller/docs/cli.md`

##### 検証 Step 1: 期待結果の定義
- [ ] `meta check` がエラーなく完了すること
- [ ] キャラクター・設定の参照が検出されること

##### 検証 Step 2: 実行
- [ ] 単一ファイルチェック:
  ```bash
  deno run -A main.ts meta check manuscripts/chapter01.md
  ```
- [ ] ディレクトリ再帰チェック:
  ```bash
  deno run -A main.ts meta check --dir manuscripts --recursive
  ```
- [ ] JSON出力:
  ```bash
  deno run -A main.ts meta check manuscripts/chapter01.md --json
  ```

#### sub2 meta generateコマンド検証
##### 検証 Step 2: 実行
- [ ] プレビュー（dry-run）:
  ```bash
  deno run -A main.ts meta generate manuscripts/chapter01.md --preview --dry-run
  ```
- [ ] 全ファイル生成:
  ```bash
  deno run -A main.ts meta generate --dir manuscripts --recursive
  ```

##### 検証 Step 3: 結果確認
- [ ] `*.meta.ts` ファイルが生成されていることを確認
- [ ] 検出されたエンティティが正しいことを確認
- [ ] 結果をlog.mdに記録

---

### process7 LSP機能検証
**方法**: `storyteller lsp validate` コマンド使用（Issue #12で実装済み）

#### sub1 lsp validateコマンド検証
@ref: `/home/takets/repos/street-storyteller/docs/lsp.md`

##### 検証 Step 1: 期待結果の定義
- [ ] 原稿ファイルの診断結果が出力される
- [ ] キャラクター・設定への参照が検出される

##### 検証 Step 2: 実行
```bash
# 単一ファイルの検証
deno run -A main.ts lsp validate \
  --file manuscripts/chapter01.md \
  --path samples/cinderella

# JSON出力で検証
deno run -A main.ts lsp validate \
  --file manuscripts/chapter01.md \
  --path samples/cinderella \
  --json
```

##### 検証 Step 3: 結果確認
- [ ] 診断結果が出力されることを確認
- [ ] エンティティ参照が検出されることを確認
- [ ] 結果をlog.mdに記録

#### sub2 lsp startコマンド検証
##### 検証 Step 1: 期待結果の定義
- [ ] LSPサーバーが起動すること
- [ ] stdioモードでJSON-RPCプロトコルが動作すること

##### 検証 Step 2: 実行
```bash
# タイムアウト付きで起動確認（5秒後に終了）
timeout 5 deno run -A main.ts lsp start --stdio 2>&1 || true
```

#### sub3 lsp installコマンド検証
##### 検証 Step 2: 実行
```bash
# Neovim設定生成
deno run -A main.ts lsp install nvim

# VSCode設定生成
deno run -A main.ts lsp install vscode
```

##### 検証 Step 3: 結果確認
- [ ] 設定ファイルが出力されることを確認
- [ ] 結果をlog.mdに記録

---

### process8 View機能検証
#### sub1 HTML生成検証
@target: `samples/cinderella/story-view.html`
@ref: `/home/takets/repos/street-storyteller/docs/cli.md`

##### 検証 Step 1: 期待結果の定義
- [ ] HTMLファイルが生成されること
- [ ] キャラクター・設定・チャプターの関係が可視化されること

##### 検証 Step 2: 実行
- [ ] HTML生成:
  ```bash
  deno run -A main.ts view --path samples/cinderella --output samples/cinderella/story-view.html
  ```

#### sub2 サーバーモード検証
##### 検証 Step 2: 実行
- [ ] サーバー起動（タイムアウト付き）:
  ```bash
  deno run -A main.ts view --path samples/cinderella --serve --port 8080 --timeout 10000
  ```
- [ ] ブラウザで `http://localhost:8080` にアクセス確認

##### 検証 Step 3: 結果確認
- [ ] HTMLファイルの内容を確認
- [ ] サーバーが正常に起動・終了することを確認
- [ ] 結果をlog.mdに記録

---

### process9 LLMプロバイダー検証（実装済み - Issue #13）
**状態**: ✅ 実装済み（Issue #13で完了）

#### 実装済み機能
- `src/llm/config/llm_config.ts` - LLMConfig型、SafetyConfig型
- `src/llm/config/loader.ts` - 設定ファイルローダー
- `src/llm/providers/provider.ts` - LLMProviderインターフェース
- `src/llm/providers/openrouter.ts` - OpenRouterProvider実装
- `src/llm/providers/mock.ts` - MockLLMProvider（テスト用）
- `src/llm/providers/factory.ts` - createProvider、createSafeProvider
- `src/llm/safety/call_limiter.ts` - API呼び出し制限
- `src/llm/safety/safe_provider.ts` - SafeLLMProvider

#### sub1 LLM機能の動作検証
##### 検証 Step 1: 期待結果の定義
- [ ] LLMConfig型でエラーなくコンパイルできる
- [ ] MockLLMProviderが正常に動作する
- [ ] SafeLLMProviderが呼び出し制限を適用する

##### 検証 Step 2: テスト実行
```bash
# LLM関連テストを実行
deno test tests/llm/ --allow-all

# 型チェック
deno check src/llm/index.ts
```

##### 検証 Step 3: 結果確認
- [ ] 全テストがパスする
- [ ] 結果をlog.mdに記録

#### sub2 設定ファイル形式確認
##### storyteller.llm.json 形式
```json
{
  "provider": "openrouter",
  "model": "anthropic/claude-3-haiku",
  "timeout": 30000,
  "retry": {
    "maxRetries": 3,
    "initialDelay": 1000,
    "maxDelay": 10000,
    "backoff": "exponential"
  },
  "safety": {
    "maxCallsPerSession": 10,
    "warningThreshold": 2
  }
}
```

---

### process10 Claude Desktop/Claude Code統合

#### 調査結果（根拠）
> MCPサーバーをClaude Desktop/Claude Codeから利用可能にするには、
> 各環境用の設定ファイルを作成し、環境変数でAPIキーを渡す必要がある。

#### sub1 Claude Desktop設定作成
@target: `~/.config/Claude/claude_desktop_config.json`
@ref: `/home/takets/repos/street-storyteller/docs/mcp.md`

##### 検証 Step 1: 期待結果の定義
- [ ] claude_desktop_config.json が作成される
- [ ] MCPサーバーがClaude Desktopから認識される

##### 検証 Step 2: 実行
- [ ] Claude Desktop設定を作成:
  ```json
  {
    "mcpServers": {
      "storyteller": {
        "command": "/home/takets/repos/street-storyteller/storyteller",
        "args": [
          "mcp", "start", "--stdio",
          "--path", "/home/takets/repos/street-storyteller/samples/cinderella"
        ],
        "env": {
          "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}"
        }
      }
    }
  }
  ```

##### 検証 Step 3: 結果確認
- [ ] Claude Desktopを再起動し、storytellerサーバーが認識されること
- [ ] ツール一覧に `meta_check`, `lsp_validate` 等が表示されること

#### sub2 Claude Code設定作成
@target: `.mcp.json` (プロジェクトルート)

##### 検証 Step 2: 実行
- [ ] Claude Code用MCP設定を作成:
  ```json
  {
    "mcpServers": {
      "storyteller": {
        "command": "deno",
        "args": ["run", "-A", "main.ts", "mcp", "start", "--stdio"],
        "cwd": "/home/takets/repos/street-storyteller",
        "env": {
          "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}"
        }
      }
    }
  }
  ```

##### 検証 Step 3: 結果確認
- [ ] Claude Codeでstorytellerツールが利用可能であること

#### sub3 サンプルプロジェクト用LLM設定作成
@target: `samples/cinderella/storyteller.llm.json`

##### 検証 Step 2: 実行
- [ ] シンデレラプロジェクト用LLM設定を作成:
  ```json
  {
    "provider": "openrouter",
    "model": "openai/gpt-oss-120b",
    "providerOrder": ["Cerebras"],
    "timeout": 30000,
    "retry": {
      "maxRetries": 3,
      "initialDelay": 1000,
      "maxDelay": 10000,
      "backoff": "exponential"
    }
  }
  ```

**使用するモデル・プロバイダー**:
- モデル: `openai/gpt-oss-120b`
- プロバイダー: `Cerebras`（高速推論に特化）

#### sub4 環境変数設定
@target: `.env` (プロジェクトルート)

##### 検証 Step 1: 期待結果の定義
- [ ] `.env`ファイルが作成される
- [ ] `.gitignore`に`.env`が追加される

##### 検証 Step 2: 実行
- [ ] 環境変数ファイルを作成:
  ```bash
  # .env（.gitignoreに追加すること）
  OPENROUTER_API_KEY=sk-or-v1-...
  ```
- [ ] `.gitignore`に追加:
  ```
  .env
  .env.local
  ```

##### 検証 Step 3: 結果確認
- [ ] 環境変数が正しく読み込まれること
- [ ] APIキーがログに出力されないこと（マスク処理）

---

### process11 MCP機能検証（Claude Desktop/Claude Code）

#### sub1 MCPサーバー起動検証
@target: なし（サーバー動作確認）
@ref: `/home/takets/repos/street-storyteller/docs/mcp.md`

##### 検証 Step 1: 期待結果の定義
- [ ] MCPサーバーが起動すること
- [ ] エラーなく起動メッセージが表示されること

##### 検証 Step 2: 実行
- [ ] MCPサーバー起動:
  ```bash
  deno run -A main.ts mcp start --stdio --path samples/cinderella
  ```

##### 検証 Step 3: 結果確認
- [ ] 起動ログを確認
- [ ] 結果をlog.mdに記録

#### sub2 Claude Desktop/Claude Codeからのツール呼び出し検証
##### 検証 Step 1: 期待結果の定義
- [ ] 自然言語コマンドがIntentAnalyzerで解釈される
- [ ] ツール呼び出しが成功する
- [ ] リソース取得が正常に動作する

##### 検証 Step 2: 実行
- [ ] Claude Desktop/Claude Codeから以下を実行して検証:
  - "シンデレラプロジェクトの情報を見せて" → `storyteller://project`
  - "キャラクター一覧を表示して" → `storyteller://characters`
  - "シンデレラの詳細情報" → `storyteller://character/cinderella`
  - "chapter01のメタデータをチェックして" → `meta_check`
  - "LSP検証を実行して" → `lsp_validate`

##### 検証 Step 3: 結果確認
- [ ] 各コマンドの応答を確認
- [ ] 結果をlog.mdに記録

#### sub3 LLMテスト実行（OpenRouter + Cerebras）
@target: `sample/tests/llm/run-llm-test.ts`

##### 検証 Step 1: 期待結果の定義
- [ ] OpenRouter API経由でCerebrasプロバイダーに接続できる
- [ ] openai/gpt-oss-120bモデルでテストが実行される
- [ ] 高速推論（Cerebrasの特徴）が確認できる

##### 検証 Step 2: 実行
- [ ] LLMテストをOpenRouter + Cerebrasで実行:
  ```bash
  cd samples/cinderella
  OPENROUTER_API_KEY=sk-or-v1-... deno run -A ../../sample/tests/llm/run-llm-test.ts
  ```

- [ ] プロバイダー確認用リクエスト例:
  ```typescript
  // OpenRouter APIリクエストボディ
  {
    "model": "openai/gpt-oss-120b",
    "provider": {
      "order": ["Cerebras"]
    },
    "messages": [{ "role": "user", "content": "..." }]
  }
  ```

##### 検証 Step 3: 結果確認
- [ ] OpenRouter APIが正常に呼び出されること
- [ ] Cerebrasプロバイダーが使用されていることをログで確認
- [ ] テスト結果がlog.mdに記録されること
- [ ] レスポンス速度を記録（Cerebrasの高速性を確認）

---

### process12 テスト結果集計
#### sub1 成功基準チェック

##### 検証項目一覧
| Phase | 基準 | 結果 |
|-------|------|------|
| 1 | プロジェクト構造が `storyteller generate` で生成される | [ ] |
| 2 | 7キャラクターの.tsファイルが `element character` で作成される | [ ] |
| 3 | 5設定の.tsファイルが `element setting` で作成される（型エラーなし） | [ ] |
| 4 | 4章の.mdファイルがfrontmatter付きで作成 | [ ] |
| 5 | `meta check` でOK、`meta generate` で.meta.ts生成 | [ ] |
| 6 | `lsp validate` で診断結果が返る | [ ] |
| 7 | `view` でHTMLが生成され表示可能 | [ ] |
| 8 | LLM機能テストがパスする（実装済み: Issue #13） | [ ] |
| 9 | Claude Desktop/Claude Code設定が作成される | [ ] |
| 10 | MCPサーバーが起動し、ツール呼び出しが成功 | [ ] |
| 11 | 全体の統合テストが成功 | [ ] |

---

### process50 フォローアップ
- [ ] エラーログに記録された問題の分類
- [ ] 修正優先度の決定
- [ ] 次回修正対象Issueの作成検討

---

### process100 リファクタリング
- [ ] 発見されたバグの修正（別Issue）
- [ ] CLI引数の修正が必要な場合の対応

---

### process200 ドキュメンテーション
- [ ] log.md の最終確認と整理
- [ ] エラーログの最終まとめ
- [ ] テスト結果サマリーの作成
- [ ] 必要に応じてREADME.mdの更新

---

## log.md 記録フォーマット

```markdown
# Cinderella Scenario Test Log

## テスト開始: YYYY-MM-DD HH:MM:SS

---

## Phase X: [フェーズ名]

### コマンド
\`\`\`bash
[実行したコマンド]
\`\`\`

### 実行結果
\`\`\`
[出力結果]
\`\`\`

### ステータス
- [x] 成功 / [ ] 失敗

### 備考
[任意のメモ]

---
```

## エラーログ記録フォーマット

```markdown
## エラーログ

### エラー #N
- **発生日時**: YYYY-MM-DD HH:MM:SS
- **フェーズ**: Phase X - [フェーズ名]
- **コマンド**:
  \`\`\`bash
  [コマンド]
  \`\`\`
- **エラーメッセージ**:
  \`\`\`
  [エラー内容]
  \`\`\`
- **原因分析**: [推測]
- **修正対象**: [ ] 要修正 / [ ] 回避策適用済み
```
