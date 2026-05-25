"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, KeyRound, Loader2, Settings, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Provider, ProviderModel } from "@/types/agent";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  apiKey: string;
  model: string;
  models: ProviderModel[];
  loading: boolean;
  error: string | null;
  provider: Provider;
  onSave: (settings: { apiKey: string; model: string; provider: Provider }) => void;
  onFetchModels: (apiKey?: string) => void;
}

const PROVIDERS: { id: Provider; label: string; keyPlaceholder: string; keyLink: string; keyLinkLabel: string }[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    keyPlaceholder: "sk-or-v1-...",
    keyLink: "https://openrouter.ai/keys",
    keyLinkLabel: "OpenRouter key page",
  },
  {
    id: "groq",
    label: "Groq",
    keyPlaceholder: "gsk_...",
    keyLink: "https://console.groq.com/keys",
    keyLinkLabel: "Groq API keys",
  },
];

export function SettingsDialog({
  apiKey,
  model,
  models,
  loading,
  error,
  provider,
  onSave,
  onFetchModels,
}: SettingsDialogProps) {
  const current = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];
  const [localKey, setLocalKey] = useState(apiKey);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = localKey.trim();
    if (trimmed.length < 8) return;
    debounceRef.current = setTimeout(() => {
      onFetchModels(trimmed);
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localKey, onFetchModels]);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition hover:bg-white/[0.07] hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:h-10 sm:w-10"
          aria-label="Open settings"
        >
          <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-h-[90dvh] w-full rounded-t-3xl border border-white/10 bg-[#1d1d1f] p-0 text-zinc-100 shadow-2xl shadow-black/50 focus:outline-none sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-none sm:w-[calc(100vw-2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          <div className="flex items-center justify-center border-b border-white/10 py-2 sm:hidden">
            <span className="h-1 w-10 rounded-full bg-zinc-600" />
          </div>
          <header className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:items-center sm:px-5 sm:py-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 sm:h-10 sm:w-10 sm:rounded-2xl">
                <KeyRound className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <div className="min-w-0">
                <Dialog.Title className="text-sm font-semibold sm:text-base">Provider settings</Dialog.Title>
                <Dialog.Description className="text-xs text-zinc-400 sm:text-sm">
                  Keys stay in this browser and are sent only to your local API route for live requests.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="shrink-0 rounded-xl p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-white sm:p-2" aria-label="Close settings">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </header>

          <form
            className="space-y-4 overflow-y-auto px-4 py-4 sm:space-y-5 sm:p-5"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              onSave({
                apiKey: localKey,
                model: String(form.get("model") ?? model ?? ""),
                provider: String(form.get("provider") ?? provider) as Provider,
              });
            }}
          >
            <label className="block space-y-1.5 sm:space-y-2">
              <span className="text-sm font-medium text-zinc-200">Provider</span>
              <select
                name="provider"
                defaultValue={provider}
                onChange={(e) => {
                  const nextProvider = e.target.value as Provider;
                  onSave({ apiKey: localKey, model: "", provider: nextProvider });
                  const trimmed = localKey.trim();
                  if (trimmed.length >= 8) {
                    onFetchModels(trimmed);
                  }
                }}
                className={cn(
                  "h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 text-sm text-white outline-none transition",
                  "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30",
                  "sm:h-12 sm:rounded-2xl sm:px-4",
                )}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#1d1d1f]">
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5 sm:space-y-2">
              <span className="text-sm font-medium text-zinc-200">{current.label} API key</span>
              <input
                name="apiKey"
                value={localKey}
                onChange={(e) => {
                  setLocalKey(e.target.value);
                  onSave({ apiKey: e.target.value, model, provider });
                }}
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder={current.keyPlaceholder}
                className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 sm:h-12 sm:rounded-2xl sm:px-4"
              />
            </label>

            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  onSave({ apiKey: localKey, model, provider });
                  onFetchModels(localKey);
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-medium text-zinc-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:rounded-2xl sm:px-4"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Fetch available models
              </button>
              <a
                href={current.keyLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-xl px-3.5 text-sm text-zinc-400 transition hover:text-white sm:h-11 sm:rounded-2xl sm:px-4"
              >
                {current.keyLinkLabel}
              </a>
            </div>

            {error ? <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200 sm:rounded-2xl sm:px-4 sm:py-3">{error}</p> : null}

            <label className="block space-y-1.5 sm:space-y-2">
              <span className="text-sm font-medium text-zinc-200">Model</span>
              <Select.Root name="model" defaultValue={model} value={model || undefined} onValueChange={(value) => onSave({ apiKey, model: value, provider })}>
                <Select.Trigger className="flex h-11 w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3.5 text-left text-sm text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 sm:h-12 sm:rounded-2xl sm:px-4">
                  <Select.Value placeholder="Fetch models and select one" />
                  <Select.Icon>
                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="z-[70] max-h-72 overflow-hidden rounded-2xl border border-white/10 bg-[#222225] text-zinc-100 shadow-2xl sm:max-h-80">
                    <Select.Viewport className="p-1.5 sm:p-2">
                      {models.map((item) => (
                        <Select.Item
                          key={item.id}
                          value={item.id}
                          className="relative cursor-pointer rounded-xl py-2 pl-8 pr-3 text-sm outline-none data-[highlighted]:bg-white/10 sm:pl-9"
                        >
                          <Select.ItemIndicator className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-300 sm:left-3">
                            <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Select.ItemIndicator>
                          <Select.ItemText>{item.name || item.id}</Select.ItemText>
                          <span className="mt-0.5 block truncate text-xs text-zinc-500">{item.id}</span>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </label>

            <footer className="flex justify-end gap-2 border-t border-white/10 pt-4 sm:gap-3 sm:pt-5">
              <Dialog.Close asChild>
                <button type="button" className="h-10 rounded-xl px-3.5 text-sm text-zinc-400 transition hover:text-white sm:h-11 sm:rounded-2xl sm:px-4">
                  Cancel
                </button>
              </Dialog.Close>
              <Dialog.Close asChild>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 sm:h-11 sm:rounded-2xl sm:px-5"
                >
                  Save settings
                </button>
              </Dialog.Close>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
