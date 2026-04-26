import { assertEquals, assertExists } from "jsr:@std/assert";
import { subplotCreateTool } from "@storyteller/mcp/tools/definitions/subplot_create.ts";
import { subplotViewTool } from "@storyteller/mcp/tools/definitions/subplot_view.ts";
import { beatCreateTool } from "@storyteller/mcp/tools/definitions/beat_create.ts";
import { intersectionCreateTool } from "@storyteller/mcp/tools/definitions/intersection_create.ts";
import { manuscriptBindingTool } from "@storyteller/mcp/tools/definitions/manuscript_binding.ts";

Deno.test("MCP integration: all subplot tools are registered", () => {
  assertExists(subplotCreateTool);
  assertExists(subplotViewTool);
  assertExists(beatCreateTool);
  assertExists(intersectionCreateTool);

  assertEquals(subplotCreateTool.name, "subplot_create");
  assertEquals(subplotViewTool.name, "subplot_view");
  assertEquals(beatCreateTool.name, "beat_create");
  assertEquals(intersectionCreateTool.name, "intersection_create");
});

Deno.test("MCP integration: subplot tools have valid descriptions", () => {
  for (
    const tool of [
      subplotCreateTool,
      subplotViewTool,
      beatCreateTool,
      intersectionCreateTool,
    ]
  ) {
    assertExists(tool.description);
    assertEquals((tool.description ?? "").length > 0, true);
  }
});

Deno.test("MCP integration: subplot tools have inputSchema", () => {
  for (
    const tool of [
      subplotCreateTool,
      subplotViewTool,
      beatCreateTool,
      intersectionCreateTool,
    ]
  ) {
    assertExists(tool.inputSchema);
    assertEquals(typeof tool.inputSchema, "object");
  }
});

Deno.test("MCP integration: manuscript_binding supports subplots entityType", () => {
  const schema = manuscriptBindingTool.inputSchema as {
    properties?: Record<string, { enum?: string[] }>;
  };
  const entityTypes = schema.properties?.entityType?.enum ?? [];
  assertEquals(entityTypes.includes("subplots"), true);
});

Deno.test("MCP integration: subplot_create tool accepts required fields", () => {
  const schema = subplotCreateTool.inputSchema as {
    properties?: Record<string, { type?: string }>;
    required?: string[];
  };
  const props = schema.properties ?? {};
  assertExists(props.name);
  assertExists(props.type);
  assertExists(props.summary);

  const required = schema.required ?? [];
  assertEquals(required.includes("name"), true);
  assertEquals(required.includes("type"), true);
  assertEquals(required.includes("summary"), true);
});

Deno.test("MCP integration: beat_create tool requires subplot reference", () => {
  const schema = beatCreateTool.inputSchema as {
    properties?: Record<string, { type?: string }>;
    required?: string[];
  };
  const props = schema.properties ?? {};
  assertExists(props.subplotId);
  assertExists(props.title);
  assertExists(props.summary);

  const required = schema.required ?? [];
  assertEquals(required.includes("subplotId"), true);
  assertEquals(required.includes("title"), true);
});

Deno.test("MCP integration: intersection_create requires source and target", () => {
  const schema = intersectionCreateTool.inputSchema as {
    properties?: Record<string, { type?: string }>;
    required?: string[];
  };
  const props = schema.properties ?? {};
  assertExists(props.sourceSubplotId);
  assertExists(props.targetSubplotId);
  assertExists(props.sourceBeatId);
  assertExists(props.targetBeatId);

  const required = schema.required ?? [];
  assertEquals(required.includes("sourceSubplotId"), true);
  assertEquals(required.includes("targetSubplotId"), true);
});

Deno.test("MCP integration: subplot_view supports list and detail modes", () => {
  const schema = subplotViewTool.inputSchema as {
    properties?: Record<string, unknown>;
  };
  const props = schema.properties ?? {};
  assertExists(props.action);
  assertExists(props.subplotId);
});
