import { encodeSseEvent, streamAgentTurn, validateAgentStreamRequest } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = async (event: Parameters<typeof encodeSseEvent>[0]) => {
        controller.enqueue(encoder.encode(encodeSseEvent(event)));
      };

      try {
        const body = await request.json();
        const validated = validateAgentStreamRequest(body);
        const origin = request.headers.get("origin") ?? request.headers.get("referer") ?? undefined;
        await streamAgentTurn(validated, emit, origin);
      } catch (error) {
        await emit({
          type: "error",
          message: error instanceof Error ? error.message : "Unknown agent streaming error.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
