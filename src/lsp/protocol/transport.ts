/**
 * LSPトランスポート層
 * Content-Lengthベースのメッセージ境界処理を実装
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#baseProtocol
 */

import {
  ContentLengthTransport,
  type TransportReader,
  type TransportWriter,
} from "../../shared/transport/content_length_transport.ts";
import { parseJsonRpc, serializeJsonRpc } from "./json_rpc.ts";

export type { TransportReader, TransportWriter };

/**
 * LSPトランスポートクラス
 * JSON-RPCメッセージをContent-Length形式で読み書きする
 */
export class LspTransport extends ContentLengthTransport {
  constructor(reader: TransportReader, writer: TransportWriter) {
    super(reader, writer, parseJsonRpc, serializeJsonRpc);
  }
}
