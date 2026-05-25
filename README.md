# Vibe Coder Agent

## Project Overview
- **Name**: Vibe Coder Agent
- **Goal**: Production-ready browser-based AI coding agent that uses OpenRouter native tool calling to create, overwrite, and read files stored in the user's browser.
- **Framework**: Next.js 16.2.6 App Router, React 19.2.4, TypeScript, Tailwind CSS 4, Radix UI primitives.

## Completed Features
- ReAct-style agent loop: model response -> native tool call -> browser tool execution -> tool observation -> continued model response.
- OpenRouter model provider integration with `/api/models` model discovery.
- Token-level SSE streaming through `/api/agent` using `ReadableStream` and fetch streaming.
- Native OpenRouter tool registration for exactly two tools: `file_write` and `file_read`.
- Browser-only file system implemented with IndexedDB; no API route reads or writes user files.
- Max iteration safeguard set to 1000 agent turns per user request.
- Settings dialog for OpenRouter API key and model selection.
- Dark, responsive, professional agent UI with Radix Dialog, Select, ScrollArea, and Tabs.
- Right-side generated file explorer with file preview, copy, delete, and clear actions.
- Tool activity chips shown inline when the LLM calls `file_write` or `file_read`.
- Shiny `thinking....` streaming indicator.

## Functional Entry URIs
- `/` - Main AI agent workspace.
- `/api/models` - `POST` route for fetching OpenRouter models. Body: `{ "apiKey": "..." }`.
- `/api/agent` - `POST` SSE route for one streaming agent turn. Body includes `apiKey`, `model`, `messages`, and `iteration`.

## Live URL
- Application live URL: https://zephyr-two-omega.vercel.app/

## Data Architecture
- **LLM messages**: Maintained in browser memory for the active session.
- **Settings**: Stored in browser `localStorage` under `vibe-coder-settings`.
- **Files**: Stored in browser IndexedDB database `vibe-coder-browser-fs`, object store `files`.
- **File paths**: Must be absolute paths beginning with `/home/user/`.
- **Server storage**: None for user files. Server route only proxies OpenRouter streaming and model discovery.

## User Guide
1. Open the live URL.
2. Click the settings button in the chat header.
3. Add an OpenRouter API key.
4. Click **Fetch available models** and select a tool-capable model.
5. Ask the agent to create or read files, for example: `Create /home/user/project/README.md with a production project overview`.
6. Watch streaming text and inline tool chips.
7. Review generated files in the file system panel.

## Deployment and Runtime
- **Runtime**: Next.js Node.js route handlers for streaming stability.
- **Dynamic routes**: `/api/agent` and `/api/models` export `runtime = "nodejs"` and `dynamic = "force-dynamic"`.
- **Timeout config**: No app-level timeout duration or forced termination settings were added.
- **Process manager**: PM2 and ecosystem config files are intentionally not used.

## Validation
- `npm run lint` passes.
- `npm run build` passes.
- Local production server responds with HTTP 200 on port 3000.
- Browser console check reported no console messages.

## Features Not Yet Implemented
- Additional model providers beyond OpenRouter.
- Project export/import as ZIP.
- Persistent conversation history across reloads.
- Syntax highlighting by language in the file preview.

## Recommended Next Steps
- Add provider adapters under `src/lib/provider/` for Anthropic, OpenAI, or local gateways.
- Add optional conversation persistence with user-controlled clearing.
- Add file tree grouping by directory for very large browser file systems.
- Add downloadable project archive generation in the browser.
