/**
 * MCP Resource URI parser
 * storyteller://... 形式のURIを解析する
 */

/**
 * サブリソースの種類
 * - phases: キャラクターのフェーズ一覧
 * - phase: 特定のフェーズ情報
 * - snapshot: 特定フェーズ時点のスナップショット
 */
export type SubResourceType = "phases" | "phase" | "snapshot";

export type ParsedUri = {
  readonly type:
    | "characters"
    | "character"
    | "settings"
    | "setting"
    | "timelines"
    | "timeline"
    | "foreshadowings"
    | "foreshadowing"
    | "chapters"
    | "manuscript"
    | "project";
  readonly id?: string;
  /** サブリソースの種類（例: phases, phase, snapshot） */
  readonly subResource?: SubResourceType;
  /** サブリソースのID（例: フェーズID） */
  readonly subId?: string;
};

const VALID_TYPES: ReadonlySet<string> = new Set([
  "characters",
  "character",
  "settings",
  "setting",
  "timelines",
  "timeline",
  "foreshadowings",
  "foreshadowing",
  "chapters",
  "manuscript",
  "project",
]);

const VALID_SUB_RESOURCES: ReadonlySet<string> = new Set([
  "phases",
  "phase",
  "snapshot",
]);

export function parseResourceUri(uri: string): ParsedUri {
  let url: URL;
  try {
    url = new URL(uri);
  } catch (error) {
    throw new Error(`Invalid resource URI: ${uri}`, { cause: error });
  }

  if (url.protocol !== "storyteller:") {
    throw new Error(`Unsupported resource URI scheme: ${url.protocol}`);
  }

  const typeRaw = url.hostname;
  if (!VALID_TYPES.has(typeRaw)) {
    throw new Error(`Unsupported resource type: ${typeRaw}`);
  }

  const parts = url.pathname.split("/").filter((p) => p.length > 0);
  const id = parts[0] ? decodeURIComponent(parts[0]) : undefined;

  // サブリソースの解析
  // 例: storyteller://character/hero/phases
  //     storyteller://character/hero/phase/awakening
  //     storyteller://character/hero/snapshot/awakening
  const subResourceRaw = parts[1] ? decodeURIComponent(parts[1]) : undefined;
  const subId = parts[2] ? decodeURIComponent(parts[2]) : undefined;

  const result: ParsedUri = {
    type: typeRaw as ParsedUri["type"],
    ...(id ? { id } : {}),
  };

  if (subResourceRaw && VALID_SUB_RESOURCES.has(subResourceRaw)) {
    return {
      ...result,
      subResource: subResourceRaw as SubResourceType,
      ...(subId ? { subId } : {}),
    };
  }

  return result;
}
