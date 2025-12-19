/**
 * LiteralTypeHoverProvider テスト
 * リテラル型ホバープロバイダーをテスト
 */

import { assertEquals, assertExists } from "@std/assert";
import { LiteralTypeHoverProvider } from "@storyteller/lsp/providers/literal_type_hover_provider.ts";

// ヘルパー関数: 文字列内の指定文字の位置を取得
function findPositionInString(
  content: string,
  line: number,
  searchChar: string,
  occurrence: number = 1,
): number {
  const lines = content.split("\n");
  const targetLine = lines[line] ?? "";
  let count = 0;
  for (let i = 0; i < targetLine.length; i++) {
    if (targetLine[i] === searchChar) {
      count++;
      if (count === occurrence) {
        return i;
      }
    }
  }
  return -1;
}

// ヘルパー関数: 文字列リテラル内の値の位置を取得
function findValuePosition(
  content: string,
  line: number,
  value: string,
): number {
  const lines = content.split("\n");
  const targetLine = lines[line] ?? "";
  // 文字列リテラル内の値を検索（"value" または 'value'）
  const doubleQuoteMatch = targetLine.indexOf(`"${value}"`);
  if (doubleQuoteMatch !== -1) {
    return doubleQuoteMatch + 1; // 引用符の次の位置
  }
  const singleQuoteMatch = targetLine.indexOf(`'${value}'`);
  if (singleQuoteMatch !== -1) {
    return singleQuoteMatch + 1;
  }
  return -1;
}

// === Process1 sub1: 基本テスト ===

Deno.test("LiteralTypeHoverProvider - returns documentation for CharacterRole protagonist", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const char: Character = {
  role: "protagonist"
};`;
  // "protagonist" の位置
  const pos = findValuePosition(content, 1, "protagonist");
  const result = provider.getHover("file:///test.ts", content, {
    line: 1,
    character: pos,
  });

  assertExists(result);
  assertExists(result.contents);
  // Markdown形式でドキュメントが含まれる
  if (typeof result.contents === "object" && "value" in result.contents) {
    assertEquals(result.contents.value.includes("主人公"), true);
  }
});

Deno.test("LiteralTypeHoverProvider - returns null for non-TypeScript files (.md)", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `role: "protagonist"`;
  const result = provider.getHover("file:///test.md", content, {
    line: 0,
    character: 7,
  });

  assertEquals(result, null);
});

Deno.test("LiteralTypeHoverProvider - returns null when not in string literal", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const char: Character = {
  role: protagonist
};`;
  // 引用符がないので文字列リテラル外
  const result = provider.getHover("file:///test.ts", content, {
    line: 1,
    character: 10,
  });

  assertEquals(result, null);
});

Deno.test("LiteralTypeHoverProvider - returns null for unknown field", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const char: Character = {
  name: "太郎"
};`;
  const pos = findValuePosition(content, 1, "太郎");
  const result = provider.getHover("file:///test.ts", content, {
    line: 1,
    character: pos,
  });

  assertEquals(result, null);
});

// === Process1 sub1: rangeテスト ===

Deno.test("LiteralTypeHoverProvider - returns correct hover range", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const char: Character = {
  role: "protagonist"
};`;
  const pos = findValuePosition(content, 1, "protagonist");
  const result = provider.getHover("file:///test.ts", content, {
    line: 1,
    character: pos,
  });

  assertExists(result);
  assertExists(result.range);
  // 範囲が正しいか確認
  assertEquals(result.range.start.line, 1);
  assertEquals(result.range.end.line, 1);
});

// === Process1 sub2: 全リテラル型のホバー対応 ===

