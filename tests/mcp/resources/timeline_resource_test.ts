/**
 * Timeline MCP Resourceテスト（TDD Red Phase）
 */

import { assertEquals, assertExists } from "@std/assert";
import { parseResourceUri } from "../../../src/mcp/resources/uri_parser.ts";
import { ProjectResourceProvider } from "../../../src/mcp/resources/project_resource_provider.ts";

Deno.test("parseResourceUri: timelines一覧URIを解析できる", () => {
  const parsed = parseResourceUri("storyteller://timelines");
  assertEquals(parsed.type, "timelines");
  assertEquals(parsed.id, undefined);
});

Deno.test("parseResourceUri: 個別timeline URIを解析できる", () => {
  const parsed = parseResourceUri("storyteller://timeline/main_story");
  assertEquals(parsed.type, "timeline");
  assertEquals(parsed.id, "main_story");
});

Deno.test("ProjectResourceProvider: timelines一覧リソースを含む", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    // タイムラインディレクトリを作成
    const timelinesDir = `${tempDir}/src/timelines`;
    await Deno.mkdir(timelinesDir, { recursive: true });

    const timeline = `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

export const main_story: Timeline = {
  "id": "main_story",
  "name": "メインストーリー",
  "scope": "story",
  "summary": "物語の主要なタイムライン",
  "events": []
};
`;
    await Deno.writeTextFile(`${timelinesDir}/main_story.ts`, timeline);

    const provider = new ProjectResourceProvider(tempDir);
    const resources = await provider.listResources();

    // timelines一覧リソースが含まれること
    const timelinesResource = resources.find(r => r.uri === "storyteller://timelines");
    assertExists(timelinesResource, "timelines resource should exist");

    // 個別timelineリソースが含まれること
    const timelineResource = resources.find(r => r.uri === "storyteller://timeline/main_story");
    assertExists(timelineResource, "individual timeline resource should exist");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("ProjectResourceProvider: timelines一覧を読み取れる", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const timelinesDir = `${tempDir}/src/timelines`;
    await Deno.mkdir(timelinesDir, { recursive: true });

    const timeline = `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

export const test_timeline: Timeline = {
  "id": "test_timeline",
  "name": "テストタイムライン",
  "scope": "story",
  "summary": "テスト用タイムライン",
  "events": []
};
`;
    await Deno.writeTextFile(`${timelinesDir}/test_timeline.ts`, timeline);

    const provider = new ProjectResourceProvider(tempDir);
    const content = await provider.readResource("storyteller://timelines");
    const timelines = JSON.parse(content);

    assertEquals(Array.isArray(timelines), true);
    assertEquals(timelines.length >= 1, true);
    assertEquals(timelines[0].id, "test_timeline");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("ProjectResourceProvider: 個別timelineを読み取れる", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const timelinesDir = `${tempDir}/src/timelines`;
    await Deno.mkdir(timelinesDir, { recursive: true });

    const timeline = `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

export const main_story: Timeline = {
  "id": "main_story",
  "name": "メインストーリー",
  "scope": "story",
  "summary": "物語の主要なタイムライン",
  "events": [
    {
      "id": "event_1",
      "title": "物語の始まり",
      "category": "plot_point",
      "time": { "order": 1 },
      "summary": "すべての始まり",
      "characters": [],
      "settings": [],
      "chapters": []
    }
  ]
};
`;
    await Deno.writeTextFile(`${timelinesDir}/main_story.ts`, timeline);

    const provider = new ProjectResourceProvider(tempDir);
    const content = await provider.readResource("storyteller://timeline/main_story");
    const timeline_obj = JSON.parse(content);

    assertEquals(timeline_obj.id, "main_story");
    assertEquals(timeline_obj.name, "メインストーリー");
    assertEquals(timeline_obj.events.length, 1);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("ProjectResourceProvider: 存在しないtimelineでエラーを返す", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const provider = new ProjectResourceProvider(tempDir);

    let threw = false;
    try {
      await provider.readResource("storyteller://timeline/nonexistent");
    } catch (e) {
      threw = true;
      assertEquals((e as Error).message.includes("not found"), true);
    }

    assertEquals(threw, true, "expected to throw");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
