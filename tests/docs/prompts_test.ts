/**
 * Process 1: システムプロンプトドキュメント検証テスト
 * TDD Step 1: Red - 失敗するテストを作成
 *
 * このテストはプロンプトドキュメントの存在と必須セクションを検証します。
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";

const DOCS_PROMPTS_DIR = "./docs/prompts";

// ========================================
// sub1: docs/prompts/core.md
// ========================================

Deno.test("core.md: ファイルが存在すること", async () => {
  const filePath = `${DOCS_PROMPTS_DIR}/core.md`;
  const stat = await Deno.stat(filePath);
  assert(stat.isFile, `${filePath} should be a file`);
});

Deno.test("core.md: SaC (StoryWriting as Code) コンセプトセクションが含まれること", async () => {
  const content = await Deno.readTextFile(`${DOCS_PROMPTS_DIR}/core.md`);
  assertStringIncludes(content, "SaC");
  assertStringIncludes(content, "StoryWriting as Code");
});

Deno.test("core.md: プロジェクト構造セクションが含まれること", async () => {
  const content = await Deno.readTextFile(`${DOCS_PROMPTS_DIR}/core.md`);
  // プロジェクト構造に関するセクション
  assertStringIncludes(content, "src/characters");
  assertStringIncludes(content, "src/settings");
  assertStringIncludes(content, "manuscripts");
});

Deno.test("core.md: 参照システムセクションが含まれること", async () => {
  const content = await Deno.readTextFile(`${DOCS_PROMPTS_DIR}/core.md`);
  // 参照システムに関するセクション
  assertStringIncludes(content, "@"); // 明示的参照
  assertStringIncludes(content, "信頼度");
});

Deno.test("core.md: 応答原則セクションが含まれること", async () => {
  const content = await Deno.readTextFile(`${DOCS_PROMPTS_DIR}/core.md`);
  // 応答原則に関するセクション（日本語対応を含む）
  assertStringIncludes(content, "日本語");
});

// ========================================
// sub2: docs/prompts/director.md
// ========================================

Deno.test("director.md: ファイルが存在すること", async () => {
  const filePath = `${DOCS_PROMPTS_DIR}/director.md`;
  const stat = await Deno.stat(filePath);
  assert(stat.isFile, `${filePath} should be a file`);
});

Deno.test("director.md: 役割定義セクションが含まれること", async () => {
  const content = await Deno.readTextFile(`${DOCS_PROMPTS_DIR}/director.md`);
  // ディレクターとしての役割
  assertStringIncludes(content, "ディレクター");
  assertStringIncludes(content, "役割");
});

Deno.test("director.md: 3軸（全体像把握、創作的アドバイス、技術的支援）が含まれること", async () => {
  const content = await Deno.readTextFile(`${DOCS_PROMPTS_DIR}/director.md`);
  // 3つの軸が定義されていること
  assertStringIncludes(content, "全体像");
  assertStringIncludes(content, "創作");
  assertStringIncludes(content, "技術");
});

Deno.test("director.md: 回答フォーマットセクションが含まれること", async () => {
  const content = await Deno.readTextFile(`${DOCS_PROMPTS_DIR}/director.md`);
  // 回答フォーマットに関するセクション
  assertStringIncludes(content, "フォーマット");
});

// ========================================
// sub3: プラットフォーム別プロンプト
// ========================================

// Claude Desktop
Deno.test("claude-desktop.md: ファイルが存在すること", async () => {
  const filePath = `${DOCS_PROMPTS_DIR}/claude-desktop.md`;
  const stat = await Deno.stat(filePath);
  assert(stat.isFile, `${filePath} should be a file`);
});

Deno.test("claude-desktop.md: MCPツール一覧が含まれること", async () => {
  const content = await Deno.readTextFile(
    `${DOCS_PROMPTS_DIR}/claude-desktop.md`,
  );
  // MCPツールについての記述
  assertStringIncludes(content, "MCP");
  assertStringIncludes(content, "element_create");
  assertStringIncludes(content, "meta_check");
});

Deno.test("claude-desktop.md: MCPリソース一覧が含まれること", async () => {
  const content = await Deno.readTextFile(
    `${DOCS_PROMPTS_DIR}/claude-desktop.md`,
  );
  // MCPリソースについての記述
  assertStringIncludes(content, "storyteller://");
});

// Claude Code
Deno.test("claude-code.md: ファイルが存在すること", async () => {
  const filePath = `${DOCS_PROMPTS_DIR}/claude-code.md`;
  const stat = await Deno.stat(filePath);
  assert(stat.isFile, `${filePath} should be a file`);
});

Deno.test("claude-code.md: CLIコマンド一覧が含まれること", async () => {
  const content = await Deno.readTextFile(`${DOCS_PROMPTS_DIR}/claude-code.md`);
  // CLIコマンドについての記述
  assertStringIncludes(content, "storyteller");
  assertStringIncludes(content, "CLI");
});

Deno.test("claude-code.md: スラッシュコマンド一覧が含まれること", async () => {
  const content = await Deno.readTextFile(`${DOCS_PROMPTS_DIR}/claude-code.md`);
  // スラッシュコマンドについての記述
  assertStringIncludes(content, "/story");
});

Deno.test("claude-code.md: JSON出力モードの説明が含まれること", async () => {
  const content = await Deno.readTextFile(`${DOCS_PROMPTS_DIR}/claude-code.md`);
  // JSON出力について
  assertStringIncludes(content, "--json");
});

// Neovim
Deno.test("neovim.md: ファイルが存在すること", async () => {
  const filePath = `${DOCS_PROMPTS_DIR}/neovim.md`;
  const stat = await Deno.stat(filePath);
  assert(stat.isFile, `${filePath} should be a file`);
});

Deno.test("neovim.md: Denopsコマンド一覧が含まれること", async () => {
  const content = await Deno.readTextFile(`${DOCS_PROMPTS_DIR}/neovim.md`);
  // Denopsコマンドについての記述
  assertStringIncludes(content, "Denops");
  assertStringIncludes(content, ":Story");
});

Deno.test("neovim.md: キーマッピング推奨設定が含まれること", async () => {
  const content = await Deno.readTextFile(`${DOCS_PROMPTS_DIR}/neovim.md`);
  // キーマッピングについての記述
  assertStringIncludes(content, "<Leader>");
});

Deno.test("neovim.md: 簡潔応答モードの説明が含まれること", async () => {
  const content = await Deno.readTextFile(`${DOCS_PROMPTS_DIR}/neovim.md`);
  // 簡潔応答について
  assertStringIncludes(content, "簡潔");
});
