import type { DiagnosticAnswer, DiagnosticRecord } from "@app/shared";
import { api } from "@/lib/api";

export const diagnosticsApi = {
  list: () => api<{ items: DiagnosticRecord[] }>("/diagnostics"),
  create: (answers: DiagnosticAnswer[]) =>
    api<DiagnosticRecord>("/diagnostics", { method: "POST", body: JSON.stringify({ answers }) }),
  get: (id: string) => api<DiagnosticRecord>(`/diagnostics/${id}`),
};
