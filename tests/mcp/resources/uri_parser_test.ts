/**
 * URIパーサーのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals } from "@std/assert";
import { parseResourceUri } from "@storyteller/mcp/resources/uri_parser.ts";

Deno.test("parseResourceUri: characters一覧URIを解析できる", () => {
  const parsed = parseResourceUri("storyteller://characters");
  assertEquals(parsed.type, "characters");
  assertEquals(parsed.id, undefined);
});

Deno.test("parseResourceUri: 個別character URIを解析できる", () => {
  const parsed = parseResourceUri("storyteller://character/hero");
  assertEquals(parsed.type, "character");
  assertEquals(parsed.id, "hero");
});

Deno.test("parseResourceUri: settings一覧URIを解析できる", () => {
  const parsed = parseResourceUri("storyteller://settings");
  assertEquals(parsed.type, "settings");
  assertEquals(parsed.id, undefined);
});

Deno.test("parseResourceUri: 個別setting URIを解析できる", () => {
  const parsed = parseResourceUri("storyteller://setting/kingdom");
  assertEquals(parsed.type, "setting");
  assertEquals(parsed.id, "kingdom");
});

Deno.test("parseResourceUri: chapters URIを解析できる", () => {
  const parsed = parseResourceUri("storyteller://chapters");
  assertEquals(parsed.type, "chapters");
  assertEquals(parsed.id, undefined);
});

Deno.test("parseResourceUri: manuscript URIを解析できる", () => {
  const parsed = parseResourceUri("storyteller://manuscript/chapter01");
  assertEquals(parsed.type, "manuscript");
  assertEquals(parsed.id, "chapter01");
});

Deno.test("parseResourceUri: project URIを解析できる", () => {
  const parsed = parseResourceUri("storyteller://project");
  assertEquals(parsed.type, "project");
  assertEquals(parsed.id, undefined);
});

Deno.test("parseResourceUri: URLエンコードされたIDをデコードできる", () => {
  const parsed = parseResourceUri(
    "storyteller://character/%E5%8B%87%E8%80%85",
  );
  assertEquals(parsed.type, "character");
  assertEquals(parsed.id, "勇者");
});

Deno.test("parseResourceUri: 無効なURIでエラーを投げる", () => {
  let threw = false;
  try {
    parseResourceUri("not a valid uri");
  } catch (e) {
    threw = true;
    assertEquals(
      (e as Error).message.includes("Invalid resource URI"),
      true,
    );
  }
  assertEquals(threw, true, "expected to throw");
});

Deno.test("parseResourceUri: サポートされていないプロトコルでエラーを投げる", () => {
  let threw = false;
  try {
    parseResourceUri("http://example.com/characters");
  } catch (e) {
    threw = true;
    assertEquals(
      (e as Error).message.includes("Unsupported resource URI scheme"),
      true,
    );
  }
  assertEquals(threw, true, "expected to throw");
});

Deno.test("parseResourceUri: サポートされていないリソースタイプでエラーを投げる", () => {
  let threw = false;
  try {
    parseResourceUri("storyteller://unknown");
  } catch (e) {
    threw = true;
    assertEquals(
      (e as Error).message.includes("Unsupported resource type"),
      true,
    );
  }
  assertEquals(threw, true, "expected to throw");
});

// =====================================================
// expand クエリパラメータのテスト
// =====================================================

Deno.test("parseResourceUri: expand=detailsクエリパラメータを解析できる", () => {
  const parsed = parseResourceUri(
    "storyteller://character/hero?expand=details",
  );
  assertEquals(parsed.type, "character");
  assertEquals(parsed.id, "hero");
  assertEquals(parsed.expand, "details");
});

Deno.test("parseResourceUri: expand=detailsをsetting URIでも解析できる", () => {
  const parsed = parseResourceUri(
    "storyteller://setting/kingdom?expand=details",
  );
  assertEquals(parsed.type, "setting");
  assertEquals(parsed.id, "kingdom");
  assertEquals(parsed.expand, "details");
});

Deno.test("parseResourceUri: クエリパラメータがない場合expandはundefined", () => {
  const parsed = parseResourceUri("storyteller://character/hero");
  assertEquals(parsed.type, "character");
  assertEquals(parsed.id, "hero");
  assertEquals(parsed.expand, undefined);
});

Deno.test("parseResourceUri: 無効なexpand値は無視される", () => {
  const parsed = parseResourceUri(
    "storyteller://character/hero?expand=invalid",
  );
  assertEquals(parsed.type, "character");
  assertEquals(parsed.id, "hero");
  assertEquals(parsed.expand, undefined);
});
