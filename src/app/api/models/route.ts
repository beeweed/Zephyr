import { fetchOpenRouterModels } from "@/lib/provider/openrouter";
import { fetchGroqModels } from "@/lib/provider/groq";
import type { Provider } from "@/types/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GROQ_TOOL_CAPABLE = new Set([
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "qwen/qwen3-32b",
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { apiKey?: unknown; provider?: unknown };
    const provider = (String(body.provider ?? "openrouter")) as Provider;

    if (typeof body.apiKey !== "string" || body.apiKey.trim().length < 8) {
      return Response.json(
        { error: `A valid ${provider === "groq" ? "Groq" : "OpenRouter"} API key is required.` },
        { status: 400 },
      );
    }

    const apiKey = body.apiKey.trim();

    if (provider === "groq") {
      const models = await fetchGroqModels(apiKey);
      const toolCapable = models.filter((m) => GROQ_TOOL_CAPABLE.has(m.id));
      return Response.json({ models: toolCapable.length > 0 ? toolCapable : models });
    }

    const models = await fetchOpenRouterModels(apiKey);
    const toolCapable = models.filter((model) => {
      const params = model.supported_parameters ?? [];
      return params.includes("tools") || params.includes("tool_choice") || params.length === 0;
    });

    return Response.json({ models: toolCapable.length > 0 ? toolCapable : models });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch models." },
      { status: 502 },
    );
  }
}
