/**
 * MCPトランスポート層
 * Content-Lengthベースのメッセージ境界処理を実装
 * LSPトランスポートと同じJSON-RPC over stdioプロトコルを使用
 */

import {
  ContentLengthTransport,
  type TransportReader,
  type TransportWriter,
} from "@storyteller/shared/transport/content_length_transport.ts";
import {
  parseJsonRpc,
  serializeJsonRpc,
} from "@storyteller/lsp/protocol/json_rpc.ts";

export type { TransportReader, TransportWriter };

/**
 * MCPトランスポートクラス
 * JSON-RPCメッセージをContent-Length形式で読み書きする
 */
export class McpTransport extends ContentLengthTransport {
  constructor(reader: TransportReader, writer: TransportWriter) {
    super(reader, writer, parseJsonRpc, serializeJsonRpc);
  }
}
