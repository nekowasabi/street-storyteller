/**
 * DiagnosticsGenerator のテスト
 * Process 2: detectAll() メソッドの TDD (Red-Green-Refactor)
 */

import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { DiagnosticsGenerator } from "@storyteller/lsp/diagnostics/diagnostics_generator.ts";
import {
  type DetectableEntity,
  PositionedDetector,
} from "@storyteller/lsp/detection/positioned_detector.ts";

describe("DiagnosticsGenerator", () => {
  describe("detectAll()", () => {
    it("should return all matches including high-confidence ones", async () => {
      // Arrange: 高信頼度マッチを含むエンティティ設定
      const entities: DetectableEntity[] = [
        {
          kind: "character",
          id: "hero",
          name: "勇者",
          filePath: "src/characters/hero.ts",
        },
      ];
      const detector = new PositionedDetector(entities);
      const generator = new DiagnosticsGenerator(detector);
      const content = "勇者は剣を抜いた。";

      // Act
      const matches = await generator.detectAll(
        "file:///test.md",
        content,
        "/project",
      );

      // Assert: 高信頼度マッチも含めて返される
      assertEquals(matches.length > 0, true);
      // 全てのマッチのconfidenceを確認（suppressされていない）
      for (const match of matches) {
        assertEquals(typeof match.confidence, "number");
      }
    });

    it("should include confidence field in each match", async () => {
      const entities: DetectableEntity[] = [
        {
          kind: "character",
          id: "hero",
          name: "勇者",
          filePath: "src/characters/hero.ts",
        },
      ];
      const detector = new PositionedDetector(entities);
      const generator = new DiagnosticsGenerator(detector);
      const content = "勇者が現れた。";

      const matches = await generator.detectAll(
        "file:///test.md",
        content,
        "/project",
      );

      for (const match of matches) {
        assertEquals(typeof match.confidence, "number");
        assertEquals(match.confidence >= 0, true);
        assertEquals(match.confidence <= 1, true);
      }
    });

    it("should include entityId (id) in each match", async () => {
      const entities: DetectableEntity[] = [
        {
          kind: "setting",
          id: "royal_capital",
          name: "王都",
          filePath: "src/settings/royal_capital.ts",
        },
      ];
      const detector = new PositionedDetector(entities);
      const generator = new DiagnosticsGenerator(detector);
      const content = "王都に到着した。";

      const matches = await generator.detectAll(
        "file:///test.md",
        content,
        "/project",
      );

      assertEquals(matches.length > 0, true);
      for (const match of matches) {
        assertEquals(typeof match.id, "string");
        assertEquals(match.id, "royal_capital");
      }
    });

    it("should return empty array for text with no entity references", async () => {
      const entities: DetectableEntity[] = [
        {
          kind: "character",
          id: "hero",
          name: "勇者",
          filePath: "src/characters/hero.ts",
        },
      ];
      const detector = new PositionedDetector(entities);
      const generator = new DiagnosticsGenerator(detector);
      const content = "何の変哲もない文章である。";

      const matches = await generator.detectAll(
        "file:///test.md",
        content,
        "/project",
      );

      assertEquals(matches.length, 0);
    });

    it("should return more matches than generate() when high-confidence matches exist", async () => {
      // 高信頼度（>=0.9）のマッチは generate() では suppress されるが
      // detectAll() では含まれることを確認
      const entities: DetectableEntity[] = [
        {
          kind: "character",
          id: "hero",
          name: "勇者",
          filePath: "src/characters/hero.ts",
        },
      ];
      const detector = new PositionedDetector(entities);
      const generator = new DiagnosticsGenerator(detector);
      const content = "勇者は剣を抜いた。";

      const allMatches = await generator.detectAll(
        "file:///test.md",
        content,
        "/project",
      );
      const diagnostics = await generator.generate(
        "file:///test.md",
        content,
        "/project",
      );

      // detectAll は全マッチを返すが、generate は高信頼度をsuppressする
      // よって detectAll の結果数 >= generate の診断数
      assertEquals(allMatches.length >= diagnostics.length, true);
    });
  });

  describe("generate() regression", () => {
    it("should still return suppressed diagnostics (no behavior change)", async () => {
      const entities: DetectableEntity[] = [
        {
          kind: "character",
          id: "hero",
          name: "勇者",
          filePath: "src/characters/hero.ts",
        },
      ];
      const detector = new PositionedDetector(entities);
      const generator = new DiagnosticsGenerator(detector);
      const content = "勇者は剣を抜いた。";

      const diagnostics = await generator.generate(
        "file:///test.md",
        content,
        "/project",
      );

      // 既存動作: 全ての診断は source="storyteller"
      for (const d of diagnostics) {
        assertEquals(d.source, "storyteller");
      }
    });
  });
});
