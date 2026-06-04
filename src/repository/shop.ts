import { prisma } from "../lib/db";
import { Shop, Advertiser } from "@prisma/client";

export class ShopRepository {
  static async findById(id: string): Promise<Shop | null> {
    return prisma.shop.findUnique({
      where: { id },
      include: {
        advertisers: true,
      },
    });
  }

  static async findByShopId(tiktokShopId: string): Promise<Shop | null> {
    return prisma.shop.findUnique({
      where: { tiktokShopId },
    });
  }

  static async createShop(data: { name: string; tiktokShopId: string }): Promise<Shop> {
    return prisma.shop.create({
      data: {
        name: data.name,
        tiktokShopId: data.tiktokShopId,
        status: "ACTIVE",
      },
    });
  }

  static async listShops(): Promise<Shop[]> {
    return prisma.shop.findMany({
      include: {
        advertisers: true,
      },
    });
  }

  static async findAdvertiserById(advertiserId: string): Promise<Advertiser | null> {
    return prisma.advertiser.findUnique({
      where: { advertiserId },
      include: { shop: true },
    });
  }

  static async upsertAdvertiser(data: {
    advertiserId: string;
    name: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
    shopId: string;
  }): Promise<Advertiser> {
    return prisma.advertiser.upsert({
      where: { advertiserId: data.advertiserId },
      update: {
        name: data.name,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        shopId: data.shopId,
      },
      create: {
        advertiserId: data.advertiserId,
        name: data.name,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        shopId: data.shopId,
      },
    });
  }

  static async listAdvertisersByShop(shopId: string): Promise<Advertiser[]> {
    return prisma.advertiser.findMany({
      where: { shopId },
    });
  }

  static async getAllAdvertisers(): Promise<Advertiser[]> {
    return prisma.advertiser.findMany({
      where: { status: "ACTIVE" },
      include: { shop: true },
    });
  }
}
