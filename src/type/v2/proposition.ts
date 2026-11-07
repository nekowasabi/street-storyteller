/**
 * Proposition型定義（v2）
 *
 * 読者に信じさせたい、または伏せたい事実（命題）。
 * Clarity（わかりやすさ）の検査が原稿をまたいで追跡する単位。
 * 用語は docs/glossary.md、設計は docs/clarity.md を参照。
 */

/**
 * 命題の扱いの方針
 *
 * - `must-correct-if-false`: 作中で偽なら、最終章までに訂正する
 * - `may-remain-misled`: 読者が誤信したまま終えてよい
 * - `may-remain-withheld`: 伏せたまま終えてよい
 */
export type ResolutionPolicy =
  | "must-correct-if-false"
  | "may-remain-misled"
  | "may-remain-withheld";

/**
 * 読者の態度
 *
 * 原稿 frontmatter の `reader_shows` / `reader_requires` で
 * `命題ID:態度` の形で使う。
 */
export type Stance =
  | "shown"
  | "inferring"
  | "convinced"
  | "misled"
  | "corrected"
  | "withheld";

export type Proposition = {
  /** 一意なID。frontmatter から参照される */
  id: string;

  /** 命題の文 */
  statement: string;

  /** 作中での真偽。未定なら null */
  authorTruth: boolean | null;

  /** 扱いの方針 */
  resolutionPolicy: ResolutionPolicy;
};
