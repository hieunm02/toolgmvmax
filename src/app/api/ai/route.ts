import { NextResponse } from "next/server";
import { CampaignRepository } from "../../../repository/campaign";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shopId") || undefined;

    const campaigns = await CampaignRepository.getCampaignsWithStats({ shopId });
    const recommendations: Array<{
      id: string;
      campaignId: string;
      campaignName: string;
      action: "SCALE_BUDGET" | "REDUCE_BUDGET" | "REPLACE_CREATIVES" | "ADJUST_ROI_TARGET" | "KEEP_STABLE";
      priority: "HIGH" | "MEDIUM" | "LOW";
      reason: string;
      details: string;
    }> = [];

    campaigns.forEach((c) => {
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

      if (spend > 0) {
        if (roi >= 2.5 && spend >= c.budget * 0.8) {
          recommendations.push({
            id: `rec-${c.campaignId}-scale`,
            campaignId: c.campaignId,
            campaignName: c.name,
            action: "SCALE_BUDGET",
            priority: "HIGH",
            reason: `Excellent ROI (${roi.toFixed(2)}) detected.`,
            details: `We recommend increasing the daily budget by 20% to $${(c.budget * 1.2).toFixed(2)} to capture additional GMV conversion volume.`,
          });
        } else if (roi < 1.2 && spend > 50) {
          recommendations.push({
            id: `rec-${c.campaignId}-reduce`,
            campaignId: c.campaignId,
            campaignName: c.name,
            action: "REDUCE_BUDGET",
            priority: "HIGH",
            reason: `Suboptimal ROI (${roi.toFixed(2)}) below target.`,
            details: `We recommend reducing the daily budget by 30% to $${(c.budget * 0.7).toFixed(2)} or pausing to minimize unprofitable ad spend.`,
          });
        } else if (ctr < 0.015 && spend > 30) {
          recommendations.push({
            id: `rec-${c.campaignId}-creatives`,
            campaignId: c.campaignId,
            campaignName: c.name,
            action: "REPLACE_CREATIVES",
            priority: "MEDIUM",
            reason: `Low click-through rate (${(ctr * 100).toFixed(2)}%) indicates banner fatigue.`,
            details: `Upload 2-3 fresh video creatives focusing on Hook Hooks within the first 3 seconds of playtime.`,
          });
        } else if (convRate < 0.01 && clicks > 50) {
          recommendations.push({
            id: `rec-${c.campaignId}-roi-target`,
            campaignId: c.campaignId,
            campaignName: c.name,
            action: "ADJUST_ROI_TARGET",
            priority: "MEDIUM",
            reason: `High clicks (${clicks}) but low conversion rate (${(convRate * 100).toFixed(2)}%).`,
            details: `Adjust target ROI in GMV Max configurations downwards to broaden targeting pool or optimize product listing details.`,
          });
        } else {
          recommendations.push({
            id: `rec-${c.campaignId}-stable`,
            campaignId: c.campaignId,
            campaignName: c.name,
            action: "KEEP_STABLE",
            priority: "LOW",
            reason: `Campaign is performing inside target range.`,
            details: `Current metrics stable (ROI: ${roi.toFixed(2)}, Spend: $${spend.toFixed(2)}). Monitor daily performance updates.`,
          });
        }
      }
    });

    return NextResponse.json({ success: true, data: recommendations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
