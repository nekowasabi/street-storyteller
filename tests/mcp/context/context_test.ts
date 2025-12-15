/**
 * MCPコンテキスト管理のテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals } from "@std/assert";
import { SessionContext } from "../../../src/mcp/context/session_context.ts";
import { ProjectContext } from "../../../src/mcp/context/project_context.ts";

Deno.test("SessionContext: 履歴を保持する", () => {
  const ctx = new SessionContext();
  ctx.addMessage("user", "hello");
  ctx.addMessage("assistant", "hi");
  const history = ctx.getHistory();
  assertEquals(history.length, 2);
  assertEquals(history[0].role, "user");
});

Deno.test("ProjectContext: エンティティをキャッシュする", async () => {
  const ctx = new ProjectContext();
  let calls = 0;
  const loader = async () => {
    calls++;
    return { id: "hero" };
  };

  const a = await ctx.getOrLoad("character:hero", loader);
  const b = await ctx.getOrLoad("character:hero", loader);
  assertEquals(a.id, "hero");
  assertEquals(b.id, "hero");
  assertEquals(calls, 1);
});
