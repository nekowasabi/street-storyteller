// tests/lsp/integration/textlint/textlint_config_test.ts
import { assertEquals } from "@std/assert";
import { describe, it, beforeEach, afterEach } from "@std/testing/bdd";
import { TextlintConfig, detectTextlintConfig } from "@storyteller/lsp/integration/textlint/textlint_config.ts";

describe("TextlintConfig", () => {
  const testDir = "./tmp/claude/textlint_config_test";

  beforeEach(async () => {
    await Deno.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await Deno.remove(testDir, { recursive: true }).catch(() => {});
  });

  it("should detect .textlintrc", async () => {
    await Deno.writeTextFile(`${testDir}/.textlintrc`, '{"rules":{}}');

    const config = await detectTextlintConfig(testDir);
    assertEquals(config.configPath?.endsWith(".textlintrc"), true);
  });

  it("should detect .textlintrc.json", async () => {
    await Deno.writeTextFile(`${testDir}/.textlintrc.json`, '{"rules":{}}');

    const config = await detectTextlintConfig(testDir);
    assertEquals(config.configPath?.endsWith(".textlintrc.json"), true);
  });

  it("should prioritize .textlintrc over .textlintrc.json", async () => {
    await Deno.writeTextFile(`${testDir}/.textlintrc`, '{"rules":{}}');
    await Deno.writeTextFile(`${testDir}/.textlintrc.json`, '{"rules":{}}');

    const config = await detectTextlintConfig(testDir);
    assertEquals(config.configPath?.endsWith(".textlintrc"), true);
  });

  it("should return null configPath when no config found", async () => {
    const config = await detectTextlintConfig(testDir);
    assertEquals(config.configPath, undefined);
  });

  it("should return default values when no config found", async () => {
    const config = await detectTextlintConfig(testDir);
    assertEquals(config.configPath, undefined);
    assertEquals(config.executablePath, "npx textlint");
    assertEquals(config.debounceMs, 500);
    assertEquals(config.timeoutMs, 30000);
    assertEquals(config.enabled, true);
  });

  it("should handle non-existent directory gracefully", async () => {
    const config = await detectTextlintConfig("/non/existent/directory");
    assertEquals(config.configPath, undefined);
    assertEquals(config.enabled, true);
  });

  it("should detect .textlintrc.yaml", async () => {
    await Deno.writeTextFile(`${testDir}/.textlintrc.yaml`, 'rules: {}');

    const config = await detectTextlintConfig(testDir);
    assertEquals(config.configPath?.endsWith(".textlintrc.yaml"), true);
  });

  it("should detect .textlintrc.yml", async () => {
    await Deno.writeTextFile(`${testDir}/.textlintrc.yml`, 'rules: {}');

    const config = await detectTextlintConfig(testDir);
    assertEquals(config.configPath?.endsWith(".textlintrc.yml"), true);
  });

  it("should prioritize config files in correct order", async () => {
    // Create multiple config files
    await Deno.writeTextFile(`${testDir}/.textlintrc.json`, '{"rules":{}}');
    await Deno.writeTextFile(`${testDir}/.textlintrc.yaml`, 'rules: {}');
    await Deno.writeTextFile(`${testDir}/.textlintrc`, '{"rules":{}}');

    const config = await detectTextlintConfig(testDir);
    // Should prioritize .textlintrc
    assertEquals(config.configPath?.endsWith(".textlintrc"), true);
  });
});
