import { assert, assertEquals } from "./asserts.ts";
import {
  computeSha256Hex,
  createBuildManifest,
} from "../src/infrastructure/cli/build_manifest.ts";
import { join } from "@std/path/join";

Deno.test("computeSha256Hex returns deterministic checksum", async () => {
  const tempDir = await Deno.makeTempDir({ prefix: "manifest-checksum" });
  try {
    const filePath = join(tempDir, "artifact.bin");
    await Deno.writeTextFile(filePath, "storyteller");
    const checksum = await computeSha256Hex(filePath);
    assertEquals(
      checksum,
      "2a5e1ea1dcfeb27d558a05a789e90937abd943ddde0170e7c153ad73d6ebbd15",
    );
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("createBuildManifest sorts artifacts and stamps metadata", async () => {
  const manifest = createBuildManifest("1.2.3", [
    {
      name: "storyteller-x86_64-apple-darwin",
      checksum: "aaa",
      size: 10,
      path: "dist/storyteller-x86_64-apple-darwin",
    },
    {
      name: "storyteller-x86_64-unknown-linux-gnu",
      checksum: "bbb",
      size: 20,
      path: "dist/storyteller-x86_64-unknown-linux-gnu",
    },
  ]);

  assertEquals(manifest.version, "1.2.3");
  assert(Array.isArray(manifest.artifacts));
  assertEquals(manifest.artifacts.length, 2);
  assertEquals(
    manifest.artifacts[0].name,
    "storyteller-x86_64-apple-darwin",
  );
  assertEquals(
    manifest.artifacts[1].name,
    "storyteller-x86_64-unknown-linux-gnu",
  );
  assert(typeof manifest.generatedAt === "string");
});
