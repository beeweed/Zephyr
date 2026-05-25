"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserFileStore } from "@/store/browser-file-store";
import type {
  AgentToolCall,
  BrowserFileRecord,
  LlmMessage,
  Provider,
  ProviderModel,
  ToolExecutionResult,
  UiMessage,
} from "@/types/agent";

const SETTINGS_KEY = "vibe-coder-settings";
const MAX_ITERATIONS = 1000;

type Settings = {
  apiKey: string;
  model: string;
  provider: Provider;
};

type StreamEvent =
  | { type: "meta"; iteration: number; maxIterations: number }
  | { type: "token"; value: string }
  | { type: "reasoning"; value: string }
  | { type: "tool_calls"; toolCalls: AgentToolCall[] }
  | { type: "done"; finishReason?: string | null }
  | { type: "error"; message: string };

export function useAgent() {
  const [settings, setSettingsState] = useState<Settings>(() => loadSavedSettings());
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [files, setFiles] = useState<BrowserFileRecord[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);

  const llmMessagesRef = useRef<LlmMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const selectedFile = useMemo(
    () => files.find((file) => file.path === selectedPath) ?? files[0] ?? null,
    [files, selectedPath],
  );

  const setSettings = useCallback((next: Settings) => {
    setSettingsState(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  }, []);

  const refreshFiles = useCallback(async () => {
    const nextFiles = await BrowserFileStore.listFiles();
    setFiles(nextFiles);
    setSelectedPath((current) => current ?? nextFiles[0]?.path ?? null);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void refreshFiles());
  }, [refreshFiles]);

  const updateAssistantMessage = useCallback((id: string, patch: Partial<Extract<UiMessage, { role: "assistant" }>>) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === id && message.role === "assistant" ? { ...message, ...patch } : message,
      ),
    );
  }, []);

  const executeToolCalls = useCallback(async (toolCalls: AgentToolCall[]): Promise<LlmMessage[]> => {
    const results: LlmMessage[] = [];
    for (const call of toolCalls) {
      const result = await executeSingleToolCall(call);
      results.push({
        role: "tool",
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify(result),
      });
    }
    return results;
  }, []);

  const runSingleAgentTurn = useCallback(async (iteration: number): Promise<AgentToolCall[] | null> => {
    const assistantId = crypto.randomUUID();
    let assistantContent = "";
    let receivedToolCalls: AgentToolCall[] = [];
    let completed = false;

    setMessages((current) => [
      ...current,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        toolCalls: [],
        iteration,
        status: "streaming",
      },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: settings.apiKey,
        model: settings.model,
        provider: settings.provider,
        messages: llmMessagesRef.current,
        iteration,
      }),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Agent stream failed with HTTP ${response.status}.`);
    }

    for await (const event of readSse(response.body)) {
      if (event.type === "token") {
        setIsThinking(false);
        assistantContent += event.value;
        updateAssistantMessage(assistantId, { content: assistantContent });
      }
      if (event.type === "reasoning") {
        setIsThinking(true);
      }
      if (event.type === "tool_calls") {
        receivedToolCalls = event.toolCalls;
        setIsThinking(false);
        updateAssistantMessage(assistantId, { toolCalls: receivedToolCalls });
      }
      if (event.type === "error") {
        throw new Error(event.message);
      }
      if (event.type === "done") {
        completed = true;
      }
    }

    updateAssistantMessage(assistantId, { status: "complete" });

    if (receivedToolCalls.length > 0) {
      llmMessagesRef.current = [
        ...llmMessagesRef.current,
        {
          role: "assistant",
          content: assistantContent || null,
          tool_calls: receivedToolCalls,
        },
      ];
      return receivedToolCalls;
    }

    if (assistantContent.trim() || completed) {
      llmMessagesRef.current = [...llmMessagesRef.current, { role: "assistant", content: assistantContent }];
    }
    return null;
  }, [settings.apiKey, settings.model, updateAssistantMessage]);

  const fetchModels = useCallback(async (apiKeyOverride?: string) => {
    const apiKey = (apiKeyOverride ?? settings.apiKey).trim();
    if (!apiKey) {
      setModelError("Add an API key first.");
      return;
    }

    setModelLoading(true);
    setModelError(null);
    try {
      const response = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, provider: settings.provider }),
      });
      const payload = (await response.json()) as { models?: ProviderModel[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to fetch models.");
      const nextModels = payload.models ?? [];
      setModels(nextModels);
      if (!settings.model && nextModels[0]) {
        setSettings({ apiKey, model: nextModels[0].id, provider: settings.provider });
      }
    } catch (error) {
      setModelError(error instanceof Error ? error.message : `Failed to fetch models.`);
    } finally {
      setModelLoading(false);
    }
  }, [settings.apiKey, settings.model, settings.provider, setSettings]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
    setIsThinking(false);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const prompt = content.trim();
    if (!prompt || isRunning) return;
    if (!settings.apiKey.trim()) {
      setAgentError("Open Settings and add an API key.");
      return;
    }
    if (!settings.model.trim()) {
      setAgentError("Open Settings and select a model.");
      return;
    }

    setAgentError(null);
    setIsRunning(true);
    setIsThinking(true);

    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, userMessage]);
    llmMessagesRef.current = [...llmMessagesRef.current, { role: "user", content: prompt }];

    try {
      let iteration = 1;
      while (iteration <= MAX_ITERATIONS) {
        const toolCalls = await runSingleAgentTurn(iteration);
        if (!toolCalls || toolCalls.length === 0) break;

        const toolMessages = await executeToolCalls(toolCalls);
        llmMessagesRef.current = [...llmMessagesRef.current, ...toolMessages];
        await refreshFiles();
        iteration += 1;
      }
      if (iteration > MAX_ITERATIONS) {
        throw new Error(`Maximum iteration limit reached (${MAX_ITERATIONS}).`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Agent execution failed.";
      setAgentError(message);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: message,
          createdAt: new Date().toISOString(),
          toolCalls: [],
          status: "error",
          error: message,
        },
      ]);
    } finally {
      setIsRunning(false);
      setIsThinking(false);
      abortRef.current = null;
      await refreshFiles();
    }
  }, [executeToolCalls, isRunning, refreshFiles, runSingleAgentTurn, settings.apiKey, settings.model]);

  const clearConversation = useCallback(() => {
    stop();
    llmMessagesRef.current = [];
    setMessages([]);
    setAgentError(null);
  }, [stop]);

  const clearFiles = useCallback(async () => {
    await BrowserFileStore.clear();
    await refreshFiles();
    setSelectedPath(null);
  }, [refreshFiles]);

  const deleteFile = useCallback(async (path: string) => {
    await BrowserFileStore.deleteFile(path);
    await refreshFiles();
    setSelectedPath((current) => (current === path ? null : current));
  }, [refreshFiles]);

  const updateFile = useCallback(async (path: string, content: string) => {
    await BrowserFileStore.writeFile({ file_path: path, content });
    await refreshFiles();
  }, [refreshFiles]);

  return {
    settings,
    setSettings,
    models,
    fetchModels,
    modelLoading,
    modelError,
    messages,
    sendMessage,
    isRunning,
    isThinking,
    stop,
    clearConversation,
    files,
    selectedFile,
    selectedPath,
    setSelectedPath,
    clearFiles,
    deleteFile,
    updateFile,
    refreshFiles,
    agentError,
  };
}

async function executeSingleToolCall(call: AgentToolCall): Promise<ToolExecutionResult> {
  let args: unknown;
  try {
    args = JSON.parse(call.function.arguments || "{}");
  } catch {
    return {
      ok: false,
      tool: call.function.name,
      error: { code: "EJSONPARSE", message: "Tool arguments were not valid JSON." },
    };
  }

  if (call.function.name === "file_write") {
    const payload = args as { file_path?: unknown; content?: unknown };
    return BrowserFileStore.writeFile({
      file_path: typeof payload.file_path === "string" ? payload.file_path : "",
      content: typeof payload.content === "string" ? payload.content : "",
    });
  }

  const payload = args as { file_path?: unknown };
  return BrowserFileStore.readFile({
    file_path: typeof payload.file_path === "string" ? payload.file_path : "",
  });
}

async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const rawEvent of events) {
      const data = rawEvent
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");
      if (!data) continue;
      yield JSON.parse(data) as StreamEvent;
    }
  }
}

function loadSavedSettings(): Settings {
  if (typeof window === "undefined") return { apiKey: "", model: "", provider: "openrouter" };
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved
      ? { apiKey: "", model: "", provider: "openrouter", ...JSON.parse(saved) }
      : { apiKey: "", model: "", provider: "openrouter" };
  } catch {
    localStorage.removeItem(SETTINGS_KEY);
    return { apiKey: "", model: "", provider: "openrouter" };
  }
}


