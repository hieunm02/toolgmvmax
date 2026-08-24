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

    // Get all campaign reports
    const reports = await prisma.campaignReport.findMany({
      where: whereClause,
      include: {
        campaign: true,
      },
    });

    // Aggregate widgets
    let totalSpend = 0;
    let totalGMV = 0;
    let totalOrders = 0;
    let totalImpressions = 0;
    let totalClicks = 0;

    reports.forEach((r) => {
      totalSpend += r.spend;
      totalGMV += r.gmv;
      totalOrders += r.orders;
      totalImpressions += r.impressions;
      totalClicks += r.clicks;
    });

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
        },
        chartData,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
