import type { RealtimeEvent } from "@app/shared";
import { SESSION_COOKIE } from "@app/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "../services/AuthService";
import { eventBus } from "../events/bus";

/**
 * Server-Sent Events stream per authenticated user.
 * Clients reconnect automatically; a heartbeat keeps the connection alive.
 */
export function registerEventsRoute(app: FastifyInstance): void {
  app.get("/api/events", async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await AuthService.resolveSession(req.cookies?.[SESSION_COOKIE] ?? null);
    if (!user) {
      return reply.code(401).send({ success: false, error: { code: "unauthorized", message: "Please sign in to continue." } });
    }

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    reply.hijack();

    const send = (event: RealtimeEvent): void => {
      reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    };

    const unsubscribe = eventBus.subscribe(user.id, send);
    const heartbeat = setInterval(() => {
      reply.raw.write(": ping\n\n");
    }, 25000);

    req.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });
}