import type { SupportRequest, SupportRequestAdmin, SupportStatus } from "@app/shared";
import { prisma } from "../db";
import { badRequest } from "../errors";

const STATUSES: SupportStatus[] = ["new", "in_progress", "answered", "closed"];

interface SupportRow {
  id: string;
  message: string;
  status: string;
  adminReply: string | null;
  repliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function serialize(row: SupportRow): SupportRequest {
  return {
    id: row.id,
    message: row.message,
    status: row.status as SupportStatus,
    adminReply: row.adminReply,
    repliedAt: row.repliedAt ? row.repliedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const SupportService = {
  async create(userId: string, message: string): Promise<SupportRequest> {
    const clean = (message ?? "").trim();
    if (clean.length < 2 || clean.length > 2000) {
      throw badRequest("Message must be between 2 and 2000 characters.");
    }
    const row = await prisma.supportRequest.create({ data: { userId, message: clean } });
    return serialize(row);
  },

  async listForUser(userId: string, limit = 20): Promise<SupportRequest[]> {
    const rows = await prisma.supportRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(serialize);
  },

  async listAll(limit = 50): Promise<SupportRequestAdmin[]> {
    const rows = await prisma.supportRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        user: { select: { id: true, name: true, telegramUsername: true, telegramUserId: true, phone: true } },
      },
    });
    return rows.map((r) => ({ ...serialize(r), user: r.user }));
  },

  async getForUser(userId: string, id: string): Promise<SupportRequest | null> {
    const row = await prisma.supportRequest.findFirst({ where: { id, userId } });
    return row ? serialize(row) : null;
  },

  async updateStatus(id: string, status: SupportStatus): Promise<SupportRequest | null> {
    if (!STATUSES.includes(status)) throw badRequest("Invalid status.");
    const row = await prisma.supportRequest
      .update({ where: { id }, data: { status } })
      .catch(() => null);
    return row ? serialize(row) : null;
  },

  /** Stores the admin's reply and marks the request answered. */
  async reply(id: string, replyText: string): Promise<SupportRequest | null> {
    const clean = (replyText ?? "").trim();
    if (clean.length < 1 || clean.length > 2000) {
      throw badRequest("Reply must be between 1 and 2000 characters.");
    }
    const row = await prisma.supportRequest
      .update({
        where: { id },
        data: { adminReply: clean, status: "answered", repliedAt: new Date() },
      })
      .catch(() => null);
    return row ? serialize(row) : null;
  },

  /**
   * Bot-facing: new requests not yet announced to the admin, plus answered
   * requests whose reply has not been delivered to the user in Telegram yet.
   */
  async pending(): Promise<{
    newRequests: SupportRequestAdmin[];
    replies: { id: string; telegramUserId: string; adminReply: string; locale: string }[];
  }> {
    const [newRows, answeredRows] = await Promise.all([
      prisma.supportRequest.findMany({
        where: { status: "new", notifiedAt: null },
        orderBy: { createdAt: "asc" },
        take: 20,
        include: {
          user: { select: { id: true, name: true, telegramUsername: true, telegramUserId: true, phone: true } },
        },
      }),
      prisma.supportRequest.findMany({
        where: { status: "answered", repliedAt: { not: null } },
        orderBy: { repliedAt: "asc" },
        take: 20,
        include: { user: { select: { telegramUserId: true, locale: true } } },
      }),
    ]);

    return {
      newRequests: newRows.map((r) => ({ ...serialize(r), user: r.user })),
      replies: answeredRows
        .filter((r) => r.user.telegramUserId)
        .map((r) => ({
          id: r.id,
          telegramUserId: r.user.telegramUserId as string,
          adminReply: r.adminReply ?? "",
          locale: r.user.locale,
        })),
    };
  },

  /** Bot-facing: mark requests as announced to the admin / delivered to the user. */
  async ack(announcedIds: string[], deliveredIds: string[]): Promise<void> {
    if (announcedIds.length > 0) {
      await prisma.supportRequest
        .updateMany({ where: { id: { in: announcedIds }, status: "new" }, data: { notifiedAt: new Date() } })
        .catch(() => undefined);
    }
    if (deliveredIds.length > 0) {
      await prisma.supportRequest
        .updateMany({ where: { id: { in: deliveredIds } }, data: { status: "closed" } })
        .catch(() => undefined);
    }
  },
};
