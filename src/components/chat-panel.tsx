"use client";

import * as ScrollArea from "@radix-ui/react-scroll-area";
import { Bot, Pause, RotateCcw, Send, Sparkles, User } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { AgentToolCall, UiMessage } from "@/types/agent";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  messages: UiMessage[];
  isRunning: boolean;
  isThinking: boolean;
  agentError: string | null;
  model: string;
  provider?: string;
  onSend: (message: string) => void;
  onStop: () => void;
  onClear: () => void;
  settingsSlot: React.ReactNode;
}

export function ChatPanel({
  messages,
  isRunning,
  isThinking,
  agentError,
  model,
  provider,
  onSend,
  onStop,
  onClear,
  settingsSlot,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const currentIteration = useMemo(() => {
    const assistantMessages = messages.filter((m): m is Extract<UiMessage, { role: "assistant" }> => m.role === "assistant");
    const withIteration = assistantMessages.filter((m) => "iteration" in m && m.iteration);
    return withIteration.length > 0 ? withIteration[withIteration.length - 1].iteration : null;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draft.trim();
    if (!value || isRunning) return;
    setDraft("");
    onSend(value);
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-none border-white/10 bg-[#1b1b1c] sm:m-2 sm:rounded-2xl sm:border md:m-3 md:rounded-[28px]">
      <header className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#222224]/90 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3 md:px-5 md:py-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/20 sm:h-10 sm:w-10 sm:rounded-2xl">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-white">Vibe Coder</h1>
            <div className="hidden items-center gap-1.5 sm:flex">
              <p suppressHydrationWarning className="truncate text-xs text-zinc-400">ReAct browser file agent · {provider ?? "openrouter"}{model ? ` · ${model}` : " · configure model"}</p>
              {currentIteration ? (
                <span className="shrink-0 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-200">
                  Iteration {currentIteration}/1000
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition hover:bg-white/[0.07] hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:h-10 sm:w-10"
            aria-label="Clear conversation"
          >
            <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          {settingsSlot}
        </div>
      </header>

      <ScrollArea.Root className="min-h-0 flex-1">
        <ScrollArea.Viewport className="h-full w-full">
          <div className="space-y-4 px-3 py-4 sm:space-y-5 sm:px-4 sm:py-5 md:px-5">
            {messages.length === 0 ? <EmptyState /> : null}
            {messages.map((message) => (
              <MessageRow key={message.id} message={message} />
            ))}
            {isThinking ? <ThinkingIndicator /> : null}
            {agentError ? <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{agentError}</p> : null}
            <div ref={bottomRef} />
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="flex w-1.5 touch-none select-none p-0.5 sm:w-2.5">
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/10" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      <form onSubmit={handleSubmit} className="border-t border-white/10 bg-[#202022] p-3 sm:p-4 md:p-5">
        <div className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-black/40 to-black/20 p-2 shadow-inner shadow-black/20 transition-all focus-within:border-indigo-400/60 focus-within:shadow-indigo-500/10 sm:gap-3 sm:rounded-[28px] sm:p-2.5 md:p-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            placeholder="Ask the agent to create, read, or overwrite files..."
            className="min-h-14 max-h-36 flex-1 resize-none bg-transparent px-3 py-3.5 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-600 sm:min-h-16 sm:max-h-44 sm:px-4 sm:py-4 sm:text-base sm:leading-7"
          />
          {isRunning ? (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-700 text-white shadow-lg shadow-black/20 transition hover:bg-zinc-600 hover:shadow-xl active:scale-95 sm:h-12 sm:w-12"
              aria-label="Stop agent"
            >
              <Pause className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-400 hover:to-indigo-500 hover:shadow-indigo-500/40 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:h-12 sm:w-12"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function MessageRow({ message }: { message: UiMessage }) {
  if (message.role === "user") {
    return (
      <article className="flex justify-end gap-2 sm:gap-3">
        <div className="max-w-[90%] rounded-2xl rounded-tr-md bg-indigo-500 px-3.5 py-2.5 text-sm leading-6 text-white shadow-lg shadow-indigo-500/10 sm:max-w-[86%] sm:px-4 sm:py-3">
          {message.content}
        </div>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 sm:h-8 sm:w-8">
          <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </span>
      </article>
    );
  }

  return (
    <article className="flex gap-2 sm:gap-3">
      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 text-indigo-300 sm:h-8 sm:w-8">
        <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5 sm:mb-2 sm:gap-2">
          <span className="text-[11px] font-medium text-zinc-500 sm:text-xs">Agent</span>
          {message.status === "streaming" ? <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.7)]" /> : null}
        </div>
        {message.content ? (
          <div className={cn("agent-response text-sm leading-6 text-zinc-200", message.status === "error" && "text-red-200")}>
            {message.content}
          </div>
        ) : null}
        {message.toolCalls.length > 0 ? <ToolCallChips toolCalls={message.toolCalls} /> : null}
      </div>
    </article>
  );
}

function ToolCallChips({ toolCalls }: { toolCalls: AgentToolCall[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
      {toolCalls.map((call) => {
        const args = safeParseArgs(call.function.arguments);
        const path = typeof args.file_path === "string" ? args.file_path : "unknown path";
        const verb = call.function.name === "file_write" ? "create" : "read";
        return (
          <span
            key={call.id}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-300 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
            <span className="font-medium text-zinc-100">{verb}:</span>
            <span className="truncate font-mono text-[10px] text-zinc-400 sm:text-[11px]">{path}</span>
          </span>
        );
      })}
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex gap-2 sm:gap-3">
      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 text-indigo-300 sm:h-8 sm:w-8">
        <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </span>
      <div className="pt-1">
        <span className="thinking-shimmer text-sm font-medium">thinking....</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400 sm:rounded-3xl sm:p-5">
      <h2 className="mb-2 text-sm font-semibold text-white sm:text-base">Production browser coding agent</h2>
      <p className="leading-6">
        Configure OpenRouter, choose a tool-capable model, then ask the agent to create or inspect files. Tool calls are native
        OpenRouter function calls and file operations run inside browser IndexedDB storage.
      </p>
    </section>
  );
}

function safeParseArgs(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}
