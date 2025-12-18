/**
 * 外部ファイル詳細設定のシナリオテスト
 *
 * このテストは、キャラクターのdetailsフィールドに外部ファイル参照を設定し、
 * FileContentReaderで正しく読み込まれることを検証します。
 *
 * テスト対象: samples/cinderellaプロジェクト
 */

import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { FileContentReader } from "../../src/plugins/features/details/file_content_reader.ts";
import { EntityDetailsExpander } from "../../src/plugins/features/details/entity_details_expander.ts";
import { join } from "@std/path";

/**
 * samples/cinderellaプロジェクトのルートパス
 */
const PROJECT_ROOT = join(Deno.cwd(), "samples/cinderella");

/**
 * cinderellaキャラクター定義を動的に読み込む
 */
async function loadCinderellaCharacter() {
  const filePath = join(PROJECT_ROOT, "src/characters/cinderella.ts");
  const fileUrl = `file://${filePath}`;
  const mod = await import(fileUrl);
  return mod.cinderella;
}

Deno.test("External File Details - cinderellaプロジェクトでの統合テスト", async (t) => {
  const cinderella = await loadCinderellaCharacter();

  await t.step(
    "cinderellaキャラクターにdetails.descriptionが定義されている",
    () => {
      assertExists(cinderella.details, "cinderella.detailsが存在すること");
      assertExists(
        cinderella.details.description,
        "cinderella.details.descriptionが存在すること",
      );
      assertEquals(
        typeof cinderella.details.description,
        "object",
        "descriptionはオブジェクト（ファイル参照）であること",
      );

      const descRef = cinderella.details.description as { file: string };
      assertExists(descRef.file, "descriptionにfileプロパティが存在すること");
      assertStringIncludes(
        descRef.file,
        "cinderella_description.md",
        "ファイルパスにcinderella_description.mdが含まれること",
      );
    },
  );

  await t.step("FileContentReaderで外部ファイルを読み込める", async () => {
    const reader = new FileContentReader(PROJECT_ROOT);

    // ファイル参照のパスを取得
    const descRef = cinderella.details!.description as { file: string };

    // ファイル内容を読み込む
    const result = await reader.readFileContent(descRef.file);

    assertEquals(result.ok, true, "ファイル読み込みが成功すること");
    if (result.ok) {
      // フロントマターが除去されていることを確認
      assertEquals(
        result.value.includes("---"),
        false,
        "フロントマターが除去されていること",
      );

      // 本文の内容が含まれていることを確認
      assertStringIncludes(
        result.value,
        "シンデレラは",
        "本文にシンデレラの説明が含まれること",
      );
      assertStringIncludes(
        result.value,
        "継母",
        "本文に継母への言及が含まれること",
      );
      assertStringIncludes(
        result.value,
        "優しさ",
        "本文に性格に関する記述が含まれること",
      );
    }
  });

  await t.step(
    "resolveHybridFieldでインライン/ファイル参照を解決できる",
    async () => {
      const reader = new FileContentReader(PROJECT_ROOT);

      // ファイル参照を解決
      const result = await reader.resolveHybridField(
        cinderella.details!.description,
      );

      assertEquals(result.ok, true, "ファイル参照の解決が成功すること");
      if (result.ok) {
        assertExists(result.value, "解決された値が存在すること");
        assertStringIncludes(
          result.value!,
          "シンデレラは",
          "解決された内容が正しいこと",
        );
      }

      // インライン文字列の場合
      const inlineResult = await reader.resolveHybridField("インライン説明文");
      assertEquals(inlineResult.ok, true);
      if (inlineResult.ok) {
        assertEquals(inlineResult.value, "インライン説明文");
      }

      // undefinedの場合
      const undefinedResult = await reader.resolveHybridField(undefined);
      assertEquals(undefinedResult.ok, true);
      if (undefinedResult.ok) {
        assertEquals(undefinedResult.value, undefined);
      }
    },
  );

  await t.step("EntityDetailsExpanderで詳細を展開できる", async () => {
    const expander = new EntityDetailsExpander(PROJECT_ROOT);

    // cinderellaのdetailsを展開
    const result = await expander.expandFromFile(
      "src/characters/cinderella.ts",
      "cinderella",
    );

    assertEquals(result.ok, true, "詳細展開が成功すること");
    if (result.ok) {
      assertExists(result.value.description, "descriptionが展開されること");
      assertStringIncludes(
        result.value.description!,
        "シンデレラは",
        "展開された内容が正しいこと",
      );
    }
  });

  await t.step("フロントマター内のメタデータは除去される", async () => {
    const reader = new FileContentReader(PROJECT_ROOT);
    const descRef = cinderella.details!.description as { file: string };
    const result = await reader.readFileContent(descRef.file);

    assertEquals(result.ok, true);
    if (result.ok) {
      // フロントマターの内容が本文に含まれていないことを確認
      assertEquals(
        result.value.includes("type: character_detail"),
        false,
        "フロントマターのtype指定が除去されていること",
      );
      assertEquals(
        result.value.includes("character_id: cinderella"),
        false,
        "フロントマターのcharacter_idが除去されていること",
      );
      assertEquals(
        result.value.includes("field: description"),
        false,
        "フロントマターのfield指定が除去されていること",
      );
    }
  });

  await t.step("存在しないファイルはエラーを返す", async () => {
    const reader = new FileContentReader(PROJECT_ROOT);

    const result = await reader.readFileContent(
      "src/characters/nonexistent.md",
    );

    assertEquals(result.ok, false, "存在しないファイルはエラーになること");
    if (!result.ok) {
      assertEquals(result.error.type, "file_not_found");
      assertStringIncludes(result.error.filePath, "nonexistent.md");
    }
  });
});

