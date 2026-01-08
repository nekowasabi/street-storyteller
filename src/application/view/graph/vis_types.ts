// src/application/view/graph/vis_types.ts

/**
 * vis.js CDNリンク
 * スタンドアロンHTMLでグラフを表示するために使用
 */
export const VIS_CDN_LINKS = {
  network: "https://unpkg.com/vis-network@9.1.9/dist/vis-network.min.js",
  css: "https://unpkg.com/vis-network@9.1.9/dist/vis-network.min.css",
} as const;

/**
 * vis.jsノード型
 * グラフ上の各頂点を表現する
 */
export type VisNode = {
  /** ノードの一意識別子 */
  readonly id: string;
  /** 表示ラベル */
  readonly label: string;
  /** グループ（色分け等に使用） */
  readonly group?: string;
  /** ホバー時のツールチップ */
  readonly title?: string;
  /** ノードの色設定 */
  readonly color?: {
    readonly background?: string;
    readonly border?: string;
  };
  /** ノードの形状 */
  readonly shape?:
    | "dot"
    | "box"
    | "ellipse"
    | "circle"
    | "diamond"
    | "star"
    | "triangle";
};

/**
 * vis.jsエッジ型
 * グラフ上の辺（ノード間の接続）を表現する
 */
export type VisEdge = {
  /** 接続元ノードID */
  readonly from: string;
  /** 接続先ノードID */
  readonly to: string;
  /** エッジラベル */
  readonly label?: string;
  /** 矢印の方向 */
  readonly arrows?: "to" | "from" | "to, from";
  /** 破線表示 */
  readonly dashes?: boolean;
  /** エッジの色設定 */
  readonly color?: {
    readonly color?: string;
    readonly highlight?: string;
  };
  /** 線の太さ */
  readonly width?: number;
};

/**
 * vis.jsグラフオプション型
 * グラフの表示・動作設定
 */
export type VisOptions = {
  /** ノードのデフォルト設定 */
  readonly nodes?: {
    readonly shape?: string;
    readonly font?: { readonly size?: number };
  };
  /** エッジのデフォルト設定 */
  readonly edges?: {
    readonly smooth?: boolean | { readonly type?: string };
  };
  /** 物理エンジン設定 */
  readonly physics?: {
    readonly enabled?: boolean;
    readonly stabilization?: { readonly iterations?: number };
  };
  /** インタラクション設定 */
  readonly interaction?: {
    readonly hover?: boolean;
    readonly tooltipDelay?: number;
  };
};

/**
 * グラフデータ
 * vis.Networkに渡すデータ構造
 */
export type VisGraphData = {
  /** ノード配列 */
  readonly nodes: readonly VisNode[];
  /** エッジ配列 */
  readonly edges: readonly VisEdge[];
  /** グラフオプション */
  readonly options?: VisOptions;
};
