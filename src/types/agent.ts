export type ChatRole = "system" | "user" | "assistant" | "tool";

export type AgentToolName = "file_write" | "file_read";

export interface ToolFunctionCall {
  name: AgentToolName;
  arguments: string;
}

export interface AgentToolCall {
  id: string;
  type: "function";
  function: ToolFunctionCall;
}

export interface LlmMessage {
  role: ChatRole;
  content?: string | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: AgentToolCall[];
}

export interface AgentStreamRequest {
  apiKey: string;
  model: string;
  messages: LlmMessage[];
  iteration: number;
}

export interface FileWriteArgs {
  file_path: string;
  content: string;
}

export interface FileReadArgs {
  file_path: string;
}

export interface BrowserFileRecord {
  path: string;
  content: string;
  size: number;
  updatedAt: string;
  createdAt: string;
  kind: "file";
}

export interface ToolExecutionResult {
  ok: boolean;
  tool: AgentToolName;
  file_path?: string;
  content?: string;
  bytes?: number;
  line_count?: number;
  error?: {
    code: string;
    message: string;
  };
}

export type UiMessage =
  | {
      id: string;
      role: "user";
      content: string;
      createdAt: string;
    }
  | {
      id: string;
      role: "assistant";
      content: string;
      createdAt: string;
      toolCalls: AgentToolCall[];
      iteration?: number;
      status: "streaming" | "complete" | "error";
      error?: string;
    };

export interface OpenRouterModel {
  id: string;
  name: string;
  context_length?: number;
  pricing?: Record<string, string>;
  architecture?: Record<string, unknown>;
  supported_parameters?: string[];
}
