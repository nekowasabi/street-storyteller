/**
 * Storyteller パス検出ユーティリティ
 * storyteller実行ファイルのパスを自動検出する共通モジュール
 */
import {
  dirname,
  fromFileUrl,
  join,
} from "https://deno.land/std@0.224.0/path/mod.ts";

/**
 * storytellerの実行パスを検出
 *
 * 優先順位:
 * 1. 環境変数 STORYTELLER_PATH
 * 2. Deno.mainModule からの自動検出（storytellerスクリプトがあればそのパス）
 * 3. deno run -A main.ts 形式
 * 4. デフォルト: "storyteller"（PATHにあると仮定）
 */
export async function detectStorytellerPath(): Promise<string> {
  // 1. 環境変数からstorytellerのパスを取得
  const envPath = Deno.env.get("STORYTELLER_PATH");
  if (envPath) {
    return envPath;
  }

  // 2. main.tsの場所を基準に検出
  try {
    const mainModuleUrl = Deno.mainModule;
    if (mainModuleUrl.startsWith("file://")) {
      const mainPath = fromFileUrl(mainModuleUrl);
      const mainDir = dirname(mainPath);

      // storytellerスクリプトがあるか確認
      const storytellerScript = join(mainDir, "storyteller");
      try {
        await Deno.stat(storytellerScript);
        return storytellerScript;
      } catch {
        // storytellerスクリプトが見つからない場合はdenoコマンドを使用
        return `deno run -A ${mainPath}`;
      }
    }
  } catch {
    // 検出失敗
  }

  // 3. デフォルト: storytellerコマンドがPATHにあると仮定
  return "storyteller";
}