/**
 * Markdownファイルの構造テスト
 */
Deno.test("External File Details - Markdownファイル構造の検証", async (t) => {
  await t.step("cinderella_description.mdが正しい構造を持つ", async () => {
    // ファイルの生内容を読み込む
    const rawContent = await Deno.readTextFile(
      join(PROJECT_ROOT, "src/characters/cinderella_description.md"),
    );

    // フロントマターが存在することを確認
    assertEquals(
      rawContent.startsWith("---"),
      true,
      "ファイルがフロントマターで始まること",
    );

    // フロントマターにメタデータが含まれることを確認
    assertStringIncludes(rawContent, "type: character_detail");
    assertStringIncludes(rawContent, "character_id: cinderella");
    assertStringIncludes(rawContent, "field: description");

    // 本文セクションが含まれることを確認
    assertStringIncludes(rawContent, "## 生い立ち");
    assertStringIncludes(rawContent, "## 性格");
    assertStringIncludes(rawContent, "## 日々の生活");
    assertStringIncludes(rawContent, "## 亡き母との絆");
  });
});

/**
 * キャラクター型定義との整合性テスト
 */
Deno.test("External File Details - Character型との整合性", async () => {
  const cinderella = await loadCinderellaCharacter();

  // cinderellaが正しいCharacter型であることを確認
  assertEquals(typeof cinderella.id, "string");
  assertEquals(typeof cinderella.name, "string");
  assertEquals(typeof cinderella.role, "string");
  assertEquals(Array.isArray(cinderella.traits), true);
  assertEquals(typeof cinderella.relationships, "object");
  assertEquals(Array.isArray(cinderella.appearingChapters), true);
  assertEquals(typeof cinderella.summary, "string");

  // detailsが正しい構造を持つことを確認
  assertExists(cinderella.details);
  const description = cinderella.details.description;

  // descriptionがファイル参照形式であることを確認
  assertEquals(typeof description, "object");
  const fileRef = description as { file: string };
  assertEquals(typeof fileRef.file, "string");
});

/**
 * ViewCharacterCommandの--detailsオプションテスト
 */
Deno.test("External File Details - ViewCharacterCommandの--detailsオプション", async (t) => {
  // 直接コマンドクラスをインポート
  const { ViewCharacterCommand, DefaultCharacterLoader } = await import(
    "../../src/cli/modules/view/character.ts"
  );

  // テスト用のモックローダーを作成
  const cinderella = await loadCinderellaCharacter();
  const mockLoader = {
    loadCharacter: async (_id: string) => cinderella,
  };

  await t.step("--detailsオプションで詳細情報が展開される", async () => {
    const command = new ViewCharacterCommand(mockLoader);
    const messages: string[] = [];
    const mockPresenter = {
      showInfo: (msg: string) => messages.push(msg),
      showSuccess: () => {},
      showWarning: () => {},
      showError: () => {},
    };

    const mockConfig = {
      resolve: async () => ({
        runtime: { projectRoot: PROJECT_ROOT },
      }),
    };

    const createMockLogger = () => ({
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      withContext: () => createMockLogger(),
    });

    const context = {
      logger: createMockLogger(),
      presenter: mockPresenter,
      args: {
        id: "cinderella",
        details: true,
        json: true,
        projectRoot: PROJECT_ROOT,
      },
      config: mockConfig,
    };

    const result = await command.execute(context as any);

    assertEquals(result.ok, true, "コマンド実行が成功すること");

    // JSON出力をパース
    const output = messages.join("");
    const parsed = JSON.parse(output);

    assertExists(parsed.character, "characterが含まれること");
    assertExists(parsed.resolvedDetails, "resolvedDetailsが含まれること");
    assertExists(
      parsed.resolvedDetails.description,
      "descriptionが展開されること",
    );
    assertStringIncludes(
      parsed.resolvedDetails.description,
      "シンデレラは",
      "外部ファイルの内容が読み込まれること",
    );
  });

  await t.step("--detailsなしの場合は詳細が展開されない", async () => {
    const command = new ViewCharacterCommand(mockLoader);
    const messages: string[] = [];
    const mockPresenter = {
      showInfo: (msg: string) => messages.push(msg),
      showSuccess: () => {},
      showWarning: () => {},
      showError: () => {},
    };

    const mockConfig = {
      resolve: async () => ({
        runtime: { projectRoot: PROJECT_ROOT },
      }),
    };

    const createMockLogger = () => ({
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      withContext: () => createMockLogger(),
    });

    const context = {
      logger: createMockLogger(),
      presenter: mockPresenter,
      args: {
        id: "cinderella",
        json: true,
        projectRoot: PROJECT_ROOT,
      },
      config: mockConfig,
    };

    const result = await command.execute(context as any);

    assertEquals(result.ok, true, "コマンド実行が成功すること");

    // JSON出力をパース
    const output = messages.join("");
    const parsed = JSON.parse(output);

    assertExists(parsed.character, "characterが含まれること");
    assertEquals(
      parsed.resolvedDetails,
      undefined,
      "--detailsなしではresolvedDetailsはundefined",
    );
  });
});
