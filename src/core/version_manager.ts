/**
 * バージョン管理システム
 * セマンティックバージョニング対応のバージョン比較と互換性チェック
 */

/**
 * プロジェクトのバージョン情報
 */
export interface ProjectVersion {
  /** プロジェクトのバージョン */
  readonly version: string;
  /** storytellerツールのバージョン */
  readonly storytellerVersion: string;
  /** プロジェクト作成日時 */
  readonly created: Date;
  /** 最終更新日時 */
  readonly lastUpdated: Date;
}

/**
 * 機能フラグ
 */
export interface FeatureFlags {
  readonly [key: string]: boolean;
}

/**
 * 互換性モード
 */
export type CompatibilityMode = "strict" | "loose";

/**
 * プロジェクトメタデータ
 */
export interface ProjectMetadata {
  readonly version: ProjectVersion;
  readonly features: FeatureFlags;
  readonly compatibility: CompatibilityMode;
}

/**
 * バージョン比較結果
 */
export type VersionComparisonResult = "newer" | "equal" | "older";

/**
 * 互換性チェック結果
 */
export interface CompatibilityCheckResult {
  readonly compatible: boolean;
  readonly reason?: string;
}

/**
 * 更新チェック結果
 */
export interface UpdateCheckResult {
  readonly updateAvailable: boolean;
  readonly recommendedAction: "none" | "update" | "migrate";
  readonly breaking?: boolean;
  readonly description?: string;
}

/**
 * バージョン文字列を解析
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const parts = version.split(".").map((part) => parseInt(part, 10));
  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
  };
}

/**
 * セマンティックバージョニングに基づくバージョン比較
 * @param version1 比較対象のバージョン1
 * @param version2 比較対象のバージョン2
 * @returns version1がversion2より新しければ"newer"、同じなら"equal"、古ければ"older"
 */
export function compareVersions(
  version1: string,
  version2: string,
): VersionComparisonResult {
  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);

  if (v1.major !== v2.major) {
    return v1.major > v2.major ? "newer" : "older";
  }

  if (v1.minor !== v2.minor) {
    return v1.minor > v2.minor ? "newer" : "older";
  }

  if (v1.patch !== v2.patch) {
    return v1.patch > v2.patch ? "newer" : "older";
  }

  return "equal";
}

/**
 * バージョン互換性をチェック
 * @param metadata プロジェクトメタデータ
 * @param currentVersion 現在のstorytellerバージョン
 * @returns 互換性チェック結果
 */
export function isCompatible(
  metadata: ProjectMetadata,
  currentVersion: string,
): CompatibilityCheckResult {
  const projectVersion = metadata.version.version;
  const pv = parseVersion(projectVersion);
  const cv = parseVersion(currentVersion);

  if (metadata.compatibility === "strict") {
    // strictモード: メジャーバージョンが一致する必要がある
    if (pv.major !== cv.major) {
      return {
        compatible: false,
        reason: `Project major version ${pv.major} does not match current major version ${cv.major}`,
      };
    }
    return { compatible: true };
  } else {
    // looseモード: メジャーバージョンが一致すれば互換性あり
    if (pv.major !== cv.major) {
      return {
        compatible: false,
        reason: `Project major version ${pv.major} does not match current major version ${cv.major}`,
      };
    }
    return { compatible: true };
  }
}

/**
 * 更新チェック
 * @param metadata プロジェクトメタデータ
 * @param currentVersion 現在のstorytellerバージョン
 * @returns 更新チェック結果
 */
export function checkUpdates(
  metadata: ProjectMetadata,
  currentVersion: string,
): UpdateCheckResult {
  const projectVersion = metadata.version.version;
  const comparison = compareVersions(currentVersion, projectVersion);

  if (comparison === "equal") {
    return {
      updateAvailable: false,
      recommendedAction: "none",
    };
  }

  if (comparison === "older") {
    return {
      updateAvailable: false,
      recommendedAction: "none",
      description: "Project version is newer than current storyteller version",
    };
  }

  // comparison === "newer"
  const pv = parseVersion(projectVersion);
  const cv = parseVersion(currentVersion);

  if (cv.major > pv.major) {
    // メジャーバージョンアップ：マイグレーション必要
    return {
      updateAvailable: true,
      recommendedAction: "migrate",
      breaking: true,
      description: `Major version update available (${projectVersion} → ${currentVersion}). Migration required.`,
    };
  }

  // マイナーまたはパッチバージョンアップ：通常の更新
  return {
    updateAvailable: true,
    recommendedAction: "update",
    breaking: false,
    description: `Update available (${projectVersion} → ${currentVersion})`,
  };
}
