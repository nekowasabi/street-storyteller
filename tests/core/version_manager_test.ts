import { assert, assertEquals } from "../asserts.ts";
import {
  checkUpdates,
  compareVersions,
  isCompatible,
  type ProjectMetadata,
} from "../../src/core/version_manager.ts";

Deno.test("VersionManager - compareVersions", async (t) => {
  await t.step("同じバージョンの比較", () => {
    const result = compareVersions("1.0.0", "1.0.0");
    assertEquals(result, "equal");
  });

  await t.step("メジャーバージョンが新しい", () => {
    const result = compareVersions("2.0.0", "1.0.0");
    assertEquals(result, "newer");
  });

  await t.step("メジャーバージョンが古い", () => {
    const result = compareVersions("1.0.0", "2.0.0");
    assertEquals(result, "older");
  });

  await t.step("マイナーバージョンが新しい", () => {
    const result = compareVersions("1.2.0", "1.1.0");
    assertEquals(result, "newer");
  });

  await t.step("マイナーバージョンが古い", () => {
    const result = compareVersions("1.1.0", "1.2.0");
    assertEquals(result, "older");
  });

  await t.step("パッチバージョンが新しい", () => {
    const result = compareVersions("1.0.2", "1.0.1");
    assertEquals(result, "newer");
  });

  await t.step("パッチバージョンが古い", () => {
    const result = compareVersions("1.0.1", "1.0.2");
    assertEquals(result, "older");
  });

  await t.step("複雑なバージョン比較", () => {
    assertEquals(compareVersions("2.1.0", "1.9.9"), "newer");
    assertEquals(compareVersions("1.9.9", "2.0.0"), "older");
    assertEquals(compareVersions("1.10.0", "1.9.0"), "newer");
  });
});

Deno.test("VersionManager - isCompatible", async (t) => {
  await t.step(
    "strictモード - メジャーバージョンが一致しない（互換性なし）",
    () => {
      const metadata: ProjectMetadata = {
        version: {
          version: "1.0.0",
          storytellerVersion: "0.3.0",
          created: new Date("2025-01-01"),
          lastUpdated: new Date("2025-01-01"),
        },
        features: {},
        compatibility: "strict",
      };

      const result = isCompatible(metadata, "2.0.0");
      assert(!result.compatible);
      assert(result.reason?.includes("major version"));
    },
  );

  await t.step("strictモード - メジャーバージョンが一致（互換性あり）", () => {
    const metadata: ProjectMetadata = {
      version: {
        version: "1.5.0",
        storytellerVersion: "0.3.0",
        created: new Date("2025-01-01"),
        lastUpdated: new Date("2025-01-01"),
      },
      features: {},
      compatibility: "strict",
    };

    const result = isCompatible(metadata, "1.9.0");
    assert(result.compatible);
  });

  await t.step("looseモード - マイナー/パッチの違いを許容", () => {
    const metadata: ProjectMetadata = {
      version: {
        version: "1.0.0",
        storytellerVersion: "0.3.0",
        created: new Date("2025-01-01"),
        lastUpdated: new Date("2025-01-01"),
      },
      features: {},
      compatibility: "loose",
    };

    const result = isCompatible(metadata, "1.5.3");
    assert(result.compatible);
  });

  await t.step("looseモード - メジャーバージョンが違う場合は互換性なし", () => {
    const metadata: ProjectMetadata = {
      version: {
        version: "1.0.0",
        storytellerVersion: "0.3.0",
        created: new Date("2025-01-01"),
        lastUpdated: new Date("2025-01-01"),
      },
      features: {},
      compatibility: "loose",
    };

    const result = isCompatible(metadata, "2.0.0");
    assert(!result.compatible);
  });
});

Deno.test("VersionManager - checkUpdates", async (t) => {
  await t.step("更新なし", () => {
    const metadata: ProjectMetadata = {
      version: {
        version: "2.0.0",
        storytellerVersion: "0.3.0",
        created: new Date("2025-01-01"),
        lastUpdated: new Date("2025-01-01"),
      },
      features: {},
      compatibility: "strict",
    };

    const result = checkUpdates(metadata, "2.0.0");
    assert(!result.updateAvailable);
    assertEquals(result.recommendedAction, "none");
  });

  await t.step("マイナーアップデート可能", () => {
    const metadata: ProjectMetadata = {
      version: {
        version: "2.0.0",
        storytellerVersion: "0.3.0",
        created: new Date("2025-01-01"),
        lastUpdated: new Date("2025-01-01"),
      },
      features: {},
      compatibility: "strict",
    };

    const result = checkUpdates(metadata, "2.1.0");
    assert(result.updateAvailable);
    assertEquals(result.recommendedAction, "update");
    assert(result.description?.includes("2.1.0"));
  });

  await t.step("メジャーアップデート（マイグレーション必要）", () => {
    const metadata: ProjectMetadata = {
      version: {
        version: "1.0.0",
        storytellerVersion: "0.3.0",
        created: new Date("2025-01-01"),
        lastUpdated: new Date("2025-01-01"),
      },
      features: {},
      compatibility: "strict",
    };

    const result = checkUpdates(metadata, "2.0.0");
    assert(result.updateAvailable);
    assertEquals(result.recommendedAction, "migrate");
    assert(result.breaking);
    assert(result.description?.toLowerCase().includes("major"));
  });

  await t.step("パッチアップデート（バグ修正）", () => {
    const metadata: ProjectMetadata = {
      version: {
        version: "2.0.0",
        storytellerVersion: "0.3.0",
        created: new Date("2025-01-01"),
        lastUpdated: new Date("2025-01-01"),
      },
      features: {},
      compatibility: "strict",
    };

    const result = checkUpdates(metadata, "2.0.1");
    assert(result.updateAvailable);
    assertEquals(result.recommendedAction, "update");
  });
});