Deno.test("LiteralTypeHoverProvider - returns documentation for ForeshadowingType prophecy", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const fs: Foreshadowing = {
  type: "prophecy"
};`;
  const pos = findValuePosition(content, 1, "prophecy");
  const result = provider.getHover("file:///test.ts", content, {
    line: 1,
    character: pos,
  });

  assertExists(result);
  assertExists(result.contents);
  if (typeof result.contents === "object" && "value" in result.contents) {
    assertEquals(result.contents.value.includes("予言"), true);
  }
});

Deno.test("LiteralTypeHoverProvider - returns documentation for ForeshadowingStatus planted", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const fs: Foreshadowing = {
  status: "planted"
};`;
  const pos = findValuePosition(content, 1, "planted");
  const result = provider.getHover("file:///test.ts", content, {
    line: 1,
    character: pos,
  });

  assertExists(result);
  assertExists(result.contents);
  if (typeof result.contents === "object" && "value" in result.contents) {
    assertEquals(result.contents.value.includes("設置済み"), true);
  }
});

Deno.test("LiteralTypeHoverProvider - returns documentation for SettingType location", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const setting: Setting = {
  type: "location"
};`;
  const pos = findValuePosition(content, 1, "location");
  const result = provider.getHover("file:///test.ts", content, {
    line: 1,
    character: pos,
  });

  assertExists(result);
  assertExists(result.contents);
  if (typeof result.contents === "object" && "value" in result.contents) {
    assertEquals(result.contents.value.includes("場所"), true);
  }
});

Deno.test("LiteralTypeHoverProvider - returns documentation for EventCategory plot_point", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const event: TimelineEvent = {
  category: "plot_point"
};`;
  const pos = findValuePosition(content, 1, "plot_point");
  const result = provider.getHover("file:///test.ts", content, {
    line: 1,
    character: pos,
  });

  assertExists(result);
  assertExists(result.contents);
  if (typeof result.contents === "object" && "value" in result.contents) {
    assertEquals(result.contents.value.includes("プロット"), true);
  }
});

Deno.test("LiteralTypeHoverProvider - returns documentation for RelationType in relationships", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const char: Character = {
  relationships: {
    prince: "ally"
  }
};`;
  const pos = findValuePosition(content, 2, "ally");
  const result = provider.getHover("file:///test.ts", content, {
    line: 2,
    character: pos,
  });

  assertExists(result);
  assertExists(result.contents);
  if (typeof result.contents === "object" && "value" in result.contents) {
    assertEquals(result.contents.value.includes("味方"), true);
  }
});

Deno.test("LiteralTypeHoverProvider - returns documentation for TransitionType gradual", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const phase: CharacterPhase = {
  transitionType: "gradual"
};`;
  const pos = findValuePosition(content, 1, "gradual");
  const result = provider.getHover("file:///test.ts", content, {
    line: 1,
    character: pos,
  });

  assertExists(result);
  assertExists(result.contents);
  if (typeof result.contents === "object" && "value" in result.contents) {
    assertEquals(result.contents.value.includes("段階的"), true);
  }
});

// === .tsx ファイルテスト ===

Deno.test("LiteralTypeHoverProvider - works with .tsx files", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const char: Character = {
  role: "protagonist"
};`;
  const pos = findValuePosition(content, 1, "protagonist");
  const result = provider.getHover("file:///test.tsx", content, {
    line: 1,
    character: pos,
  });

  assertExists(result);
  assertExists(result.contents);
});

// === TypeName表示テスト ===

Deno.test("LiteralTypeHoverProvider - hover includes type name", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const char: Character = {
  role: "protagonist"
};`;
  const pos = findValuePosition(content, 1, "protagonist");
  const result = provider.getHover("file:///test.ts", content, {
    line: 1,
    character: pos,
  });

  assertExists(result);
  if (typeof result.contents === "object" && "value" in result.contents) {
    assertEquals(result.contents.value.includes("CharacterRole"), true);
  }
});

// === Process10 sub1: エッジケーステスト ===

Deno.test("LiteralTypeHoverProvider - returns null for empty string literal", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const char: Character = {
  role: ""
};`;
  // 空文字列リテラルの位置
  const closeQuotePos = findPositionInString(content, 1, '"', 2);
  const result = provider.getHover("file:///test.ts", content, {
    line: 1,
    character: closeQuotePos,
  });

  assertEquals(result, null);
});

Deno.test("LiteralTypeHoverProvider - returns null for partial value (pro instead of protagonist)", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const char: Character = {
  role: "pro"
};`;
  const pos = findValuePosition(content, 1, "pro");
  const result = provider.getHover("file:///test.ts", content, {
    line: 1,
    character: pos,
  });

  // "pro" は完全一致しないのでnull
  assertEquals(result, null);
});

