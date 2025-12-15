/**
 * ElementService
 *
 * 要素（Character, Setting等）の作成と詳細追加を統合的に管理するサービス
 */

import { err } from "../shared/result.ts";
import type { Result } from "../shared/result.ts";
import type {
  CreateElementOptions,
  ElementCreationResult,
  ElementPlugin,
  PluginRegistry,
  StorytellerPlugin,
} from "../core/plugin_system.ts";
import type { Character } from "../type/v2/character.ts";
import {
  DetailsPlugin,
  type SeparateFilesResult,
} from "../plugins/features/details/plugin.ts";
import type { DetailField } from "../plugins/features/details/templates.ts";

export class ElementService {
  constructor(private readonly pluginRegistry: PluginRegistry) {}

  /**
   * 要素を作成する
   *
   * @param elementType 要素タイプ（例: "character"）
   * @param options 要素作成オプション
   * @returns 作成結果（成功/失敗）
   */
  async createElement(
    elementType: string,
    options: CreateElementOptions,
  ): Promise<Result<ElementCreationResult, Error>> {
    const plugin = this.getElementPlugin(elementType);
    if (!plugin) {
      return err(
        new Error(`Element plugin for type "${elementType}" not found`),
      );
    }

    return await plugin.createElementFile(options);
  }

  /**
   * 要素に詳細情報を追加する
   *
   * @param elementType 要素タイプ（現在は"character"のみ対応）
   * @param element 対象の要素
   * @param fields 追加する詳細フィールドのリスト
   * @param force 既存の詳細を強制上書きする（デフォルト: false）
   * @returns 詳細情報が追加された要素
   */
  async addDetailsToElement(
    elementType: string,
    element: Character,
    fields: DetailField[],
    force = false,
  ): Promise<Result<Character, Error>> {
    // DetailsPluginを取得
    const detailsPlugin = this.getDetailsPlugin();
    if (!detailsPlugin) {
      return err(new Error("DetailsPlugin not found in registry"));
    }

    // elementTypeに応じて処理を分岐（現在はcharacterのみ）
    if (elementType === "character") {
      return await detailsPlugin.addDetails(element, fields, force);
    }

    return err(new Error(`Unsupported element type: ${elementType}`));
  }

  /**
   * 要素の詳細情報をファイルに分離する
   *
   * @param elementType 要素タイプ（現在は"character"のみ対応）
   * @param element 対象の要素
   * @param fields 分離するフィールド（"all"で全フィールド）
   * @param projectRoot プロジェクトルートパス
   * @returns ファイル分離結果
   */
  async separateFilesForElement(
    elementType: string,
    element: Character,
    fields: DetailField[] | "all",
    projectRoot: string,
  ): Promise<Result<SeparateFilesResult, Error>> {
    const detailsPlugin = this.getDetailsPlugin();
    if (!detailsPlugin) {
      return err(new Error("DetailsPlugin not found in registry"));
    }

    if (elementType === "character") {
      return await detailsPlugin.separateFiles(element, fields, projectRoot);
    }

    return err(new Error(`Unsupported element type: ${elementType}`));
  }

  /**
   * 利用可能な要素タイプの一覧を取得
   *
   * @returns 要素タイプのリスト
   */
  getAvailableElementTypes(): string[] {
    const types: string[] = [];

    // プラグインレジストリから全プラグインを取得
    // NOTE: PluginRegistryに getAllPlugins() のようなメソッドがあると仮定
    // 実装がない場合は、一時的に登録済みプラグインを列挙する別の方法を使う

    // 暫定実装: 既知のElementPluginを直接列挙
    const characterPlugin = this.getElementPlugin("character");
    if (characterPlugin) {
      types.push("character");
    }

    return types;
  }

  /**
   * 特定の要素タイプのプラグインを取得
   *
   * @param elementType 要素タイプ
   * @returns ElementPlugin（見つからない場合はundefined）
   */
  getElementPlugin(elementType: string): ElementPlugin | undefined {
    const pluginId = `storyteller.element.${elementType}`;
    const plugin = this.pluginRegistry.resolve(pluginId);

    if (plugin && this.isElementPlugin(plugin)) {
      return plugin;
    }

    return undefined;
  }

  /**
   * DetailsPluginを取得
   *
   * @returns DetailsPlugin（見つからない場合はundefined）
   */
  private getDetailsPlugin(): DetailsPlugin | undefined {
    const plugin = this.pluginRegistry.resolve("storyteller.feature.details");

    if (plugin && plugin instanceof DetailsPlugin) {
      return plugin;
    }

    return undefined;
  }

  /**
   * プラグインがElementPluginかどうかを判定
   *
   * @param plugin 判定対象のプラグイン
   * @returns ElementPluginの場合true
   */
  private isElementPlugin(plugin: StorytellerPlugin): plugin is ElementPlugin {
    return "elementType" in plugin &&
      typeof (plugin as any).createElementFile === "function";
  }
}
