"use client";

import * as ScrollArea from "@radix-ui/react-scroll-area";
import { Copy, FileCode2, Folder, Trash2 } from "lucide-react";
import type { BrowserFileRecord } from "@/types/agent";
import { cn, formatBytes } from "@/lib/utils";

interface FileExplorerProps {
  files: BrowserFileRecord[];
  selectedFile: BrowserFileRecord | null;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onClear: () => void;
  onDelete: (path: string) => void;
}

export function FileExplorer({ files, selectedFile, selectedPath, onSelect, onClear, onDelete }: FileExplorerProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-none border-white/10 bg-[#1b1b1c] md:m-3 md:ml-0 md:rounded-[28px] md:border">
      <header className="flex items-center justify-between border-b border-white/10 bg-[#222224]/90 px-4 py-3 md:px-5 md:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
            <Folder className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-white">Browser file system</h2>
            <p className="text-xs text-zinc-400">{files.length} file{files.length === 1 ? "" : "s"} in IndexedDB</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.07] hover:text-white"
        >
          Clear
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="min-h-0 border-b border-white/10 lg:border-b-0 lg:border-r">
          <ScrollArea.Root className="h-full">
            <ScrollArea.Viewport className="h-full w-full">
              <nav className="space-y-1 p-3" aria-label="Generated files">
                {files.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm leading-6 text-zinc-500">
                    Files created by native <span className="font-mono text-zinc-400">file_write</span> calls appear here.
                  </div>
                ) : null}
                {files.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => onSelect(file.path)}
                    className={cn(
                      "group flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition",
                      selectedPath === file.path ? "bg-indigo-500/15 text-white" : "text-zinc-300 hover:bg-white/[0.05]",
                    )}
                  >
                    <FileCode2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 group-hover:text-indigo-300" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs">{file.path}</span>
                      <span className="mt-1 block text-[11px] text-zinc-500">
                        {formatBytes(file.size)} · {new Date(file.updatedAt).toLocaleString()}
                      </span>
                    </span>
                  </button>
                ))}
              </nav>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="flex w-2.5 touch-none select-none p-0.5">
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/10" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </section>

        <section className="flex min-h-0 flex-col">
          {selectedFile ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div className="min-w-0">
                  <h3 className="truncate font-mono text-xs text-zinc-200">{selectedFile.path}</h3>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {formatBytes(selectedFile.size)} · Updated {new Date(selectedFile.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(selectedFile.content)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition hover:bg-white/[0.07] hover:text-white"
                    aria-label="Copy file content"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(selectedFile.path)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/10 text-red-200 transition hover:bg-red-500/20"
                    aria-label="Delete file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <ScrollArea.Root className="min-h-0 flex-1">
                <ScrollArea.Viewport className="h-full w-full">
                  <pre className="min-h-full overflow-x-auto p-4 text-xs leading-6 text-zinc-300">
                    <code>{selectedFile.content}</code>
                  </pre>
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar orientation="vertical" className="flex w-2.5 touch-none select-none p-0.5">
                  <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/10" />
                </ScrollArea.Scrollbar>
                <ScrollArea.Scrollbar orientation="horizontal" className="flex h-2.5 touch-none select-none p-0.5">
                  <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/10" />
                </ScrollArea.Scrollbar>
              </ScrollArea.Root>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-zinc-500">
              Select a generated file to preview its browser-stored contents.
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