Deno.test("LiteralTypeHoverProvider - returns null for unknown value", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const char: Character = {
  role: "unknown_role"
};`;
  const pos = findValuePosition(content, 1, "unknown_role");
  const result = provider.getHover("file:///test.ts", content, {
    line: 1,
    character: pos,
  });

  assertEquals(result, null);
});

Deno.test("LiteralTypeHoverProvider - works with nested object (delta.traits)", () => {
  const provider = new LiteralTypeHoverProvider();

  // CharacterPhaseのtransitionType
  const content = `const phase: CharacterPhase = {
  delta: {
    traits: {
      add: ["勇敢"]
    }
  },
  transitionType: "gradual"
};`;
  const pos = findValuePosition(content, 5, "gradual");
  const result = provider.getHover("file:///test.ts", content, {
    line: 5,
    character: pos,
  });

  assertExists(result);
  if (typeof result.contents === "object" && "value" in result.contents) {
    assertEquals(result.contents.value.includes("段階的"), true);
  }
});

Deno.test("LiteralTypeHoverProvider - returns null for .json files", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `{
  "role": "protagonist"
}`;
  const result = provider.getHover("file:///test.json", content, {
    line: 1,
    character: 10,
  });

  // .jsonファイルはサポート対象外
  assertEquals(result, null);
});

Deno.test("LiteralTypeHoverProvider - returns null when cursor is on field name not value", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const char: Character = {
  role: "protagonist"
};`;
  // "role" フィールド名の位置（引用符の外）
  const result = provider.getHover("file:///test.ts", content, {
    line: 1,
    character: 3,
  });

  assertEquals(result, null);
});

Deno.test("LiteralTypeHoverProvider - handles multiline content correctly", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `// キャラクター定義
const char: Character = {
  name: "太郎",
  role: "protagonist",
  description: "勇敢な主人公"
};`;
  const pos = findValuePosition(content, 3, "protagonist");
  const result = provider.getHover("file:///test.ts", content, {
    line: 3,
    character: pos,
  });

  assertExists(result);
  if (typeof result.contents === "object" && "value" in result.contents) {
    assertEquals(result.contents.value.includes("主人公"), true);
  }
});

Deno.test("LiteralTypeHoverProvider - handles all ForeshadowingImportance values", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const fs: Foreshadowing = {
  importance: "major"
};`;
  const pos = findValuePosition(content, 1, "major");
  const result = provider.getHover("file:///test.ts", content, {
    line: 1,
    character: pos,
  });

  assertExists(result);
  if (typeof result.contents === "object" && "value" in result.contents) {
    assertEquals(result.contents.value.includes("主要な伏線"), true);
  }
});

Deno.test("LiteralTypeHoverProvider - handles EventImportance values", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const event: TimelineEvent = {
  importance: "minor"
};`;
  const pos = findValuePosition(content, 1, "minor");
  const result = provider.getHover("file:///test.ts", content, {
    line: 1,
    character: pos,
  });

  assertExists(result);
  if (typeof result.contents === "object" && "value" in result.contents) {
    assertEquals(result.contents.value.includes("副次的"), true);
  }
});

Deno.test("LiteralTypeHoverProvider - handles TimelineScope values", () => {
  const provider = new LiteralTypeHoverProvider();

  const content = `const tl: Timeline = {
  scope: "arc"
};`;
  const pos = findValuePosition(content, 1, "arc");
  const result = provider.getHover("file:///test.ts", content, {
    line: 1,
    character: pos,
  });

  assertExists(result);
  if (typeof result.contents === "object" && "value" in result.contents) {
    assertEquals(result.contents.value.includes("アーク"), true);
  }
});
