import { NextResponse } from "next/server";
import { CampaignRepository } from "../../../repository/campaign";
import { prisma } from "../../../lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shopId") || undefined;
    const campaignId = searchParams.get("campaignId") || undefined;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    const campaigns = await CampaignRepository.getCampaignsWithStats({
      shopId,
      campaignId,
      startDate,
      endDate,
    });

    // Query snapshots for 30-minute interval spend calculation
    let snapshotStart = new Date();
    let snapshotEnd = new Date();

    if (startDate && endDate) {
      snapshotStart = new Date(startDate);
      snapshotStart.setHours(0, 0, 0, 0);

      snapshotEnd = new Date(endDate);
      snapshotEnd.setHours(23, 59, 59, 999);
    } else {
      // Default to last 24 hours
      snapshotStart.setHours(snapshotStart.getHours() - 24);
    }

    const snapshots = await prisma.campaignSpendSnapshot.findMany({
      where: {
        campaignId: { in: campaigns.map((c) => c.id) },
        timestamp: {
          gte: snapshotStart,
          lte: snapshotEnd,
        },
      },
      orderBy: { timestamp: "asc" },
    });

    // Generate 48 time-buckets (30-minute intervals)
    const buckets: Date[] = [];
    const intervalMs = 30 * 60 * 1000;
    const now = new Date();

    if (startDate && endDate && startDate.toDateString() === endDate.toDateString()) {
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);
      for (let i = 1; i <= 48; i++) {
        buckets.push(new Date(startOfDay.getTime() + i * intervalMs));
      }
    } else {
      const nowTime = now.getTime();
      for (let i = 47; i >= 0; i--) {
        buckets.push(new Date(nowTime - i * intervalMs));
      }
    }

    // Helper to find cumulative spend at targetDate from snapshots
    const getCumulativeSpendAt = (targetDate: Date, campaignSnapshots: any[]) => {
      const targetMs = targetDate.getTime();
      let bestSnap = null;
      for (const s of campaignSnapshots) {
        const snapMs = new Date(s.timestamp).getTime();
        if (snapMs <= targetMs) {
          if (!bestSnap || snapMs > new Date(bestSnap.timestamp).getTime()) {
            bestSnap = s;
          }
        }
      }
      return bestSnap ? bestSnap.spend : 0;
    };

    // Map stats
    const list = campaigns.map((c) => {
      let spend = 0;
      let gmv = 0;
      let orders = 0;
      let impressions = 0;
      let clicks = 0;

      c.reports.forEach((r) => {
        spend += r.spend;
        gmv += r.gmv;
        orders += r.orders;
        impressions += r.impressions;
        clicks += r.clicks;
      });

      const roi = spend > 0 ? gmv / spend : 0;
      const ctr = impressions > 0 ? clicks / impressions : 0;
      const convRate = clicks > 0 ? orders / clicks : 0;

      const campaignSnapshots = snapshots.filter((s) => s.campaignId === c.id);

      // Compute 30-minute interval spend speed
      const campaignHistory = buckets.map((bucket, idx) => {
        const currentSpend = getCumulativeSpendAt(bucket, campaignSnapshots);
        let deltaSpend = 0;

        if (idx === 0) {
          const prevTime = new Date(bucket.getTime() - intervalMs);
          const previousSpend = getCumulativeSpendAt(prevTime, campaignSnapshots);
          const currDateStr = bucket.toISOString().split("T")[0];
          const prevDateStr = prevTime.toISOString().split("T")[0];

          if (currDateStr === prevDateStr) {
            deltaSpend = Math.max(0, currentSpend - previousSpend);
          } else {
            deltaSpend = currentSpend;
          }
        } else {
          const prevBucket = buckets[idx - 1];
          const previousSpend = getCumulativeSpendAt(prevBucket, campaignSnapshots);
          const currDateStr = bucket.toISOString().split("T")[0];
          const prevDateStr = prevBucket.toISOString().split("T")[0];

          if (currDateStr === prevDateStr) {
            deltaSpend = Math.max(0, currentSpend - previousSpend);
          } else {
            deltaSpend = currentSpend;
          }
        }

        return {
          date: bucket,
          spend: deltaSpend,
        };
      });

      return {
        id: c.id,
        campaignId: c.campaignId,
        name: c.name,
        status: c.status,
        objectiveType: c.objectiveType,
        budget: c.budget,
        budgetMode: c.budgetMode,
        shoppingAdsType: c.shoppingAdsType || "PRODUCT",
        advertiserName: c.advertiser.name,
        shopName: c.advertiser.shop.name,
        createdAt: c.createdAt,
        spend,
        gmv,
        roi,
        orders,
        impressions,
        clicks,
        ctr,
        convRate,
        reports: campaignHistory,
      };
    });

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

