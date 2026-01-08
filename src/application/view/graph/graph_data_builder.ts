// src/application/view/graph/graph_data_builder.ts
import type { VisGraphData } from "./vis_types.ts";

/**
 * グラフデータビルダーのインターフェース
 *
 * 各エンティティ型（Character, Timeline, Foreshadowing）に対して
 * vis.js用のグラフデータを構築する
 *
 * @template T 入力データの型
 */
export interface GraphDataBuilder<T> {
  /**
   * データからvis.jsグラフデータを構築する
   * @param data 入力データ
   * @returns vis.js互換のグラフデータ
   */
  build(data: T): VisGraphData;
}
