import { prisma } from "../lib/db";
import { Alert } from "@prisma/client";

export class AlertRepository {
  static async createAlert(data: {
    shopId: string;
    type: string;
    message: string;
    rule: string;
    triggerValue: number;
  }): Promise<Alert> {
    return prisma.alert.create({
      data: {
        shopId: data.shopId,
        type: data.type,
        message: data.message,
        rule: data.rule,
        triggerValue: data.triggerValue,
        status: "UNRESOLVED",
      },
    });
  }

  static async listUnresolvedAlertsByShop(shopId: string): Promise<Alert[]> {
    return prisma.alert.findMany({
      where: {
        shopId,
        status: "UNRESOLVED",
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  static async getAllAlerts(limit = 100): Promise<Alert[]> {
    return prisma.alert.findMany({
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        shop: true,
      },
    });
  }

  static async resolveAlert(id: string): Promise<Alert> {
    return prisma.alert.update({
      where: { id },
      data: {
        status: "RESOLVED",
      },
    });
  }
}
