export type EntityKind = "character" | "setting" | "foreshadowing";

export function getKindLabel(kind: EntityKind): string {
  switch (kind) {
    case "character":
      return "キャラクター";
    case "setting":
      return "設定";
    case "foreshadowing":
      return "伏線";
  }
}
