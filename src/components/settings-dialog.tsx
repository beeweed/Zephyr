"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, KeyRound, Loader2, Settings, X } from "lucide-react";
import type { OpenRouterModel } from "@/types/agent";

interface SettingsDialogProps {
  apiKey: string;
  model: string;
  models: OpenRouterModel[];
  loading: boolean;
  error: string | null;
  onSave: (settings: { apiKey: string; model: string }) => void;
  onFetchModels: (apiKey?: string) => void;
}

export function SettingsDialog({ apiKey, model, models, loading, error, onSave, onFetchModels }: SettingsDialogProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition hover:bg-white/[0.07] hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Open settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-[#1d1d1f] p-0 text-zinc-100 shadow-2xl shadow-black/50 focus:outline-none">
          <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <Dialog.Title className="text-base font-semibold">Provider settings</Dialog.Title>
                <Dialog.Description className="text-sm text-zinc-400">
                  OpenRouter key stays in this browser and is sent only to your local API route for live requests.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-xl p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white" aria-label="Close settings">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </header>

          <form
            className="space-y-5 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              onSave({
                apiKey: String(form.get("apiKey") ?? ""),
                model: String(form.get("model") ?? model ?? ""),
              });
            }}
          >
            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-200">OpenRouter API key</span>
              <input
                name="apiKey"
                defaultValue={apiKey}
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder="sk-or-v1-..."
                className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  const input = document.querySelector<HTMLInputElement>('input[name="apiKey"]');
                  const nextKey = input?.value ?? apiKey;
                  onSave({ apiKey: nextKey, model });
                  onFetchModels(nextKey);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-zinc-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Fetch available models
              </button>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm text-zinc-400 transition hover:text-white"
              >
                OpenRouter key page
              </a>
            </div>

            {error ? <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-200">Model</span>
              <Select.Root name="model" defaultValue={model} value={model || undefined} onValueChange={(value) => onSave({ apiKey, model: value })}>
                <Select.Trigger className="flex h-12 w-full items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 text-left text-sm text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30">
                  <Select.Value placeholder="Fetch models and select one" />
                  <Select.Icon>
                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="z-[70] max-h-80 overflow-hidden rounded-2xl border border-white/10 bg-[#222225] text-zinc-100 shadow-2xl">
                    <Select.Viewport className="p-2">
                      {models.map((item) => (
                        <Select.Item
                          key={item.id}
                          value={item.id}
                          className="relative cursor-pointer rounded-xl py-2 pl-9 pr-3 text-sm outline-none data-[highlighted]:bg-white/10"
                        >
                          <Select.ItemIndicator className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300">
                            <Check className="h-4 w-4" />
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

            <footer className="flex justify-end gap-3 border-t border-white/10 pt-5">
              <Dialog.Close asChild>
                <button type="button" className="h-11 rounded-2xl px-4 text-sm text-zinc-400 transition hover:text-white">
                  Cancel
                </button>
              </Dialog.Close>
              <Dialog.Close asChild>
                <button
                  type="submit"
                  className="h-11 rounded-2xl bg-indigo-500 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400"
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
