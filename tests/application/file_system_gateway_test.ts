import { assert, assertEquals } from "../asserts.ts";
import { DenoFileSystemGateway } from "@storyteller/application/file_system_gateway.ts";

Deno.test("DenoFileSystemGateway writeFile/readFile round-trip", async () => {
  const fs = new DenoFileSystemGateway();
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-fs-" });
  try {
    const path = `${tmp}/nested/file.txt`;
    const write = await fs.writeFile(path, "hello");
    assertEquals(write.ok, true);

    const exists = await fs.exists(path);
    assertEquals(exists.ok, true);
    if (exists.ok) assertEquals(exists.value, true);

    const read = await fs.readFile(path);
    assertEquals(read.ok, true);
    if (read.ok) assertEquals(read.value, "hello");
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("DenoFileSystemGateway exists returns false when missing", async () => {
  const fs = new DenoFileSystemGateway();
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-fs-" });
  try {
    const missing = `${tmp}/missing.txt`;
    const result = await fs.exists(missing);
    assertEquals(result.ok, true);
    if (result.ok) assertEquals(result.value, false);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("DenoFileSystemGateway readFile returns not_found on missing", async () => {
  const fs = new DenoFileSystemGateway();
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-fs-" });
  try {
    const missing = `${tmp}/missing.txt`;
    const result = await fs.readFile(missing);
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.code, "not_found");
      assert(result.error.message.includes("missing.txt"));
    }
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("DenoFileSystemGateway returns permission_denied when cannot write", async () => {
  if (Deno.build.os === "windows") return;

  const fs = new DenoFileSystemGateway();
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-fs-" });
  try {
    const ro = `${tmp}/readonly`;
    await Deno.mkdir(ro, { recursive: true });
    await Deno.chmod(ro, 0o500);

    const result = await fs.writeFile(`${ro}/file.txt`, "blocked");
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.code, "permission_denied");
    }
  } finally {
    try {
      await Deno.chmod(`${tmp}/readonly`, 0o700);
    } catch {
      // ignore
    }
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("DenoFileSystemGateway ensureDir returns permission_denied when cannot create directory", async () => {
  if (Deno.build.os === "windows") return;

  const fs = new DenoFileSystemGateway();
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-fs-" });
  try {
    const ro = `${tmp}/readonly`;
    await Deno.mkdir(ro, { recursive: true });
    await Deno.chmod(ro, 0o500);

    const result = await fs.ensureDir(`${ro}/subdir`);
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.code, "permission_denied");
    }
  } finally {
    try {
      await Deno.chmod(`${tmp}/readonly`, 0o700);
    } catch {
      // ignore
    }
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("DenoFileSystemGateway writeFile returns io_error when path is a directory", async () => {
  const fs = new DenoFileSystemGateway();
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-fs-" });
  try {
    const result = await fs.writeFile(tmp, "not a file");
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.code, "io_error");
    }
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("DenoFileSystemGateway readFile returns io_error when path is a directory", async () => {
  const fs = new DenoFileSystemGateway();
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-fs-" });
  try {
    const result = await fs.readFile(tmp);
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.code, "io_error");
    }
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("DenoFileSystemGateway ensureDir returns io_error when path is a file", async () => {
  const fs = new DenoFileSystemGateway();
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-fs-" });
  try {
    const filePath = `${tmp}/file.txt`;
    await Deno.writeTextFile(filePath, "x");

    const result = await fs.ensureDir(filePath);
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.code, "io_error");
    }
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});
