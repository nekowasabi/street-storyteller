#!/usr/bin/env -S deno run --allow-read

/**
 * TypeScriptとMarkdownの連携を検証するスクリプト
 * 使用方法: deno run --allow-read validate.ts
 */

import { chapter01Meta } from "./manuscripts/chapter01.meta.ts";
import { chapter02Meta } from "./manuscripts/chapter02.meta.ts";

type ChapterMeta = {
  readonly title: string;
  readonly characters: ReadonlyArray<{
    readonly name: string;
    readonly displayNames?: readonly string[];
  }>;
  readonly settings: ReadonlyArray<{
    readonly name: string;
    readonly displayNames?: readonly string[];
  }>;
  readonly validations?: ReadonlyArray<{
    readonly type: string;
    readonly message: string;
    readonly validate: (content: string) => Promise<boolean>;
  }>;
  readonly references?: Record<string, unknown>;
};

// 色付きコンソール出力用
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Markdownファイルを読み込む
async function readMarkdown(path: string): Promise<string> {
  try {
    return await Deno.readTextFile(path);
  } catch (error) {
    log(`❌ Failed to read file: ${path}`, colors.red);
    throw error;
  }
}

// 章の検証を実行
async function validateChapter(chapterMeta: ChapterMeta, markdownPath: string) {
  log(`\n📖 Validating Chapter: ${chapterMeta.title}`, colors.cyan);
  log(`   File: ${markdownPath}`, colors.cyan);

  const content = await readMarkdown(markdownPath);
  let hasErrors = false;

  // 1. キャラクターの存在確認
  log("\n  🎭 Character Validation:", colors.yellow);
  for (const character of chapterMeta.characters) {
    const found = character.displayNames?.some((name: string) =>
      content.includes(name)
    ) || content.includes(character.name);

    if (found) {
      log(`    ✅ ${character.name} is present`, colors.green);
    } else {
      log(`    ❌ ${character.name} is missing`, colors.red);
      hasErrors = true;
    }
  }

  // 2. 設定の存在確認
  log("\n  🏰 Setting Validation:", colors.yellow);
  for (const setting of chapterMeta.settings) {
    const found = setting.displayNames?.some((name: string) =>
      content.includes(name)
    ) || content.includes(setting.name);

    if (found) {
      log(`    ✅ ${setting.name} is present`, colors.green);
    } else {
      log(`    ❌ ${setting.name} is missing`, colors.red);
      hasErrors = true;
    }
  }

  // 3. カスタム検証ルールの実行
  if (chapterMeta.validations) {
    log("\n  🔍 Custom Validations:", colors.yellow);
    for (const validation of chapterMeta.validations) {
      const result = await validation.validate(content);
      if (result) {
        log(`    ✅ ${validation.type} passed`, colors.green);
      } else {
        log(
          `    ❌ ${validation.type} failed: ${validation.message}`,
          colors.red,
        );
        hasErrors = true;
      }
    }
  }

  // 4. 参照マッピングの確認
  log("\n  🔗 Reference Mapping:", colors.yellow);
  const referenceCount = Object.keys(chapterMeta.references || {}).length;
  log(`    📊 Total references defined: ${referenceCount}`, colors.blue);

  // 参照の実際の使用状況をチェック
  let usedReferences = 0;
  for (const [word, _entity] of Object.entries(chapterMeta.references || {})) {
    if (content.includes(word)) {
      usedReferences++;
    }
  }
  log(
    `    📊 References used in content: ${usedReferences}/${referenceCount}`,
    colors.blue,
  );

  return !hasErrors;
}

// メイン処理
async function main() {
  log("🚀 Starting Storyteller Validation System", colors.magenta);
  log("=".repeat(50), colors.magenta);

  const validations = [
    {
      meta: chapter01Meta,
      path:
        "/Users/takets/repos/street-storyteller/sample/manuscripts/chapter01.md",
    },
    {
      meta: chapter02Meta,
      path:
        "/Users/takets/repos/street-storyteller/sample/manuscripts/chapter02.md",
    },
  ];

  let allPassed = true;

  for (const { meta, path } of validations) {
    try {
      const passed = await validateChapter(meta, path);
      if (!passed) {
        allPassed = false;
      }
    } catch (error) {
      log(`\n❌ Error validating ${path}: ${error}`, colors.red);
      allPassed = false;
    }
  }

  // 最終結果
  log("\n" + "=".repeat(50), colors.magenta);
  if (allPassed) {
    log("✅ All validations passed!", colors.green);
    log("\n🎉 Your story structure is consistent!", colors.green);
  } else {
    log("❌ Some validations failed.", colors.red);
    log("\n⚠️  Please review the errors above and fix them.", colors.yellow);
    Deno.exit(1);
  }
}

// アーキテクチャの説明を表示
function showArchitectureInfo() {
  log("\n📚 Architecture Overview:", colors.cyan);
  log("=".repeat(50), colors.cyan);
  log(
    `
This validation demonstrates the hybrid architecture:

1. TypeScript Files (.ts):
   - Type-safe character/setting definitions
   - Full IDE support with LSP/Linter
   - Structured metadata

2. Markdown Files (.md):
   - Natural writing experience
   - Preserved formatting capabilities
   - Story content

3. Binding Files (.yaml):
   - Connect TypeScript and Markdown
   - Define detection patterns
   - Set confidence levels

4. Meta Files (.meta.ts):
   - Chapter-specific validations
   - Reference mappings
   - Plot tracking
  `,
    colors.blue,
  );
}

// 実行
if (import.meta.main) {
  showArchitectureInfo();
  await main();
}
