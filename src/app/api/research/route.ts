import { NextRequest } from "next/server";
import { createAgentGraph } from "@/lib/agent/graph";

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

        for await (const state of streamEvents) {
          const nodeName = Object.keys(state)[0];
          const nodeState = state[nodeName];
          
          await writer.write(
            encoder.encode(`data: ${JSON.stringify({ node: nodeName, ...nodeState })}\n\n`)
          );
        }
        
        await writer.write(encoder.encode(`event: close\ndata: {}\n\n`));
      } catch (error: any) {
        console.error("Agent error:", error);
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ error: error.message || String(error) })}\n\n`)
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

  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
