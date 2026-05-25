import type { AgentToolCall, LlmMessage, ProviderModel } from "@/types/agent";
import { SYSTEM_PROMPT } from "@/lib/systemprompt";

export const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models";

export const FILE_TOOLS = [
  {
    type: "function",
    function: {
      name: "file_write",
      description:
        "Create or overwrite a file at the given path inside the sandbox. Use for creating new files or fully rewriting existing ones.",
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "Absolute path starting with /home/user/. Example: /home/user/project/src/App.tsx",
          },
          content: {
            type: "string",
            description: "The full content to write to the file.",
          },
        },
        required: ["file_path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "file_read",
      description: "Read the content of an existing file from the sandbox. Returns content with line numbers.",
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "Absolute path starting with /home/user/. Example: /home/user/project/src/main.py",
          },
        },
        required: ["file_path"],
      },
    },
  },
] as const;

interface GroqStreamOptions {
  apiKey: string;
  model: string;
  messages: LlmMessage[];
}

export interface GroqStreamChunk {
  content?: string;
  toolCalls?: AgentToolCall[];
  done?: boolean;
  finishReason?: string | null;
}

interface GroqApiModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

type PartialToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export async function fetchGroqModels(apiKey: string): Promise<ProviderModel[]> {
  const response = await fetch(GROQ_MODELS_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await safeReadResponse(response);
    throw new Error(`Groq models request failed (${response.status}): ${message}`);
  }

  const payload = (await response.json()) as { object?: string; data?: GroqApiModel[] };
  if (!Array.isArray(payload.data)) return [];

  return payload.data
    .filter((m) => !m.id.includes("whisper"))
    .map((m) => ({
      id: m.id,
      name: m.id,
      provider: "groq" as const,
    }));
}

export async function* streamGroqChatCompletion(
  options: GroqStreamOptions,
): AsyncGenerator<GroqStreamChunk> {
  const body = buildGroqRequestBody(options.model, options.messages);
  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok || !response.body) {
    const message = await safeReadResponse(response);
    throw new Error(`Groq chat request failed (${response.status}): ${message}`);
  }

  const toolCalls = new Map<number, PartialToolCall>();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finishReason: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || !line.startsWith("data:")) continue;

      const data = line.slice(5).trim();
      if (data === "[DONE]") {
        const completedToolCalls = materializeToolCalls(toolCalls);
        if (completedToolCalls.length > 0) {
          yield { toolCalls: completedToolCalls, finishReason: finishReason ?? "tool_calls" };
        }
        yield { done: true, finishReason };
        return;
      }

      let chunk: unknown;
      try {
        chunk = JSON.parse(data);
      } catch {
        continue;
      }

      const choice = getFirstChoice(chunk);
      const delta = choice?.delta as Record<string, unknown> | undefined;
      finishReason = (choice?.finish_reason as string | null | undefined) ?? finishReason;
      if (!delta) continue;

      const content = typeof delta.content === "string" ? delta.content : "";
      if (content) yield { content, finishReason };

      const deltaToolCalls = delta.tool_calls;
      if (Array.isArray(deltaToolCalls)) {
        for (const item of deltaToolCalls) {
          const record = item as Record<string, unknown>;
          const index = typeof record.index === "number" ? record.index : toolCalls.size;
          const existing = toolCalls.get(index) ?? {
            id: "",
            type: "function" as const,
            function: { name: "", arguments: "" },
          };
          if (typeof record.id === "string") existing.id = record.id;
          if (record.type === "function") existing.type = "function";
          const fn = record.function as Record<string, unknown> | undefined;
          if (fn) {
            if (typeof fn.name === "string") existing.function.name += fn.name;
            if (typeof fn.arguments === "string") existing.function.arguments += fn.arguments;
          }
          toolCalls.set(index, existing);
        }
      }
    }
  }

  const completedToolCalls = materializeToolCalls(toolCalls);
  if (completedToolCalls.length > 0) {
    yield { toolCalls: completedToolCalls, finishReason: finishReason ?? "tool_calls" };
  }
  yield { done: true, finishReason };
}

function materializeToolCalls(toolCalls: Map<number, PartialToolCall>): AgentToolCall[] {
  return Array.from(toolCalls.values())
    .filter((call) => call.id && call.function.name)
    .map((call) => ({
      id: call.id,
      type: "function" as const,
      function: {
        name: call.function.name as AgentToolCall["function"]["name"],
        arguments: call.function.arguments || "{}",
      },
    }));
}

function buildGroqRequestBody(model: string, messages: LlmMessage[]) {
  return {
    model,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    tools: FILE_TOOLS,
    tool_choice: "auto",
    stream: true,
    temperature: 0.2,
    top_p: 0.95,
  };
}

function getFirstChoice(chunk: unknown): { delta?: unknown; finish_reason?: unknown } | undefined {
  if (!chunk || typeof chunk !== "object") return undefined;
  const choices = (chunk as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return undefined;
  return choices[0] as { delta?: unknown; finish_reason?: unknown };
}

async function safeReadResponse(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 2000) || response.statusText;
  } catch {
    return response.statusText;
  }
}
