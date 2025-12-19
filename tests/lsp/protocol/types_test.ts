import { assert, assertFalse } from "../../asserts.ts";
import {
  isJsonRpcNotification,
  isJsonRpcRequest,
  isJsonRpcResponse,
  type JsonRpcMessage,
  type JsonRpcNotification,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from "@storyteller/lsp/protocol/types.ts";

Deno.test("isJsonRpcRequest returns true for request with id", () => {
  const request: JsonRpcRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
  };
  assert(isJsonRpcRequest(request));
});

Deno.test("isJsonRpcRequest returns true for request with string id", () => {
  const request: JsonRpcRequest = {
    jsonrpc: "2.0",
    id: "abc123",
    method: "initialize",
  };
  assert(isJsonRpcRequest(request));
});

Deno.test("isJsonRpcRequest returns false for notification", () => {
  const notification: JsonRpcNotification = {
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
  };
  assertFalse(isJsonRpcRequest(notification as JsonRpcMessage));
});

Deno.test("isJsonRpcRequest returns false for response", () => {
  const response: JsonRpcResponse = {
    jsonrpc: "2.0",
    id: 1,
    result: {},
  };
  assertFalse(isJsonRpcRequest(response as JsonRpcMessage));
});

Deno.test("isJsonRpcNotification returns true for notification without id", () => {
  const notification: JsonRpcNotification = {
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
  };
  assert(isJsonRpcNotification(notification));
});

Deno.test("isJsonRpcNotification returns true for notification with undefined id", () => {
  const notification: JsonRpcNotification = {
    jsonrpc: "2.0",
    id: undefined,
    method: "textDocument/didOpen",
  };
  assert(isJsonRpcNotification(notification));
});

Deno.test("isJsonRpcNotification returns false for request", () => {
  const request: JsonRpcRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
  };
  assertFalse(isJsonRpcNotification(request as JsonRpcMessage));
});

Deno.test("isJsonRpcNotification returns false for response", () => {
  const response: JsonRpcResponse = {
    jsonrpc: "2.0",
    id: 1,
    result: {},
  };
  assertFalse(isJsonRpcNotification(response as JsonRpcMessage));
});

Deno.test("isJsonRpcResponse returns true for response with result", () => {
  const response: JsonRpcResponse = {
    jsonrpc: "2.0",
    id: 1,
    result: { capabilities: {} },
  };
  assert(isJsonRpcResponse(response));
});

Deno.test("isJsonRpcResponse returns true for response with error", () => {
  const response: JsonRpcResponse = {
    jsonrpc: "2.0",
    id: 1,
    error: { code: -32700, message: "Parse error" },
  };
  assert(isJsonRpcResponse(response));
});

Deno.test("isJsonRpcResponse returns true for response with null id", () => {
  const response: JsonRpcResponse = {
    jsonrpc: "2.0",
    id: null,
    error: { code: -32700, message: "Parse error" },
  };
  assert(isJsonRpcResponse(response));
});

Deno.test("isJsonRpcResponse returns false for request", () => {
  const request: JsonRpcRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
  };
  assertFalse(isJsonRpcResponse(request as JsonRpcMessage));
});

Deno.test("isJsonRpcResponse returns false for notification", () => {
  const notification: JsonRpcNotification = {
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
  };
  assertFalse(isJsonRpcResponse(notification as JsonRpcMessage));
});
