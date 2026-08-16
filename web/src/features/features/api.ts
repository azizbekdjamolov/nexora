import type { Feature, FeatureStatus, Paginated } from "@app/shared";
import { api } from "@/lib/api";

export const featuresApi = {
  list: (params?: { status?: FeatureStatus; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    const query = q.toString();
    return api<Paginated<Feature>>(`/features${query ? `?${query}` : ""}`);
  },
  get: (id: string) => api<{ feature: Feature }>(`/features/${id}`),
  create: (body: { title: string; description?: string | null }) =>
    api<{ feature: Feature }>("/features", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: { title?: string; description?: string | null; status?: FeatureStatus }) =>
    api<{ feature: Feature }>(`/features/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => api<{ ok: boolean }>(`/features/${id}`, { method: "DELETE" }),
};