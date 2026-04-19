/**
 * Subplot型定義（v2）
 *
 * 物語のサブプロット・プロットビート・交差を管理するための型定義
 * ハイブリッド詳細管理（インライン + ファイル参照）に対応
 */

/**
 * サブプロットの分類
 *
 * - `main`: メインプロット（物語の中心軸）
 * - `subplot`: サブプロット（メインを補完する副次プロット）
 * - `parallel`: 並行プロット（独立して進行するプロットライン）
 * - `background`: 背景プロット（世界観を構成する背景の動き）
 */
export type SubplotType = "main" | "subplot" | "parallel" | "background";

/**
 * サブプロットのライフサイクルステータス
 *
 * - `active`: 進行中
 * - `completed`: 完了済み
 */
export type SubplotStatus = "active" | "completed";

/**
 * サブプロットの重要度
 *
 * - `major`: 主要なプロット（物語の根幹に関わる）
 * - `minor`: 補助的なプロット
 */
export type SubplotImportance = "major" | "minor";

/**
 * ビートの物語構造上の位置
 *
 * 三幕構成等のナラティブアークにおける位置を表現
 *
 * - `setup`: 設定（導入・世界構築）
 * - `rising`: 上昇（葛藤の深化）
 * - `climax`: クライマックス（最大の転換点）
 * - `falling`: 下降（結末への収束）
 * - `resolution`: 解決（物語の収束）
 */
export type BeatStructurePosition =
  | "setup"
  | "rising"
  | "climax"
  | "falling"
  | "resolution";

/**
 * サブプロットにおけるキャラクターの関与度
 *
 * - `primary`: 主要な関与（そのサブプロットを牽引する）
 * - `secondary`: 補助的な関与（影響を受ける・支援する）
 */
export type SubplotFocusCharacterWeight = "primary" | "secondary";

/**
 * プロットビート
 *
 * サブプロット内の個別の物語ビート（出来事の単位）
 * ビート単位で物語の進行を管理し、交差（Intersection）の接続点となる
 */
export type PlotBeat = {
  // ========================================
  // 必須メタデータ
  // ========================================

  /** 一意なID（プログラム的な識別子） */
  id: string;

  /** ビートのタイトル */
  title: string;

  /** ビートの概要 */
  summary: string;

  /** 物語構造上の位置 */
  structurePosition: BeatStructurePosition;

  // ========================================
  // オプショナル情報
  // ========================================

  /** 関連するチャプターID */
  chapter?: string;

  /** 関連するキャラクターのIDリスト */
  characters?: string[];

  /** 関連する設定（場所など）のIDリスト */
  settings?: string[];

  /** 関連するタイムラインイベントID */
  timelineEventId?: string;

  /** 前提条件となるビートのIDリスト（実行順序の制約） */
  preconditionBeatIds?: string[];
};

/**
 * サブプロット間の影響方向
 *
 * 二つのサブプロットが交差する際、どちらが影響を与える側かを表現
 *
 * - `forward`: source側からtarget側へ影響
 * - `backward`: target側からsource側へ影響
 * - `mutual`: 双方向に影響し合う
 */
export type IntersectionInfluenceDirection = "forward" | "backward" | "mutual";

/**
 * サブプロット間の影響度
 *
 * - `high`: 物語の展開に大きな影響を与える
 * - `medium`: 中程度の影響
 * - `low`: 軽微な影響（雰囲気や背景の共有程度）
 */
export type IntersectionInfluenceLevel = "high" | "medium" | "low";

/**
 * プロット交差（PlotIntersection）
 *
 * 二つのサブプロットが接続・影響し合うポイント
 * ビート単位で交差を定義し、プロット間の因果・共鳴関係を管理する
 */
export type PlotIntersection = {
  // ========================================
  // 必須メタデータ
  // ========================================

  /** 一意なID（プログラム的な識別子） */
  id: string;

  /** 影響元のサブプロットID */
  sourceSubplotId: string;

  /** 影響元のビートID */
  sourceBeatId: string;

  /** 影響先のサブプロットID */
  targetSubplotId: string;

  /** 影響先のビートID */
  targetBeatId: string;

  /** 交差の概要 */
  summary: string;

  /** 影響の方向 */
  influenceDirection: IntersectionInfluenceDirection;

  // ========================================
  // オプショナル情報
  // ========================================

  /** 影響の強さ */
  influenceLevel?: IntersectionInfluenceLevel;
};

/**
 * サブプロットの詳細情報（オプショナル）
 * 各フィールドは短文インラインまたはファイル参照を選択可能
 */
export type SubplotDetails = {
  /** 詳細な説明（summaryを超える詳細） */
  description?: string | { file: string };
  /** テーマ・主題 */
  theme?: string | { file: string };
  /** メモ */
  notes?: string | { file: string };
};

/**
 * サブプロットの関連エンティティ
 */
export type SubplotRelations = {
  /** 関連するキャラクターのIDリスト */
  characters: string[];
  /** 関連する設定（場所など）のIDリスト */
  settings: string[];
  /** 関連する伏線のIDリスト */
  foreshadowings?: string[];
  /** 関連する他のサブプロットのIDリスト */
  relatedSubplots?: string[];
};

/**
 * Subplot型
 *
 * 物語のプロットライン（メインプロット・サブプロット）を管理する型
 * ビート構造による進行管理と、他プロットとの交差関係を追跡する
 */
export type Subplot = {
  // ========================================
  // 必須メタデータ
  // ========================================

  /** 一意なID（プログラム的な識別子） */
  id: string;

  /** サブプロットの名前 */
  name: string;

  /** サブプロットの分類 */
  type: SubplotType;

  /** 現在のステータス */
  status: SubplotStatus;

  /** 短い概要（必須） */
  summary: string;

  /** ビートのリスト（プロットの進行を構成する） */
  beats: PlotBeat[];

  // ========================================
  // オプショナル情報
  // ========================================

  /** フォーカスキャラクターとその関与度（キャラクターID → 関与度） */
  focusCharacters?: Record<string, SubplotFocusCharacterWeight>;

  /** 他サブプロットとの交差ポイント */
  intersections?: PlotIntersection[];

  /** サブプロットの重要度 */
  importance?: SubplotImportance;

  /** 親サブプロットのID（階層構造の場合） */
  parentSubplotId?: string;

  /** 表示名のバリエーション */
  displayNames?: string[];

  /** 詳細情報 */
  details?: SubplotDetails;

  /** 関連エンティティ */
  relations?: SubplotRelations;
};
