"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { ChatPanel } from "@/components/chat-panel";
import { FileExplorer } from "@/components/file-explorer";
import { SettingsDialog } from "@/components/settings-dialog";
import { useAgent } from "@/hooks/use-agent";

export function AgentWorkspace() {
  const agent = useAgent();
  const settings = (
    <SettingsDialog
      apiKey={agent.settings.apiKey}
      model={agent.settings.model}
      models={agent.models}
      loading={agent.modelLoading}
      error={agent.modelError}
      onSave={agent.setSettings}
      onFetchModels={agent.fetchModels}
    />
  );

  return (
    <main className="h-dvh overflow-hidden bg-[#151515] text-zinc-100">
      <div className="hidden h-full min-h-0 grid-cols-[minmax(380px,42%)_minmax(0,1fr)] md:grid">
        <ChatPanel
          messages={agent.messages}
          isRunning={agent.isRunning}
          isThinking={agent.isThinking}
          agentError={agent.agentError}
          model={agent.settings.model}
          onSend={agent.sendMessage}
          onStop={agent.stop}
          onClear={agent.clearConversation}
          settingsSlot={settings}
        />
        <FileExplorer
          files={agent.files}
          selectedFile={agent.selectedFile}
          selectedPath={agent.selectedPath}
          onSelect={agent.setSelectedPath}
          onClear={agent.clearFiles}
          onDelete={agent.deleteFile}
        />
      </div>

      <Tabs.Root defaultValue="chat" className="flex h-full min-h-0 flex-col md:hidden">
        <Tabs.List className="grid h-12 shrink-0 grid-cols-2 border-b border-white/10 bg-[#202022] p-1" aria-label="Workspace panels">
          <Tabs.Trigger
            value="chat"
            className="rounded-xl text-sm font-medium text-zinc-400 data-[state=active]:bg-white/10 data-[state=active]:text-white"
          >
            Chat
          </Tabs.Trigger>
          <Tabs.Trigger
            value="files"
            className="rounded-xl text-sm font-medium text-zinc-400 data-[state=active]:bg-white/10 data-[state=active]:text-white"
          >
            Files
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="chat" className="min-h-0 flex-1 focus:outline-none">
          <ChatPanel
            messages={agent.messages}
            isRunning={agent.isRunning}
            isThinking={agent.isThinking}
            agentError={agent.agentError}
            model={agent.settings.model}
            onSend={agent.sendMessage}
            onStop={agent.stop}
            onClear={agent.clearConversation}
            settingsSlot={settings}
          />
        </Tabs.Content>
        <Tabs.Content value="files" className="min-h-0 flex-1 focus:outline-none">
          <FileExplorer
            files={agent.files}
            selectedFile={agent.selectedFile}
            selectedPath={agent.selectedPath}
            onSelect={agent.setSelectedPath}
            onClear={agent.clearFiles}
            onDelete={agent.deleteFile}
          />
        </Tabs.Content>
      </Tabs.Root>
    </main>
  );
}
