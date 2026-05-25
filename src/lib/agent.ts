import { MAX_AGENT_ITERATIONS } from "@/lib/systemprompt";
import { streamOpenRouterChatCompletion } from "@/lib/provider/openrouter";
import { streamGroqChatCompletion } from "@/lib/provider/groq";
import type { AgentStreamRequest, AgentToolCall, LlmMessage, Provider } from "@/types/agent";

export type ServerStreamEvent =
  | { type: "meta"; iteration: number; maxIterations: number }
  | { type: "token"; value: string }
  | { type: "reasoning"; value: string }
  | { type: "tool_calls"; toolCalls: AgentToolCall[] }
  | { type: "done"; finishReason?: string | null }
  | { type: "error"; message: string };

export function validateAgentStreamRequest(input: unknown): AgentStreamRequest {
  if (!input || typeof input !== "object") {
    throw new Error("Request body must be an object.");
  }

  const body = input as Partial<AgentStreamRequest>;
  if (typeof body.apiKey !== "string" || body.apiKey.trim().length < 8) {
    throw new Error("A valid API key is required.");
  }
  if (typeof body.model !== "string" || body.model.trim().length === 0) {
    throw new Error("A model id is required.");
  }
  if (!Array.isArray(body.messages)) {
    throw new Error("Messages must be an array.");
  }
  if (typeof body.iteration !== "number" || !Number.isInteger(body.iteration) || body.iteration < 1) {
    throw new Error("Iteration must be a positive integer.");
  }
  if (body.iteration > MAX_AGENT_ITERATIONS) {
    throw new Error(`Maximum iteration limit reached (${MAX_AGENT_ITERATIONS}).`);
  }

  const provider: Provider = body.provider ?? "openrouter";

  return {
    apiKey: body.apiKey.trim(),
    model: body.model.trim(),
    provider,
    messages: sanitizeMessages(body.messages),
    iteration: body.iteration,
  };
}

export async function streamAgentTurn(
  request: AgentStreamRequest,
  emit: (event: ServerStreamEvent) => Promise<void>,
  appOrigin?: string,
): Promise<void> {
  await emit({ type: "meta", iteration: request.iteration, maxIterations: MAX_AGENT_ITERATIONS });

  let emittedToolCalls = false;
  const provider = request.provider ?? "openrouter";

  const stream =
    provider === "groq"
      ? streamGroqChatCompletion({
          apiKey: request.apiKey,
          model: request.model,
          messages: request.messages,
        })
      : streamOpenRouterChatCompletion({
          apiKey: request.apiKey,
          model: request.model,
          messages: request.messages,
          appOrigin,
        });

  for await (const chunk of stream) {
    if (chunk.content) {
      await emit({ type: "token", value: chunk.content });
    }
    const reasoning = "reasoning" in chunk ? (chunk as { reasoning?: string }).reasoning : undefined;
    if (reasoning) {
      await emit({ type: "reasoning", value: reasoning });
    }
    if (chunk.toolCalls && chunk.toolCalls.length > 0) {
      emittedToolCalls = true;
      await emit({ type: "tool_calls", toolCalls: chunk.toolCalls });
    }
    if (chunk.done) {
      await emit({ type: "done", finishReason: chunk.finishReason ?? (emittedToolCalls ? "tool_calls" : null) });
    }
  }
}

function sanitizeMessages(messages: LlmMessage[]): LlmMessage[] {
  return messages.map((message) => {
    if (!message || typeof message !== "object") {
      throw new Error("Every message must be an object.");
    }

    const role = message.role;
    if (!["user", "assistant", "tool"].includes(role)) {
      throw new Error(`Unsupported message role: ${String(role)}`);
    }

    if (role === "tool") {
      if (typeof message.tool_call_id !== "string" || !message.tool_call_id) {
        throw new Error("Tool messages require tool_call_id.");
      }
      return {
        role: "tool",
        tool_call_id: message.tool_call_id,
        name: typeof message.name === "string" ? message.name : undefined,
        content: typeof message.content === "string" ? message.content : "",
      } satisfies LlmMessage;
    }

    const sanitized: LlmMessage = {
      role,
      content: typeof message.content === "string" ? message.content : message.content === null ? null : "",
    };

    if (role === "assistant" && Array.isArray(message.tool_calls)) {
      sanitized.tool_calls = message.tool_calls.map((call) => ({
        id: String(call.id),
        type: "function",
        function: {
          name: call.function.name,
          arguments: typeof call.function.arguments === "string" ? call.function.arguments : JSON.stringify(call.function.arguments ?? {}),
        },
      }));
    }

    return sanitized;
  });
}

export function encodeSseEvent(event: ServerStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
