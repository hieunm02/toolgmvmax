import { prisma } from "../lib/db";
import { Creative, CreativeReport } from "@prisma/client";

export interface CreativeFilter {
  shopId?: string;
  videoId?: string;
  startDate?: Date;
  endDate?: Date;
}

export class CreativeRepository {
  static async upsertCreative(data: {
    videoId: string;
    name: string;
    videoUrl?: string;
    advertiserId: string;
    authorUsername?: string | null;
    authorName?: string | null;
    channelType?: string | null;
  }): Promise<Creative> {
    const existing = await prisma.creative.findUnique({
      where: { videoId: data.videoId },
      select: { channelType: true },
    });

    const channelTypeToSet = existing?.channelType || data.channelType || "AFFILIATE";

    return prisma.creative.upsert({
      where: { videoId: data.videoId },
      update: {
        name: data.name,
        videoUrl: data.videoUrl,
        advertiserId: data.advertiserId,
        ...(data.authorUsername !== undefined ? { authorUsername: data.authorUsername } : {}),
        ...(data.authorName !== undefined ? { authorName: data.authorName } : {}),
        channelType: channelTypeToSet,
      },
      create: {
        videoId: data.videoId,
        name: data.name,
        videoUrl: data.videoUrl,
        advertiserId: data.advertiserId,
        authorUsername: data.authorUsername || null,
        authorName: data.authorName || null,
        channelType: channelTypeToSet,
      },
    });
  }

  static async upsertCreativeReport(data: {
    videoId: string;
    date: Date;
    spend: number;
    gmv: number;
    roi: number;
    orders: number;
    impressions: number;
    clicks: number;
    ctr: number;
  }): Promise<CreativeReport> {
    return prisma.creativeReport.upsert({
      where: {
        videoId_date: {
          videoId: data.videoId,
          date: data.date,
        },
      },
      update: {
        spend: data.spend,
        gmv: data.gmv,
        roi: data.roi,
        orders: data.orders,
        impressions: data.impressions,
        clicks: data.clicks,
        ctr: data.ctr,
      },
      create: {
        videoId: data.videoId,
        date: data.date,
        spend: data.spend,
        gmv: data.gmv,
        roi: data.roi,
        orders: data.orders,
        impressions: data.impressions,
        clicks: data.clicks,
        ctr: data.ctr,
      },
    });
  }

  static async getCreativesWithStats(filters: CreativeFilter) {
    const whereClause: any = {
      advertiser: {
        status: "ACTIVE"
      }
    };
    if (filters.videoId) {
      whereClause.videoId = filters.videoId;
    }
    if (filters.shopId) {
      whereClause.advertiser.shopId = filters.shopId;
    }

    const reportWhereClause: any = {};
    if (filters.startDate && filters.endDate) {
      reportWhereClause.date = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    }

    return prisma.creative.findMany({
      where: whereClause,
      select: {
        id: true,
        videoId: true,
        name: true,
        videoUrl: true,
        authorUsername: true,
        authorName: true,
        channelType: true,
        advertiser: {
          select: {
            name: true,
            shop: {
              select: {
                name: true,
              },
            },
          },
        },
        reports: {
          where: reportWhereClause,
          select: {
            spend: true,
            gmv: true,
            roi: true,
            orders: true,
            impressions: true,
            clicks: true,
            ctr: true,
          }
        },
      },
    });
  }
}
