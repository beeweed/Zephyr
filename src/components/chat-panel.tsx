"use client";

import * as ScrollArea from "@radix-ui/react-scroll-area";
import { Bot, Pause, RotateCcw, Send, Sparkles, User } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { AgentToolCall, UiMessage } from "@/types/agent";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  messages: UiMessage[];
  isRunning: boolean;
  isThinking: boolean;
  agentError: string | null;
  model: string;
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
  onSend,
  onStop,
  onClear,
  settingsSlot,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

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
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-none border-white/10 bg-[#1b1b1c] md:m-3 md:rounded-[28px] md:border">
      <header className="flex items-center justify-between border-b border-white/10 bg-[#222224]/90 px-4 py-3 backdrop-blur md:px-5 md:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-white">Vibe Coder</h1>
            <p className="truncate text-xs text-zinc-400">ReAct browser file agent {model ? `· ${model}` : "· configure model"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition hover:bg-white/[0.07] hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Clear conversation"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          {settingsSlot}
        </div>
      </header>

      <ScrollArea.Root className="min-h-0 flex-1">
        <ScrollArea.Viewport className="h-full w-full">
          <div className="space-y-5 px-4 py-5 md:px-5">
            {messages.length === 0 ? <EmptyState /> : null}
            {messages.map((message) => (
              <MessageRow key={message.id} message={message} />
            ))}
            {isThinking ? <ThinkingIndicator /> : null}
            {agentError ? <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{agentError}</p> : null}
            <div ref={bottomRef} />
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="flex w-2.5 touch-none select-none p-0.5">
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/10" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      <form onSubmit={handleSubmit} className="border-t border-white/10 bg-[#202022] p-3 md:p-4">
        <div className="flex items-end gap-2 rounded-3xl border border-white/10 bg-black/30 p-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20">
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
            placeholder="Ask the agent to create, read, or overwrite files in /home/user/..."
            className="max-h-36 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-5 text-zinc-100 outline-none placeholder:text-zinc-600"
          />
          {isRunning ? (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-700 text-white transition hover:bg-zinc-600"
              aria-label="Stop agent"
            >
              <Pause className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
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
      <article className="flex justify-end gap-3">
        <div className="max-w-[86%] rounded-2xl rounded-tr-md bg-indigo-500 px-4 py-3 text-sm leading-6 text-white shadow-lg shadow-indigo-500/10">
          {message.content}
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
          <User className="h-4 w-4" />
        </span>
      </article>
    );
  }

  return (
    <article className="flex gap-3">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 text-indigo-300">
        <Bot className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">Agent</span>
          {message.iteration ? (
            <span className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2 py-0.5 text-[10px] font-medium text-indigo-200">
              Iteration {message.iteration}/1000
            </span>
          ) : null}
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
    <div className="mt-3 flex flex-wrap gap-2">
      {toolCalls.map((call) => {
        const args = safeParseArgs(call.function.arguments);
        const path = typeof args.file_path === "string" ? args.file_path : "unknown path";
        const verb = call.function.name === "file_write" ? "create" : "read";
        return (
          <span
            key={call.id}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            <span className="font-medium text-zinc-100">{verb}:</span>
            <span className="truncate font-mono text-[11px] text-zinc-400">{path}</span>
          </span>
        );
      })}
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex gap-3">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 text-indigo-300">
        <Bot className="h-4 w-4" />
      </span>
      <div className="pt-1">
        <span className="thinking-shimmer text-sm font-medium">thinking....</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400">
      <h2 className="mb-2 text-base font-semibold text-white">Production browser coding agent</h2>
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
