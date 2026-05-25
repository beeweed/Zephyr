"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Loader2, Search, Settings, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Provider, ProviderModel } from "@/types/agent";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  providerKeys: Record<Provider, string>;
  model: string;
  models: ProviderModel[];
  loading: boolean;
  error: string | null;
  provider: Provider;
  onSave: (settings: { providerKeys: Record<Provider, string>; model: string; provider: Provider }) => void;
  onFetchModels: (apiKey: string, provider: Provider) => void;
}

const PROVIDER_META: { id: Provider; label: string; placeholder: string; keyLink: string }[] = [
  { id: "openrouter", label: "OpenRouter", placeholder: "sk-or-v1-...", keyLink: "https://openrouter.ai/keys" },
  { id: "groq", label: "Groq", placeholder: "gsk_...", keyLink: "https://console.groq.com/keys" },
  { id: "nvidia", label: "Nvidia NIM", placeholder: "nvapi-...", keyLink: "https://build.nvidia.com/explore/discover" },
];

function ProviderKeyInput({
  meta,
  value,
  onChange,
}: {
  meta: (typeof PROVIDER_META)[number];
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <label className="block space-y-1 sm:space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-200">{meta.label}</span>
        <a
          href={meta.keyLink}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-zinc-500 transition hover:text-zinc-300"
        >
          get key
        </a>
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="password"
        autoComplete="off"
        spellCheck={false}
        placeholder={meta.placeholder}
        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 sm:h-11 sm:rounded-2xl sm:px-4"
      />
    </label>
  );
}

export function SettingsDialog({
  providerKeys,
  model,
  models,
  loading,
  error,
  provider,
  onSave,
  onFetchModels,
}: SettingsDialogProps) {
  const [localKeys, setLocalKeys] = useState<Record<Provider, string>>(providerKeys);
  const [activeProvider, setActiveProvider] = useState<Provider>(provider);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setLocalKeys(providerKeys);
  }, [providerKeys]);

  const availableProviders = PROVIDER_META.filter((m) => (localKeys[m.id] ?? "").trim().length > 0);

  const filteredModels = useMemo(
    () =>
      searchQuery.trim()
        ? models.filter((m) => m.id.toLowerCase().includes(searchQuery.toLowerCase()))
        : models,
    [models, searchQuery],
  );

  function handleProviderKeyChange(id: Provider, val: string) {
    const next = { ...localKeys, [id]: val };
    setLocalKeys(next);
  }

  function handleSelectProvider(p: Provider) {
    setActiveProvider(p);
    const key = localKeys[p] ?? "";
    if (key.trim().length >= 8) {
      onFetchModels(key.trim(), p);
    }
  }

  function handleSave() {
    onSave({ providerKeys: localKeys, model, provider: activeProvider });
  }

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
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <div className="min-w-0">
                <Dialog.Title className="text-sm font-semibold sm:text-base">Provider settings</Dialog.Title>
                <Dialog.Description className="text-xs text-zinc-400 sm:text-sm">
                  Keys stay in this browser, sent only to your local API route.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                className="shrink-0 rounded-xl p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-white sm:p-2"
                aria-label="Close settings"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </header>

          <div className="space-y-4 overflow-y-auto px-4 py-4 sm:space-y-5 sm:p-5">
            <div className="space-y-3 sm:space-y-4">
              <span className="text-sm font-medium text-zinc-200">API keys</span>
              {PROVIDER_META.map((meta) => (
                <ProviderKeyInput
                  key={meta.id}
                  meta={meta}
                  value={localKeys[meta.id] ?? ""}
                  onChange={(val) => handleProviderKeyChange(meta.id, val)}
                />
              ))}
            </div>

            <div className="space-y-3 sm:space-y-4">
              <span className="text-sm font-medium text-zinc-200">Models</span>

              {availableProviders.length === 0 ? (
                <p className="text-sm text-zinc-500">Add at least one API key above to fetch models.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {availableProviders.map((m) => {
                    const isActive = m.id === activeProvider;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={loading && isActive}
                        onClick={() => handleSelectProvider(m.id)}
                        className={cn(
                          "inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition",
                          isActive
                            ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-200"
                            : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white",
                        )}
                      >
                        {loading && isActive ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search models..."
                  spellCheck={false}
                  className="h-10 w-full rounded-xl border border-white/10 bg-black/30 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 sm:h-11 sm:rounded-2xl sm:pl-10 sm:pr-4"
                />
              </div>

              {error ? (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200 sm:rounded-2xl sm:px-4 sm:py-3">
                  {error}
                </p>
              ) : null}

              <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-black/20 sm:max-h-56 sm:rounded-2xl">
                {filteredModels.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-zinc-500">
                    {searchQuery ? "No models match your search." : "Click a provider above to fetch models."}
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {filteredModels.map((item) => {
                      const isSelected = item.id === model;
                      return (
                        <button
                          key={`${item.provider}-${item.id}`}
                          type="button"
                          onClick={() => onSave({ providerKeys: localKeys, model: item.id, provider: activeProvider })}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition sm:px-4 sm:py-3",
                            isSelected ? "bg-indigo-500/10" : "hover:bg-white/[0.03]",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition",
                              isSelected
                                ? "border-indigo-400 bg-indigo-500 text-white"
                                : "border-zinc-600",
                            )}
                          >
                            {isSelected ? <Check className="h-2.5 w-2.5" /> : null}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium text-zinc-100">{item.name || item.id}</span>
                              <span className="shrink-0 rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300">
                                {item.provider}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-zinc-500">{item.id}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <footer className="flex justify-end gap-2 border-t border-white/10 pt-4 sm:gap-3 sm:pt-5">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="h-10 rounded-xl px-3.5 text-sm text-zinc-400 transition hover:text-white sm:h-11 sm:rounded-2xl sm:px-4"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <Dialog.Close asChild>
                <button
                  type="button"
                  onClick={handleSave}
                  className="h-10 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 sm:h-11 sm:rounded-2xl sm:px-5"
                >
                  Save settings
                </button>
              </Dialog.Close>
            </footer>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
