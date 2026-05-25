import { fetchOpenRouterModels } from "@/lib/provider/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { apiKey?: unknown };
    if (typeof body.apiKey !== "string" || body.apiKey.trim().length < 8) {
      return Response.json({ error: "A valid OpenRouter API key is required." }, { status: 400 });
    }

    const models = await fetchOpenRouterModels(body.apiKey.trim());
    const toolCapable = models.filter((model) => {
      const params = model.supported_parameters ?? [];
      return params.includes("tools") || params.includes("tool_choice") || params.length === 0;
    });

    return Response.json({ models: toolCapable.length > 0 ? toolCapable : models });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch OpenRouter models." },
      { status: 502 },
    );
  }
}
