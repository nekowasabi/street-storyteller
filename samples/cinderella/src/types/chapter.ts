export const chapterMetaSchema = {};

export type ChapterMeta = {
  id: string;
  title: string;
  order: number;
  characters?: unknown[];
  settings?: unknown[];
  foreshadowings?: unknown[];
  timelineEvents?: unknown[];
  validations?: unknown[];
  references?: unknown;
};
