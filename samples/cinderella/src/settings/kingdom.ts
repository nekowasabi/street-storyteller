import type { Setting } from "@storyteller/types/v2/setting.ts";

/**
 * フェアリーテイル王国
 * 古き良き伝統と魔法が共存する王国。王子と姫の物語が生まれる舞台。
 */
export const kingdom: Setting = {
  "id": "kingdom",
  "name": "フェアリーテイル王国",
  "type": "location",
  "summary": "古き良き伝統と魔法が共存する王国。王子と姫の物語が生まれる舞台。",
  "appearingChapters": [],
  "displayNames": [
    "王国",
    "フェアリーテイル",
    "王都"
  ],
  "relatedSettings": [
    "castle",
    "mansion"
  ]
};
