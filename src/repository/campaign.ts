import { prisma } from "../lib/db";
import { Campaign, CampaignReport } from "@prisma/client";

export interface CampaignFilter {
  shopId?: string;
  campaignId?: string;
  startDate?: Date;
  endDate?: Date;
}

export class CampaignRepository {
  static async upsertCampaign(data: {
    campaignId: string;
    name: string;
    status: string;
    objectiveType: string;
    budget: number;
    budgetMode: string;
    advertiserId: string;
    shoppingAdsType?: string;
    roasBid?: number;
  }): Promise<Campaign> {
    return prisma.campaign.upsert({
      where: { campaignId: data.campaignId },
      update: {
        name: data.name,
        status: data.status,
        objectiveType: data.objectiveType,
        budget: data.budget,
        budgetMode: data.budgetMode,
        advertiserId: data.advertiserId,
        shoppingAdsType: data.shoppingAdsType || "PRODUCT",
        roasBid: data.roasBid !== undefined ? data.roasBid : undefined,
      },
      create: {
        campaignId: data.campaignId,
        name: data.name,
        status: data.status,
        objectiveType: data.objectiveType,
        budget: data.budget,
        budgetMode: data.budgetMode,
        advertiserId: data.advertiserId,
        shoppingAdsType: data.shoppingAdsType || "PRODUCT",
        roasBid: data.roasBid !== undefined ? data.roasBid : 0.0,
      },
    });
  }

  static async upsertCampaignReport(data: {
    campaignId: string;
    date: Date;
    spend: number;
    gmv: number;
    roi: number;
    orders: number;
    impressions: number;
    clicks: number;
    ctr: number;
    conversionRate: number;
  }): Promise<CampaignReport> {
    const key = {
      campaignId: data.campaignId,
      date: data.date,
    };
    return prisma.campaignReport.upsert({
      where: { campaignId_date: key },
      update: {
        spend: data.spend,
        gmv: data.gmv,
        roi: data.roi,
        orders: data.orders,
        impressions: data.impressions,
        clicks: data.clicks,
        ctr: data.ctr,
        conversionRate: data.conversionRate,
      },
      create: {
        campaignId: data.campaignId,
        date: data.date,
        spend: data.spend,
        gmv: data.gmv,
        roi: data.roi,
        orders: data.orders,
        impressions: data.impressions,
        clicks: data.clicks,
        ctr: data.ctr,
        conversionRate: data.conversionRate,
      },
    });
  }

  static async getCampaignsWithStats(filters: CampaignFilter) {
    const whereClause: any = {
      objectiveType: {
        in: ["PRODUCT_SALES", "OUTFLOW_GMV_MAX"]
      },
      advertiser: {
        status: "ACTIVE"
      }
    };

    if (filters.campaignId) {
      whereClause.campaignId = filters.campaignId;
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

    return prisma.campaign.findMany({
      where: whereClause,
      select: {
        id: true,
        campaignId: true,
        name: true,
        status: true,
        objectiveType: true,
        budget: true,
        budgetMode: true,
        roasBid: true,
        shoppingAdsType: true,
        createdAt: true,
        advertiser: {
          select: {
            name: true,
            advertiserId: true,
            accessToken: true,
            shop: {
              select: {
                name: true,
              },
            },
          },
        },
        reports: {
          where: reportWhereClause,
          orderBy: { date: "asc" },
          select: {
            spend: true,
            gmv: true,
            roi: true,
            orders: true,
            impressions: true,
            clicks: true,
            date: true,
          },
        },
      },
    });
  }
}
