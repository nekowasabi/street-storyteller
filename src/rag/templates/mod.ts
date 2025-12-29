/**
 * RAGドキュメントテンプレート
 * 各エンティティタイプ専用のドキュメント生成関数
 */

// キャラクタードキュメント
export { generateCharacterDocument } from "./character.ts";

// 設定ドキュメント
export { generateSettingDocument } from "./setting.ts";

// 伏線ドキュメント
export { generateForeshadowingDocument } from "./foreshadowing.ts";

// タイムラインドキュメント
export {
  generateTimelineDocument,
  generateTimelineEventDocument,
} from "./timeline.ts";

// 原稿ドキュメント（Process 20で追加予定）
// export { generateManuscriptDocument } from "./manuscript.ts";

// 関係性ドキュメント（Process 20で追加予定）
// export { generateRelationshipsDocument } from "./relationships.ts";

// 概要ドキュメント（Process 20で追加予定）
// export { generateIndexDocument } from "./index.ts";
