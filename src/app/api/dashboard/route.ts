import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shopId") || undefined;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Build filter
    const whereClause: any = {
      campaign: {
        objectiveType: {
          in: ["PRODUCT_SALES", "OUTFLOW_GMV_MAX"]
        },
        advertiser: {
          status: "ACTIVE"
        }
      }
    };
    if (shopId) {
      whereClause.campaign.advertiser.shopId = shopId;
    }

    // Date filter for reports
    if (startDateParam && endDateParam) {
      const s = new Date(startDateParam);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endDateParam);
      e.setHours(23, 59, 59, 999);
      whereClause.date = {
        gte: s,
        lte: e,
      };
    } else if (startDateParam) {
      const s = new Date(startDateParam);
      s.setHours(0, 0, 0, 0);
      whereClause.date = { gte: s };
    } else if (endDateParam) {
      const e = new Date(endDateParam);
      e.setHours(23, 59, 59, 999);
      whereClause.date = { lte: e };
    }

    const reports = await prisma.campaignReport.findMany({
      where: whereClause,
      select: {
        date: true,
        spend: true,
        gmv: true,
        orders: true,
        impressions: true,
        clicks: true,
        campaign: {
          select: {
            shoppingAdsType: true,
          },
        },
      },
    });

    // Query creative reports for Video In-house vs Video Affiliate breakdown
    const creativeWhere: any = {
      creative: {
        advertiser: {
          status: "ACTIVE",
          ...(shopId ? { shopId } : {}),
        },
      },
    };
    if (whereClause.date) {
      creativeWhere.date = whereClause.date;
    }

    const creativeReports = await prisma.creativeReport.findMany({
      where: creativeWhere,
      select: {
        spend: true,
        gmv: true,
        orders: true,
        creative: {
          select: {
            channelType: true,
          },
        },
      },
    });

    // Aggregate widgets & 4 Sources Breakdown
    let totalSpend = 0;
    let totalGMV = 0;
    let totalOrders = 0;
    let totalImpressions = 0;
    let totalClicks = 0;

    let liveSpend = 0;
    let liveGmv = 0;
    let liveOrders = 0;

    let productCampSpend = 0;
    let productCampGmv = 0;
    let productCampOrders = 0;

    reports.forEach((r: any) => {
      totalSpend += r.spend;
      totalGMV += r.gmv;
      totalOrders += r.orders;
      totalImpressions += r.impressions;
      totalClicks += r.clicks;

      if (r.campaign?.shoppingAdsType === "LIVE") {
        liveSpend += r.spend;
        liveGmv += r.gmv;
        liveOrders += r.orders;
      } else {
        productCampSpend += r.spend;
        productCampGmv += r.gmv;
        productCampOrders += r.orders;
      }
    });

    // In-house Video vs Affiliate Video
    let inhouseSpend = 0;
    let inhouseGmv = 0;
    let inhouseOrders = 0;

    let affiliateSpend = 0;
    let affiliateGmv = 0;
    let affiliateOrders = 0;

    creativeReports.forEach((cr: any) => {
      if (cr.creative?.channelType === "INHOUSE") {
        inhouseSpend += cr.spend;
        inhouseGmv += cr.gmv;
        inhouseOrders += cr.orders;
      } else {
        affiliateSpend += cr.spend;
        affiliateGmv += cr.gmv;
        affiliateOrders += cr.orders;
      }
    });

    const totalVideoSpend = inhouseSpend + affiliateSpend;
    const totalVideoGmv = inhouseGmv + affiliateGmv;
    const totalVideoOrders = inhouseOrders + affiliateOrders;

    // Product Card Ads (Thẻ sản phẩm / Shopping Showcase)
    const cardSpend = Math.max(0, productCampSpend - totalVideoSpend);
    const cardGmv = Math.max(0, productCampGmv - totalVideoGmv);
    const cardOrders = Math.max(0, productCampOrders - totalVideoOrders);

    const sources = {
      live: {
        spend: liveSpend,
        gmv: liveGmv,
        orders: liveOrders,
        roi: liveSpend > 0 ? liveGmv / liveSpend : 0,
      },
      inhouse: {
        spend: inhouseSpend,
        gmv: inhouseGmv,
        orders: inhouseOrders,
        roi: inhouseSpend > 0 ? inhouseGmv / inhouseSpend : 0,
      },
      affiliate: {
        spend: affiliateSpend,
        gmv: affiliateGmv,
        orders: affiliateOrders,
        roi: affiliateSpend > 0 ? affiliateGmv / affiliateSpend : 0,
      },
      productCard: {
        spend: cardSpend,
        gmv: cardGmv,
        orders: cardOrders,
        roi: cardSpend > 0 ? cardGmv / cardSpend : 0,
      },
    };

    const averageROI = totalSpend > 0 ? totalGMV / totalSpend : 0;
    const averageCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

    // Daily chart data aggregation
    const chartMap = new Map<string, { date: string; gmv: number; spend: number }>();
    reports.forEach((r) => {
      const dateStr = r.date.toISOString().split("T")[0];
      const existing = chartMap.get(dateStr) || { date: dateStr, gmv: 0, spend: 0 };
      existing.gmv += r.gmv;
      existing.spend += r.spend;
      chartMap.set(dateStr, existing);
    });

    const chartData = Array.from(chartMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      data: {
        widgets: {
          totalSpend,
          totalGMV,
          totalOrders,
          averageROI,
          averageCTR,
          sources,
        },
        chartData,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
