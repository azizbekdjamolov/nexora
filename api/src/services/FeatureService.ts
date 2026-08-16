import type { Feature, FeatureStatus, Paginated } from "@app/shared";
import { prisma } from "../db";
import { badRequest, notFound } from "../errors";
import { eventBus, featureEvent } from "../events/bus";
import { NotificationService } from "./NotificationService";

export type ChangeSource = "website" | "bot" | "miniapp";

function mapFeature(i: {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: string;
  data: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Feature {
  let data: Record<string, unknown> | null = null;
  if (i.data) {
    try {
      data = JSON.parse(i.data) as Record<string, unknown>;
    } catch {
      data = null;
    }
  }
  return {
    id: i.id,
    userId: i.userId,
    title: i.title,
    description: i.description,
    status: (i.status as FeatureStatus) ?? "active",
    data,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

/**
 * Single source of truth for the generic topic-neutral business entity.
 * The website, Telegram bot and Mini App all call this service — no
 * business logic is duplicated on any client.
 */
export class FeatureService {
  static async list(
    userId: string,
    opts: { status?: FeatureStatus; page?: number; pageSize?: number }
  ): Promise<Paginated<Feature>> {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 50));
    const where = {
      userId,
      ...(opts.status ? { status: opts.status } : {}),
    };
    const [features, total] = await Promise.all([
      prisma.feature.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.feature.count({ where }),
    ]);
    return { items: features.map(mapFeature), total, page, pageSize };
  }

  static async get(userId: string, featureId: string): Promise<Feature> {
    const feature = await prisma.feature.findFirst({ where: { id: featureId, userId } });
    if (!feature) throw notFound("Feature not found.", "featureNotFound");
    return mapFeature(feature);
  }

  static async create(
    userId: string,
    input: { title: string; description?: string | null; status?: FeatureStatus; data?: Record<string, unknown> | null },
    source: ChangeSource = "website"
  ): Promise<Feature> {
    const title = input.title?.trim();
    if (!title || title.length < 1 || title.length > 200) {
      throw badRequest("Title is required (1–200 characters).");
    }
    const status = input.status && ["active", "archived"].includes(input.status) ? input.status : "active";

    const feature = await prisma.feature.create({
      data: {
        userId,
        title,
        description: input.description?.trim() || null,
        status,
        data: input.data ? JSON.stringify(input.data) : null,
      },
    });

    eventBus.publish(userId, featureEvent("created", feature.id));
    await NotificationService.notify(
      userId,
      "feature.created",
      "Feature created",
      feature.title,
      { featureId: feature.id },
      source
    );
    return mapFeature(feature);
  }

  static async update(
    userId: string,
    featureId: string,
    input: { title?: string; description?: string | null; status?: FeatureStatus; data?: Record<string, unknown> | null },
    source: ChangeSource = "website"
  ): Promise<Feature> {
    const existing = await prisma.feature.findFirst({ where: { id: featureId, userId } });
    if (!existing) throw notFound("Feature not found.", "featureNotFound");

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) throw badRequest("Title is required.");
      data.title = title;
    }
    if (input.description !== undefined) data.description = input.description?.trim() || null;
    if (input.status !== undefined) {
      if (!["active", "archived"].includes(input.status)) throw badRequest("Invalid status.");
      data.status = input.status;
    }
    if (input.data !== undefined) data.data = input.data ? JSON.stringify(input.data) : null;

    const feature = await prisma.feature.update({ where: { id: featureId }, data });
    eventBus.publish(userId, featureEvent("updated", feature.id));
    await NotificationService.notify(
      userId,
      "feature.updated",
      "Feature updated",
      feature.title,
      { featureId: feature.id },
      source
    );
    return mapFeature(feature);
  }

  static async remove(userId: string, featureId: string, source: ChangeSource = "website"): Promise<void> {
    const existing = await prisma.feature.findFirst({ where: { id: featureId, userId } });
    if (!existing) throw notFound("Feature not found.", "featureNotFound");
    await prisma.feature.delete({ where: { id: featureId } });
    eventBus.publish(userId, featureEvent("deleted", featureId));
    await NotificationService.notify(userId, "feature.deleted", "Feature deleted", existing.title, { featureId }, source);
  }
}