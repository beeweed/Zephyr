"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { FileExplorer } from "@/components/file-explorer";
import { SettingsDialog } from "@/components/settings-dialog";
import { useAgent } from "@/hooks/use-agent";
import { cn } from "@/lib/utils";

export function AgentWorkspace() {
  const agent = useAgent();
  const [tab, setTab] = useState<"chat" | "files">("chat");

  const settings = (
    <SettingsDialog
      providerKeys={agent.settings.providerKeys}
      model={agent.settings.model}
      models={agent.models}
      loading={agent.modelLoading}
      error={agent.modelError}
      provider={agent.settings.provider}
      onSave={agent.setSettings}
      onFetchModels={agent.fetchModels}
    />
  );

  return (
    <main className="h-dvh overflow-hidden bg-[#151515] text-zinc-100">
      <div className={cn(
        "relative flex h-full min-h-0 flex-col",
        "md:grid md:grid-cols-[minmax(320px,40%)_minmax(0,1fr)]",
        "lg:grid-cols-[minmax(360px,42%)_minmax(0,1fr)]",
        "xl:grid-cols-[minmax(420px,45%)_minmax(0,1fr)]",
        "2xl:grid-cols-[minmax(480px,50%)_minmax(0,1fr)]",
      )}>
        {/* Mobile nav */}
        <nav className="flex h-12 shrink-0 border-b border-white/10 bg-[#202022] md:hidden" aria-label="Workspace panels">
          <button
            type="button"
            onClick={() => setTab("chat")}
            className={cn(
              "flex-1 text-sm font-medium transition-colors",
              tab === "chat" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => setTab("files")}
            className={cn(
              "flex-1 text-sm font-medium transition-colors",
              tab === "files" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            Files
          </button>
        </nav>

        {/* Chat panel */}
        <div
          className={cn(
            "flex min-h-0 flex-col",
            // On mobile: absolute overlay so Monaco never gets display:none
            "absolute inset-0 top-12 md:static md:inset-auto",
            tab === "chat" ? "z-10 opacity-100 pointer-events-auto" : "z-0 opacity-0 pointer-events-none md:z-auto md:opacity-100 md:pointer-events-auto",
          )}
        >
          <ChatPanel
            messages={agent.messages}
            isRunning={agent.isRunning}
            isThinking={agent.isThinking}
            agentError={agent.agentError}
            model={agent.settings.model}
            provider={agent.settings.provider}
            onSend={agent.sendMessage}
            onStop={agent.stop}
            onClear={agent.clearConversation}
            settingsSlot={settings}
          />
        </div>

        {/* Files panel */}
        <div
          className={cn(
            "flex min-h-0 flex-col",
            "absolute inset-0 top-12 md:static md:inset-auto",
            tab === "files" ? "z-10 opacity-100 pointer-events-auto" : "z-0 opacity-0 pointer-events-none md:z-auto md:opacity-100 md:pointer-events-auto",
          )}
        >
          <FileExplorer
            files={agent.files}
            selectedFile={agent.selectedFile}
            selectedPath={agent.selectedPath}
            onSelect={agent.setSelectedPath}
            onClear={agent.clearFiles}
            onDelete={agent.deleteFile}
            onUpdate={agent.updateFile}
          />
        </div>
      </div>
    </main>
  );
}
