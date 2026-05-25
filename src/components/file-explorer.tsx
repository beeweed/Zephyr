"use client";

import * as ScrollArea from "@radix-ui/react-scroll-area";
import dynamic from "next/dynamic";
import { ChevronRight, Copy, FileCode2, Folder, FolderOpen, GripVertical, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BrowserFileRecord } from "@/types/agent";
import { cn, formatBytes } from "@/lib/utils";

const Editor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-zinc-500">Loading editor...</div>
  ),
});

interface FileExplorerProps {
  files: BrowserFileRecord[];
  selectedFile: BrowserFileRecord | null;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onClear: () => void;
  onDelete: (path: string) => void;
  onUpdate: (path: string, content: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: TreeNode[];
  file?: BrowserFileRecord;
}

function buildTree(files: BrowserFileRecord[]): TreeNode[] {
  const root: TreeNode[] = [];
  const map = new Map<string, TreeNode[]>();

  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let current = root;
    let accumulated = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulated += "/" + part;
      const isLast = i === parts.length - 1;

      if (isLast) {
        current.push({ name: part, path: accumulated, type: "file", file });
      } else {
        let folder = current.find((n) => n.name === part && n.type === "folder");
        if (!folder) {
          folder = { name: part, path: accumulated, type: "folder", children: [] };
          current.push(folder);
        }
        current = folder.children!;
      }
    }
  }

  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) sortNodes(node.children);
    }
  }
  sortNodes(root);

  return root;
}

function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    md: "markdown",
    css: "css",
    html: "html",
    svg: "xml",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    sh: "shell",
    bash: "shell",
    txt: "plaintext",
    sql: "sql",
    graphql: "graphql",
    gql: "graphql",
  };
  return map[ext] ?? "plaintext";
}

function FileTreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
  defaultExpanded,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isFolder = node.type === "folder";

  if (isFolder) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "group flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition",
            "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200",
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <ChevronRight
            className={cn("h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform", expanded && "rotate-90")}
          />
          {expanded ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-amber-400" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-amber-400" />
          )}
          <span className="truncate">{node.name}</span>
          <span className="ml-auto text-[10px] text-zinc-600">{node.children?.length ?? 0}</span>
        </button>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                defaultExpanded={false}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(node.path)}
      className={cn(
        "group flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs transition",
        selectedPath === node.path
          ? "bg-indigo-500/15 text-indigo-200"
          : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200",
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <FileCode2 className="h-4 w-4 shrink-0 text-zinc-500 group-hover:text-indigo-300" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileExplorer({ files, selectedFile, selectedPath, onSelect, onClear, onDelete, onUpdate }: FileExplorerProps) {
  const tree = useMemo(() => buildTree(files), [files]);
  const [editorContent, setEditorContent] = useState<string | null>(null);

  const handleEditorMount = useCallback((editor: { getValue: () => string }) => {
    setEditorContent(editor.getValue());
  }, []);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) setEditorContent(value);
  }, []);

  const handleSave = useCallback(() => {
    if (selectedFile && editorContent !== null && editorContent !== selectedFile.content) {
      onUpdate(selectedFile.path, editorContent);
    }
  }, [selectedFile, editorContent, onUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave],
  );

  const hasUnsavedChanges = selectedFile && editorContent !== null && editorContent !== selectedFile.content;

  const sidebarRef = useRef<HTMLDivElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const startX = 0;

    function onMouseMove(e: MouseEvent) {
      if (!sidebarRef.current) return;
      const parent = sidebarRef.current.parentElement;
      if (!parent) return;
      const parentRect = parent.getBoundingClientRect();
      const newWidth = Math.max(200, Math.min(500, e.clientX - parentRect.left));
      setSidebarWidth(newWidth);
    }

    function onMouseUp() {
      setIsDragging(false);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging]);

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-none border-white/10 bg-[#1b1b1c] sm:m-2 sm:ml-0 sm:rounded-2xl sm:border md:m-3 md:ml-0 md:rounded-[28px]">
      <header className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#222224]/90 px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 sm:h-10 sm:w-10 sm:rounded-2xl">
            <Folder className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-white">Browser file system</h2>
            <p className="text-xs text-zinc-400">{files.length} file{files.length === 1 ? "" : "s"} in IndexedDB</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.07] hover:text-white sm:px-3 sm:py-2"
        >
          Clear
        </button>
      </header>

      <div className={cn("flex min-h-0 flex-1", isDragging && "select-none")}>
        <section
          ref={sidebarRef}
          className="flex min-h-0 flex-col border-b border-white/10 md:border-b-0 md:border-r"
          style={{ width: sidebarWidth, minWidth: 200, maxWidth: 500 }}
        >
          <ScrollArea.Root className="h-full">
            <ScrollArea.Viewport className="h-full w-full">
              <nav className="p-1.5 sm:p-2" aria-label="Generated files">
                {tree.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-zinc-500 sm:p-5">
                    Files created by native <span className="font-mono text-zinc-400">file_write</span> calls appear here.
                  </div>
                ) : (
                  tree.map((node) => (
                    <FileTreeNode
                      key={node.path}
                      node={node}
                      depth={0}
                      selectedPath={selectedPath}
                      onSelect={onSelect}
                      defaultExpanded={true}
                    />
                  ))
                )}
              </nav>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="flex w-1.5 touch-none select-none p-0.5 sm:w-2.5">
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/10" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </section>

        <div
          className={cn(
            "flex w-1.5 shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-indigo-400/30 active:bg-indigo-400/50",
            isDragging && "bg-indigo-400/40",
          )}
          onMouseDown={handleMouseDown}
        >
          <GripVertical className="h-3 w-3 text-zinc-500" />
        </div>

        <section className="flex min-h-0 flex-1 flex-col" onKeyDown={handleKeyDown}>
          {selectedFile ? (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
                <div className="min-w-0">
                  <h3 className="truncate font-mono text-xs text-zinc-200">{selectedFile.path}</h3>
                  <p className="mt-0.5 text-[11px] text-zinc-500 sm:mt-1">
                    {formatBytes(selectedFile.size)} · Updated {new Date(selectedFile.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                  {hasUnsavedChanges && (
                    <button
                      type="button"
                      onClick={handleSave}
                      className="inline-flex h-7 items-center gap-1 rounded-lg bg-indigo-500/20 px-2.5 text-[11px] font-medium text-indigo-200 transition hover:bg-indigo-500/30 sm:h-8 sm:px-3 sm:text-xs"
                    >
                      Save
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(selectedFile.content)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-300 transition hover:bg-white/[0.07] hover:text-white sm:h-8 sm:w-8 sm:rounded-xl"
                    aria-label="Copy file content"
                  >
                    <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(selectedFile.path)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-400/20 bg-red-500/10 text-red-200 transition hover:bg-red-500/20 sm:h-8 sm:w-8 sm:rounded-xl"
                    aria-label="Delete file"
                  >
                    <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <Editor
                  key={selectedFile.path}
                  defaultLanguage={detectLanguage(selectedFile.path)}
                  defaultValue={selectedFile.content}
                  theme="vs-dark"
                  onChange={handleEditorChange}
                  onMount={handleEditorMount}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: "off",
                    padding: { top: 12, bottom: 12 },
                    renderWhitespace: "selection",
                    bracketPairColorization: { enabled: true },
                    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-zinc-500 sm:p-6">
              {files.length > 0
                ? "Select a file from the tree to start editing."
                : "No files yet. Ask the agent to create one."}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
