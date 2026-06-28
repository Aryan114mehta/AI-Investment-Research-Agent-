import { NextRequest } from "next/server";
import { createAgentGraph } from "@/lib/agent/graph";

type StreamNodeState = Record<string, unknown>;
type StreamState = Record<string, StreamNodeState>;

export async function POST(req: NextRequest) {
  try {
    const { companyName } = await req.json();

    if (!companyName) {
      return new Response(JSON.stringify({ error: "Company name is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const app = createAgentGraph();
    
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    (async () => {
      try {
        const streamEvents = await app.stream({ companyName, status: "Starting..." });

        for await (const state of streamEvents as AsyncIterable<StreamState>) {
          const [nodeName, nodeState] = Object.entries(state)[0];
          
          await writer.write(
            encoder.encode(`data: ${JSON.stringify({ node: nodeName, ...nodeState })}\n\n`)
          );
        }
        
        await writer.write(encoder.encode(`event: close\ndata: {}\n\n`));
      } catch (error: unknown) {
        console.error("Agent error:", error);
        const message = error instanceof Error ? error.message : String(error);
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
