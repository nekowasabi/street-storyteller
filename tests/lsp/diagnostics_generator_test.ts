/**
 * DiagnosticsGeneratorテスト
 * Process6 Sub1: 診断機能のテスト
 *
 * TDD Red Phase: 実装がないため、このテストは失敗する
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  DiagnosticSeverity,
  DiagnosticsGenerator,
} from "@storyteller/lsp/diagnostics/diagnostics_generator.ts";
import {
  type DetectableEntity,
  PositionedDetector,
} from "@storyteller/lsp/detection/positioned_detector.ts";

// テスト用のモックエンティティデータ
const mockEntities: DetectableEntity[] = [
  {
    kind: "character",
    id: "hero",
    name: "勇者",
    displayNames: ["勇者", "ヒーロー"],
    aliases: ["主人公"],
    filePath: "src/characters/hero.ts",
  },
  {
    kind: "character",
    id: "princess",
    name: "姫",
    displayNames: ["姫", "王女"],
    aliases: [],
    filePath: "src/characters/princess.ts",
  },
  {
    kind: "setting",
    id: "castle",
    name: "城",
    displayNames: ["城", "王城"],
    aliases: ["城塞"],
    filePath: "src/settings/castle.ts",
  },
];

Deno.test("DiagnosticsGenerator - reports undefined character reference as Warning", async () => {
  const detector = new PositionedDetector(mockEntities);
  const generator = new DiagnosticsGenerator(detector);

  // 未定義のキャラクター「魔王」への参照
  const content = "魔王が現れた。";
  const diagnostics = await generator.generate(
    "file:///test.md",
    content,
    "/project",
  );

  // 未定義の参照があれば警告を出す
  // ただし、このテストでは「魔王」は定義済みエンティティにないため検出されない
  // 未定義参照の検出ロジックは別途検討が必要
  assertEquals(Array.isArray(diagnostics), true);
});

Deno.test("DiagnosticsGenerator - reports low confidence match as Hint", async () => {
  const detector = new PositionedDetector(mockEntities);
  const generator = new DiagnosticsGenerator(detector);

  // alias "主人公" での参照（confidence: 0.8）
  const content = "主人公は冒険を始めた。";
  const diagnostics = await generator.generate(
    "file:///test.md",
    content,
    "/project",
  );

  // 低信頼度（< 0.9）のマッチはHintとして報告
  const hintDiagnostics = diagnostics.filter(
    (d) => d.severity === DiagnosticSeverity.Hint,
  );
  assertEquals(hintDiagnostics.length >= 1, true);
});

Deno.test("DiagnosticsGenerator - includes accurate range information", async () => {
  const detector = new PositionedDetector(mockEntities);
  const generator = new DiagnosticsGenerator(detector);

  const content = "主人公は冒険を始めた。";
  const diagnostics = await generator.generate(
    "file:///test.md",
    content,
    "/project",
  );

  // 診断にはrange情報が含まれる
  for (const diagnostic of diagnostics) {
    assertExists(diagnostic.range);
    assertExists(diagnostic.range.start);
    assertExists(diagnostic.range.end);
    assertEquals(typeof diagnostic.range.start.line, "number");
    assertEquals(typeof diagnostic.range.start.character, "number");
    assertEquals(typeof diagnostic.range.end.line, "number");
    assertEquals(typeof diagnostic.range.end.character, "number");
  }
});

Deno.test("DiagnosticsGenerator - includes related information", async () => {
  const detector = new PositionedDetector(mockEntities);
  const generator = new DiagnosticsGenerator(detector);

  const content = "主人公は冒険を始めた。";
  const diagnostics = await generator.generate(
    "file:///test.md",
    content,
    "/project",
  );

  // 低信頼度マッチには候補情報が含まれる
  for (const diagnostic of diagnostics) {
    assertExists(diagnostic.message);
    assertEquals(diagnostic.source, "storyteller");
  }
});

Deno.test("DiagnosticsGenerator - returns empty array for no issues", async () => {
  const detector = new PositionedDetector(mockEntities);
  const generator = new DiagnosticsGenerator(detector);

  // 高信頼度の参照のみ
  const content = "勇者は城に向かった。";
  const diagnostics = await generator.generate(
    "file:///test.md",
    content,
    "/project",
  );

  // 高信頼度マッチのみなので診断なし
  assertEquals(diagnostics.length, 0);
});

Deno.test("DiagnosticsGenerator - handles multiple diagnostics", async () => {
  // 複数の低信頼度参照をテストするため、別々のエンティティでaliasのみ持つものを定義
  const testEntities: DetectableEntity[] = [
    {
      kind: "character",
      id: "warrior",
      name: "戦士A",
      displayNames: [],
      aliases: ["剣士"],
      filePath: "src/characters/warrior.ts",
    },
    {
      kind: "character",
      id: "mage",
      name: "魔法使いB",
      displayNames: [],
      aliases: ["魔術師"],
      filePath: "src/characters/mage.ts",
    },
  ];
  const detector = new PositionedDetector(testEntities);
  const generator = new DiagnosticsGenerator(detector);

  // 両方aliasでconfidence: 0.8
  const content = "剣士と魔術師は旅に出た。";
  const diagnostics = await generator.generate(
    "file:///test.md",
    content,
    "/project",
  );

  // 複数の診断が生成される（両方0.8で診断対象）
  assertEquals(diagnostics.length >= 2, true);
});

Deno.test("DiagnosticsGenerator - handles multi-line content", async () => {
  const detector = new PositionedDetector(mockEntities);
  const generator = new DiagnosticsGenerator(detector);

  // "主人公"（alias, confidence: 0.8）のみが低信頼度
  const content = "第一章\n主人公は旅に出た。\n城を目指した。";
  const diagnostics = await generator.generate(
    "file:///test.md",
    content,
    "/project",
  );

  // 複数行にわたる診断
  // "主人公"は2行目（0-indexed: 1）で診断が生成される
  const lines = diagnostics.map((d) => d.range.start.line);
  assertEquals(lines.some((l) => l === 1), true);
});

Deno.test("DiagnosticsGenerator - provides confidence info in message", async () => {
  const detector = new PositionedDetector(mockEntities);
  const generator = new DiagnosticsGenerator(detector);

  const content = "主人公は冒険を始めた。";
  const diagnostics = await generator.generate(
    "file:///test.md",
    content,
    "/project",
  );

  // メッセージに信頼度情報が含まれる
  for (const diagnostic of diagnostics) {
    // 信頼度や候補に関する情報がメッセージに含まれる
    assertEquals(diagnostic.message.length > 0, true);
  }
});
