/**
 * MCP Resource URI parser
 * storyteller://... 形式のURIを解析する
 */

export type ParsedUri = {
  readonly type:
    | "characters"
    | "character"
    | "settings"
    | "setting"
    | "chapters"
    | "manuscript"
    | "project";
  readonly id?: string;
};

const VALID_TYPES: ReadonlySet<string> = new Set([
  "characters",
  "character",
  "settings",
  "setting",
  "chapters",
  "manuscript",
  "project",
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

  return {
    type: typeRaw as ParsedUri["type"],
    ...(id ? { id } : {}),
  };
}
