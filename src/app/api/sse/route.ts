import { eventEmitter, SSE_EVENTS } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  let closed = false;
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      const sendEvent = (event: string, data: unknown) => {
        if (closed) return;
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          // Controller is closed, ignore
        }
      };

      sendEvent("connected", { timestamp: Date.now() });

      const subscriptions = [
        eventEmitter.on(SSE_EVENTS.ORDER_CREATED, (data) => sendEvent(SSE_EVENTS.ORDER_CREATED, data)),
        eventEmitter.on(SSE_EVENTS.ORDER_UPDATED, (data) => sendEvent(SSE_EVENTS.ORDER_UPDATED, data)),
        eventEmitter.on(SSE_EVENTS.ORDER_CANCELLED, (data) => sendEvent(SSE_EVENTS.ORDER_CANCELLED, data)),
        eventEmitter.on(SSE_EVENTS.STOCK_UPDATED, (data) => sendEvent(SSE_EVENTS.STOCK_UPDATED, data)),
        eventEmitter.on(SSE_EVENTS.REGISTER_OPENED, (data) => sendEvent(SSE_EVENTS.REGISTER_OPENED, data)),
        eventEmitter.on(SSE_EVENTS.REGISTER_CLOSED, (data) => sendEvent(SSE_EVENTS.REGISTER_CLOSED, data)),
      ];

      const interval = setInterval(() => {
        if (closed) return;
        sendEvent("heartbeat", { timestamp: Date.now() });
      }, 30000);

      return () => {
        closed = true;
        clearInterval(interval);
        for (const sub of subscriptions) {
          sub.unsubscribe();
        }
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}