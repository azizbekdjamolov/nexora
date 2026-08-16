import type { DiagnosticAnswer } from "@app/shared";
import type { FastifyInstance } from "fastify";
import { authenticate } from "./helpers";
import { DiagnosticService } from "../services/DiagnosticService";
import { notFound } from "../errors";

export function registerDiagnosticRoutes(app: FastifyInstance): void {
  app.post("/api/diagnostics", async (req, reply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const answers = (req.body as { answers?: DiagnosticAnswer[] })?.answers;
    const record = await DiagnosticService.create(user.id, answers ?? []);
    return { success: true, data: record };
  });

  app.get("/api/diagnostics", async (req, reply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const items = await DiagnosticService.list(user.id);
    return { success: true, data: { items } };
  });

  app.get("/api/diagnostics/:id", async (req, reply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const record = await DiagnosticService.get(user.id, id);
    if (!record) throw notFound("Diagnostic not found.");
    return { success: true, data: record };
  });
}
